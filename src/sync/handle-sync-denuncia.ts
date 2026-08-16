import type { SyncQueuePayload } from "@/storage/sync-queue";
import { publishDenuncia, type PublishStorage } from "./publish-denuncia";
import {
  isTimeoutOrDuplicate,
  verifyTurnstileToken,
  type SiteverifyResult,
} from "./verify-turnstile";

export type SyncHandlerDeps = {
  turnstileSecret: string;
  verify: typeof verifyTurnstileToken;
  storage: PublishStorage;
};

export type SyncHandlerJson = {
  ok: boolean;
  error?: string;
  errorCodes?: string[];
  message?: string;
  id?: string;
  photoPath?: string | null;
};

function json(body: SyncHandlerJson, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function parsePayload(raw: string): SyncQueuePayload | null {
  try {
    const data = JSON.parse(raw) as SyncQueuePayload;
    if (
      typeof data.denunciaId !== "string" ||
      typeof data.categoria !== "string" ||
      typeof data.relato !== "string" ||
      typeof data.lat !== "number" ||
      typeof data.lon !== "number"
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export async function handleSyncForm(
  form: FormData,
  deps: SyncHandlerDeps,
): Promise<Response> {
  const token = String(form.get("turnstileToken") ?? "").trim();
  const payloadRaw = String(form.get("payload") ?? "");
  const foto = form.get("foto");

  if (!token) {
    return json(
      {
        ok: false,
        error: "turnstile_required",
        message: "Token de Turnstile no proporcionado.",
      },
      400,
    );
  }

  const payload = parsePayload(payloadRaw);
  if (!payload) {
    return json(
      {
        ok: false,
        error: "invalid_payload",
        message: "El payload JSON de la denuncia no es válido.",
      },
      400,
    );
  }

  const verified: SiteverifyResult = await deps.verify(
    token,
    deps.turnstileSecret,
  );
  if (verified.success !== true) {
    const isTimeout = isTimeoutOrDuplicate(verified);
    return json(
      {
        ok: false,
        error: isTimeout ? "timeout-or-duplicate" : "turnstile_failed",
        errorCodes: verified["error-codes"],
        message: isTimeout
          ? "El token de verificación expiró o ya fue utilizado."
          : "Fallo en la validación del token de seguridad Turnstile.",
      },
      403,
    );
  }

  let fotoBytes: ArrayBuffer | undefined;
  let fotoMime: string | undefined;
  if (foto instanceof Blob && foto.size > 0) {
    fotoBytes = await foto.arrayBuffer();
    fotoMime = foto.type || "image/webp";
  }

  const published = await publishDenuncia(
    {
      categoria: payload.categoria,
      relato: payload.relato,
      lat: payload.lat,
      lon: payload.lon,
      fotoBytes,
      fotoMime,
    },
    deps.storage,
  );

  if (!published.ok) {
    if (published.reason === "storage") {
      return json(
        {
          ok: false,
          error: "storage_failed",
          message: published.detail
            ? `No se pudo subir la foto de evidencia a Supabase Storage: ${published.detail}`
            : "No se pudo subir la foto de evidencia a Supabase Storage.",
        },
        published.status && published.status >= 500 ? published.status : 502,
      );
    }
    return json(
      {
        ok: false,
        error: "insert_failed",
        message: published.detail
          ? `No se pudo registrar la denuncia en la base de datos Supabase: ${published.detail}`
          : "No se pudo registrar la denuncia en la base de datos Supabase.",
      },
      500,
    );
  }

  return json(
    { ok: true, id: published.id, photoPath: published.photoPath },
    201,
  );
}

export async function handleSyncDenuncia(
  request: Request,
  deps: SyncHandlerDeps,
): Promise<Response> {
  try {
    const form = await request.formData();
    return await handleSyncForm(form, deps);
  } catch (err) {
    return json(
      {
        ok: false,
        error: "invalid_payload",
        message:
          err instanceof Error
            ? err.message
            : "Error al procesar el cuerpo FormData de la solicitud.",
      },
      400,
    );
  }
}
