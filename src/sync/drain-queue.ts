import type { ColombiaDenunciaDB } from "@/storage/db";
import { getDb } from "@/storage/db";
import type { SyncQueueItem, SyncQueuePayload } from "@/storage/sync-queue";
import {
  applySyncFailure,
  getDenunciaRecord,
  listDueQueueItems,
  markDenunciaEnviada,
} from "@/storage/local-denuncia-store";
import { nextProximaAt } from "./backoff";

export type FotoAdjunto = { bytes: ArrayBuffer; mime: string };

export type SyncPostResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      errorCodes?: string[];
      message?: string;
    };

export type DrainDeps = {
  db?: ColombiaDenunciaDB;
  now?: () => number;
  isOnline: () => boolean;
  getTurnstileToken: () => Promise<string | null>;
  resetTurnstile?: () => void;
  postSync: (input: {
    token: string;
    payload: SyncQueuePayload;
    foto?: FotoAdjunto;
  }) => Promise<SyncPostResult>;
};

export async function postSyncDenuncia(input: {
  token: string;
  payload: SyncQueuePayload;
  foto?: FotoAdjunto;
}): Promise<SyncPostResult> {
  const form = new FormData();
  form.set("turnstileToken", input.token);
  form.set("payload", JSON.stringify(input.payload));
  if (input.foto) {
    form.set(
      "foto",
      new Blob([input.foto.bytes], { type: input.foto.mime }),
      "evidencia.webp",
    );
  }
  try {
    const response = await fetch("/api/sync/denuncia", {
      method: "POST",
      body: form,
    });
    const body = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      errorCodes?: string[];
      message?: string;
    };
    if (response.ok && body.ok) {
      return { ok: true };
    }
    return {
      ok: false,
      error: body.error ?? "sync_failed",
      errorCodes: body.errorCodes,
      message: body.message,
    };
  } catch (error) {
    return {
      ok: false,
      error: "network_error",
      message:
        error instanceof Error
          ? error.message
          : "Error de red al conectar con el servidor",
    };
  }
}

export async function drainSyncQueue(deps: DrainDeps): Promise<void> {
  if (!deps.isOnline()) {
    return;
  }
  const db = deps.db ?? getDb();
  const now = deps.now ?? Date.now;
  const due = await listDueQueueItems(now(), db);

  for (const item of due) {
    await drainOne(item, { ...deps, db, now });
  }
}

async function drainOne(
  item: SyncQueueItem,
  deps: DrainDeps & { db: ColombiaDenunciaDB; now: () => number },
): Promise<void> {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("colombiadenuncia:syncing", {
        detail: { denunciaId: item.denunciaId },
      }),
    );
  }

  const token = await deps.getTurnstileToken();
  if (!token) {
    await failItem(
      item,
      deps,
      "turnstile_missing",
      undefined,
      "No se pudo obtener el token de verificación Turnstile.",
    );
    return;
  }

  const record = await getDenunciaRecord(item.denunciaId, deps.db);
  const foto =
    record?.fotoBytes && record.fotoBytes.byteLength > 0
      ? { bytes: record.fotoBytes, mime: record.fotoMime ?? "image/webp" }
      : undefined;

  const result = await deps.postSync({
    token,
    payload: item.payload,
    foto,
  });

  // Turnstile token is single-use; reset after each post
  deps.resetTurnstile?.();

  if (result.ok) {
    await markDenunciaEnviada(item.denunciaId, deps.db);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("colombiadenuncia:synced", {
          detail: { denunciaId: item.denunciaId },
        }),
      );
    }
    return;
  }

  await failItem(
    item,
    deps,
    result.error,
    result.errorCodes,
    result.message,
  );
}

async function failItem(
  item: SyncQueueItem,
  deps: DrainDeps & { db: ColombiaDenunciaDB; now: () => number },
  error = "sync_failed",
  errorCodes?: string[],
  message?: string,
): Promise<void> {
  const intentos = item.intentos + 1;
  const proxima_at = nextProximaAt(intentos, deps.now());
  await applySyncFailure(
    item.denunciaId,
    {
      intentos,
      proxima_at,
      lastError: error,
      lastErrorCode: errorCodes?.[0],
      lastErrorDetail: message,
    },
    deps.db,
  );
  deps.resetTurnstile?.();
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("colombiadenuncia:sync-error", {
        detail: {
          denunciaId: item.denunciaId,
          error,
          errorCodes,
          message,
          intentos,
        },
      }),
    );
  }
}
