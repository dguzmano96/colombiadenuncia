import Dexie, { type Table } from "dexie";
import type { DenunciaLocal } from "@/domain/denuncia";
import type { SyncQueueItem } from "./sync-queue";

export const DB_NAME = "colombiadenuncia";
export const DB_VERSION = 1;

export type DenunciaRecord = DenunciaLocal & {
  fotoBytes?: ArrayBuffer;
  fotoMime?: string;
  createdAt: number;
};

export class ColombiaDenunciaDB extends Dexie {
  denuncias!: Table<DenunciaRecord, string>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor(
    name = DB_NAME,
    options?: { indexedDB?: IDBFactory; IDBKeyRange?: typeof IDBKeyRange },
  ) {
    super(name, options);
    this.version(DB_VERSION).stores({
      denuncias: "id, estado",
      syncQueue: "++id, &denunciaId",
    });
  }
}

let singleton: ColombiaDenunciaDB | null = null;

export function getDb(): ColombiaDenunciaDB {
  if (!singleton) {
    singleton = new ColombiaDenunciaDB();
  }
  return singleton;
}

export async function resetDb(): Promise<void> {
  if (singleton) {
    singleton.close();
    await singleton.delete();
    singleton = null;
  }
  await Dexie.delete(DB_NAME);
}
