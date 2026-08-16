import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toGeoPoint } from "@/domain/geo";
import { ColombiaDenunciaDB } from "./db";
import {
  listDenuncias,
  listSyncQueue,
  saveDenuncia,
} from "./local-denuncia-store";

const relatoOk =
  "Hay acaparamiento de kits de alimentos en un punto de acopio del barrio.";

const validInput = {
  categoria: "acaparamiento",
  relato: relatoOk,
  geo: toGeoPoint(4.60971, -74.08175),
  descargoAceptado: true,
};

describe("saveDenuncia (Dexie)", () => {
  let db: ColombiaDenunciaDB;

  beforeEach(() => {
    db = new ColombiaDenunciaDB(`test-${crypto.randomUUID()}`);
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("network should not run"))),
    );
  });

  afterEach(async () => {
    db.close();
    await db.delete();
    vi.unstubAllGlobals();
  });

  it("declara tablas versionadas denuncias y syncQueue", () => {
    expect(db.tables.map((table) => table.name).sort()).toEqual([
      "denuncias",
      "syncQueue",
    ]);
    expect(db.verno).toBe(1);
  });

  it("persiste UUID y pendiente_sync en IndexedDB antes de cualquier fetch", async () => {
    const result = await saveDenuncia(validInput, {
      db,
      idFactory: () => "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.denuncia.estado).toBe("pendiente_sync");
    }
    expect(await listDenuncias(db)).toHaveLength(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("escribe el blob de foto en IndexedDB junto a la denuncia", async () => {
    const foto = new Blob(["webp-bytes"], { type: "image/webp" });
    const result = await saveDenuncia(
      { ...validInput, foto },
      { db, idFactory: () => "blob-id-0000-0000-0000-000000000001" },
    );
    expect(result.ok).toBe(true);
    const stored = await listDenuncias(db);
    expect(stored[0]?.fotoBytes).toBeDefined();
    expect(stored[0]?.fotoBytes?.byteLength).toBe(foto.size);
    expect(stored[0]?.fotoMime).toBe("image/webp");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("encola upsert_denuncia con payload, intentos y proxima_at", async () => {
    await saveDenuncia(validInput, {
      db,
      idFactory: () => "cccccccc-dddd-4eee-8fff-000000000001",
      now: () => 1_700_000_000_000,
    });
    const queue = await listSyncQueue(db);
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      tipo: "upsert_denuncia",
      denunciaId: "cccccccc-dddd-4eee-8fff-000000000001",
      intentos: 0,
      proxima_at: 1_700_000_000_000,
      payload: {
        denunciaId: "cccccccc-dddd-4eee-8fff-000000000001",
        categoria: "acaparamiento",
      },
    });
  });

  it("no duplica la cola para el mismo denunciaId", async () => {
    const idFactory = () => "same-id-0000-0000-0000-000000000001";
    await saveDenuncia(validInput, { db, idFactory });
    await saveDenuncia(validInput, { db, idFactory });
    expect(await listSyncQueue(db)).toHaveLength(1);
    expect(await listDenuncias(db)).toHaveLength(1);
  });

  it("conserva FIFO y filas tras reabrir la misma base", async () => {
    const name = db.name;
    await saveDenuncia(validInput, {
      db,
      idFactory: () => "fifo-1-0000-0000-0000-000000000001",
    });
    await saveDenuncia(validInput, {
      db,
      idFactory: () => "fifo-2-0000-0000-0000-000000000002",
    });
    db.close();
    const reopened = new ColombiaDenunciaDB(name);
    const queue = await listSyncQueue(reopened);
    expect(queue.map((item) => item.denunciaId)).toEqual([
      "fifo-1-0000-0000-0000-000000000001",
      "fifo-2-0000-0000-0000-000000000002",
    ]);
    expect(await listDenuncias(reopened)).toHaveLength(2);
    reopened.close();
    await reopened.delete();
  });

  it("no escribe si falta descargo, geo o relato corto", async () => {
    expect(
      (
        await saveDenuncia(
          { ...validInput, descargoAceptado: false },
          { db },
        )
      ).ok,
    ).toBe(false);
    expect(
      (await saveDenuncia({ ...validInput, relato: "1234567890" }, { db })).ok,
    ).toBe(false);
    expect((await saveDenuncia({ ...validInput, geo: null }, { db })).ok).toBe(
      false,
    );
    expect(await listDenuncias(db)).toHaveLength(0);
  });

  it("devuelve error de persistencia y no afirma enviada si IndexedDB falla", async () => {
    const broken = new ColombiaDenunciaDB(`broken-${crypto.randomUUID()}`, {
      indexedDB: {
        open: () => {
          throw new DOMException("IndexedDB no está disponible", "UnknownError");
        },
      } as unknown as IDBFactory,
    });
    const result = await saveDenuncia(validInput, { db: broken });
    expect(result.ok).toBe(false);
    if (!result.ok && "persistError" in result) {
      expect(result.persistError).toBe(true);
      expect(result.message).toMatch(/no se envió/i);
      expect(result.message.toLowerCase()).not.toMatch(/enviada/);
    } else {
      expect.fail("se esperaba persistError");
    }
  });
});
