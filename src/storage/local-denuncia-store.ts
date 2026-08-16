import {
  createDenunciaLocal,
  ESTADO_ENVIADA,
  ESTADO_ERROR_SYNC,
  type DenunciaInput,
  type DenunciaLocal,
  type ValidationIssue,
} from "@/domain/denuncia";
import { MAX_SYNC_ATTEMPTS } from "@/sync/backoff";
import { ColombiaDenunciaDB, getDb, type DenunciaRecord } from "./db";
import { createUpsertQueueItem, type SyncQueueItem } from "./sync-queue";

export type SaveResult =
  | { ok: true; denuncia: DenunciaLocal }
  | { ok: false; issues: ValidationIssue[] }
  | { ok: false; persistError: true; message: string };

export function isPersistError(
  result: SaveResult,
): result is { ok: false; persistError: true; message: string } {
  return !result.ok && "persistError" in result;
}

const PERSIST_ERROR_MESSAGE =
  "No se pudo guardar en este dispositivo. La denuncia no se envió.";

export type SaveDenunciaInput = DenunciaInput & {
  foto?: Blob | null;
};

export type SaveDenunciaDeps = {
  db?: ColombiaDenunciaDB;
  idFactory?: () => string;
  now?: () => number;
};

function isPersistFailure(error: unknown): boolean {
  if (error instanceof Error) {
    const name = error.name;
    return (
      name === "OpenFailedError" ||
      name === "InvalidStateError" ||
      name === "UnknownError" ||
      name === "MissingAPIError" ||
      /indexeddb|indexed DB|not available|openfailed/i.test(error.message)
    );
  }
  return false;
}

export async function saveDenuncia(
  input: SaveDenunciaInput,
  deps: SaveDenunciaDeps = {},
): Promise<SaveResult> {
  const created = createDenunciaLocal(input, deps.idFactory);
  if (!created.ok) {
    return created;
  }

  const db = deps.db ?? getDb();
  const now = deps.now ?? Date.now;

  try {
    const fotoPart = input.foto
      ? {
          fotoBytes: await input.foto.arrayBuffer(),
          fotoMime: input.foto.type,
        }
      : {};
    const record: DenunciaRecord = {
      ...created.denuncia,
      createdAt: now(),
      ...fotoPart,
    };
    const queueItem = createUpsertQueueItem(
      {
        denunciaId: record.id,
        categoria: record.categoria,
        relato: record.relato,
        lat: record.lat,
        lon: record.lon,
      },
      now,
    );

    await db.transaction("rw", db.denuncias, db.syncQueue, async () => {
      await db.denuncias.put(record);
      const existing = await db.syncQueue
        .where("denunciaId")
        .equals(record.id)
        .first();
      if (!existing) {
        await db.syncQueue.add(queueItem);
      }
    });
  } catch (error) {
    if (isPersistFailure(error) || error instanceof Error) {
      return {
        ok: false,
        persistError: true,
        message: PERSIST_ERROR_MESSAGE,
      };
    }
    throw error;
  }

  return created;
}

export async function listDenuncias(
  db: ColombiaDenunciaDB = getDb(),
): Promise<DenunciaRecord[]> {
  return db.denuncias.toArray();
}

export async function listSyncQueue(
  db: ColombiaDenunciaDB = getDb(),
): Promise<SyncQueueItem[]> {
  return db.syncQueue.orderBy("id").toArray();
}

export async function listDueQueueItems(
  now: number,
  db: ColombiaDenunciaDB = getDb(),
): Promise<SyncQueueItem[]> {
  const items = await db.syncQueue.orderBy("id").toArray();
  return items.filter(
    (item) => item.proxima_at <= now && item.intentos < MAX_SYNC_ATTEMPTS,
  );
}

export async function getDenunciaRecord(
  id: string,
  db: ColombiaDenunciaDB = getDb(),
): Promise<DenunciaRecord | undefined> {
  return db.denuncias.get(id);
}

export async function markDenunciaEnviada(
  denunciaId: string,
  db: ColombiaDenunciaDB = getDb(),
): Promise<void> {
  await db.transaction("rw", db.denuncias, db.syncQueue, async () => {
    await db.denuncias.update(denunciaId, { estado: ESTADO_ENVIADA });
    await db.syncQueue.where("denunciaId").equals(denunciaId).delete();
  });
}

export async function applySyncFailure(
  denunciaId: string,
  next: { intentos: number; proxima_at: number },
  db: ColombiaDenunciaDB = getDb(),
): Promise<void> {
  await db.transaction("rw", db.denuncias, db.syncQueue, async () => {
    await db.denuncias.update(denunciaId, { estado: ESTADO_ERROR_SYNC });
    const existing = await db.syncQueue
      .where("denunciaId")
      .equals(denunciaId)
      .first();
    if (existing?.id != null) {
      await db.syncQueue.update(existing.id, next);
    }
  });
}

export async function resumePausedQueue(
  db: ColombiaDenunciaDB = getDb(),
  now: () => number = Date.now,
): Promise<void> {
  const items = await db.syncQueue.toArray();
  for (const item of items) {
    if (item.id == null || item.intentos < MAX_SYNC_ATTEMPTS) continue;
    await db.syncQueue.update(item.id, {
      intentos: 0,
      proxima_at: now(),
    });
  }
}
