export const QUEUE_TIPO_UPSERT_DENUNCIA = "upsert_denuncia" as const;

export type SyncQueueTipo = typeof QUEUE_TIPO_UPSERT_DENUNCIA;

export type SyncQueuePayload = {
  denunciaId: string;
  categoria: string;
  relato: string;
  lat: number;
  lon: number;
};

export type SyncQueueItem = {
  id?: number;
  tipo: SyncQueueTipo;
  denunciaId: string;
  payload: SyncQueuePayload;
  intentos: number;
  proxima_at: number;
};

export function createUpsertQueueItem(
  payload: SyncQueuePayload,
  now: () => number = Date.now,
): Omit<SyncQueueItem, "id"> {
  return {
    tipo: QUEUE_TIPO_UPSERT_DENUNCIA,
    denunciaId: payload.denunciaId,
    payload,
    intentos: 0,
    proxima_at: now(),
  };
}
