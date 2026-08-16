import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toGeoPoint } from "@/domain/geo";
import { ESTADO_ENVIADA, ESTADO_ERROR_SYNC } from "@/domain/denuncia";
import { ColombiaDenunciaDB } from "@/storage/db";
import {
  getDenunciaRecord,
  listSyncQueue,
  saveDenuncia,
} from "@/storage/local-denuncia-store";
import { MAX_SYNC_ATTEMPTS, PAUSED_PROXIMA_AT } from "./backoff";
import { drainSyncQueue } from "./drain-queue";

const relatoOk =
  "Hay acaparamiento de kits de alimentos en un punto de acopio del barrio.";

describe("drainSyncQueue", () => {
  let db: ColombiaDenunciaDB;

  beforeEach(() => {
    db = new ColombiaDenunciaDB(`drain-${crypto.randomUUID()}`);
  });

  afterEach(async () => {
    db.close();
    await db.delete();
  });

  it("tras 2xx marca enviada, resetea Turnstile y emite evento synced", async () => {
    await saveDenuncia(
      {
        categoria: "acaparamiento",
        relato: relatoOk,
        geo: toGeoPoint(4.6, -74.08),
        descargoAceptado: true,
      },
      { db, idFactory: () => "den-ok" },
    );
    const reset = vi.fn();
    const syncedListener = vi.fn();
    const syncingListener = vi.fn();
    window.addEventListener("colombiadenuncia:synced", syncedListener);
    window.addEventListener("colombiadenuncia:syncing", syncingListener);

    await drainSyncQueue({
      db,
      isOnline: () => true,
      getTurnstileToken: async () => "token-ok",
      resetTurnstile: reset,
      postSync: async () => ({ ok: true }),
    });

    const stored = await getDenunciaRecord("den-ok", db);
    expect(stored?.estado).toBe(ESTADO_ENVIADA);
    expect(await listSyncQueue(db)).toHaveLength(0);
    expect(reset).toHaveBeenCalled();
    expect(syncingListener).toHaveBeenCalled();
    expect(syncedListener).toHaveBeenCalled();

    window.removeEventListener("colombiadenuncia:synced", syncedListener);
    window.removeEventListener("colombiadenuncia:syncing", syncingListener);
  });

  it("token inválido deja error_sync, guarda error y emite sync-error", async () => {
    const now = 10_000;
    await saveDenuncia(
      {
        categoria: "acaparamiento",
        relato: relatoOk,
        geo: toGeoPoint(4.6, -74.08),
        descargoAceptado: true,
      },
      { db, idFactory: () => "den-bad", now: () => now },
    );
    const reset = vi.fn();
    const errorListener = vi.fn();
    window.addEventListener("colombiadenuncia:sync-error", errorListener);

    await drainSyncQueue({
      db,
      now: () => now,
      isOnline: () => true,
      getTurnstileToken: async () => "stale",
      resetTurnstile: reset,
      postSync: async () => ({
        ok: false,
        error: "timeout-or-duplicate",
        errorCodes: ["timeout-or-duplicate"],
        message: "Token expirado",
      }),
    });

    const stored = await getDenunciaRecord("den-bad", db);
    expect(stored?.estado).toBe(ESTADO_ERROR_SYNC);
    expect(stored?.lastError).toBe("timeout-or-duplicate");
    const queue = await listSyncQueue(db);
    expect(queue[0]?.intentos).toBe(1);
    expect(queue[0]?.lastError).toBe("timeout-or-duplicate");
    expect(queue[0]?.lastErrorCode).toBe("timeout-or-duplicate");
    expect(queue[0]?.lastErrorDetail).toBe("Token expirado");
    expect(queue[0]?.proxima_at).toBe(now + 5_000);
    expect(reset).toHaveBeenCalled();
    expect(errorListener).toHaveBeenCalled();

    window.removeEventListener("colombiadenuncia:sync-error", errorListener);
  });

  it("falla si no se puede obtener token de Turnstile", async () => {
    await saveDenuncia(
      {
        categoria: "acaparamiento",
        relato: relatoOk,
        geo: toGeoPoint(4.6, -74.08),
        descargoAceptado: true,
      },
      { db, idFactory: () => "den-no-token" },
    );

    await drainSyncQueue({
      db,
      isOnline: () => true,
      getTurnstileToken: async () => null,
      postSync: async () => ({ ok: true }),
    });

    const stored = await getDenunciaRecord("den-no-token", db);
    expect(stored?.estado).toBe(ESTADO_ERROR_SYNC);
    expect(stored?.lastError).toBe("turnstile_missing");
  });

  it("no drena si no hay red", async () => {
    const postSync = vi.fn();
    await drainSyncQueue({
      db,
      isOnline: () => false,
      getTurnstileToken: async () => "x",
      postSync,
    });
    expect(postSync).not.toHaveBeenCalled();
  });

  it("tras 8 fallos pausa (no vuelve a postear hasta reintento manual)", async () => {
    await saveDenuncia(
      {
        categoria: "acaparamiento",
        relato: relatoOk,
        geo: toGeoPoint(4.6, -74.08),
        descargoAceptado: true,
      },
      { db, idFactory: () => "den-pause" },
    );
    const queue = await listSyncQueue(db);
    if (queue[0]?.id != null) {
      await db.syncQueue.update(queue[0].id, {
        intentos: MAX_SYNC_ATTEMPTS - 1,
        proxima_at: 0,
      });
    }
    const postSync = vi.fn().mockResolvedValue({
      ok: false,
      error: "timeout-or-duplicate",
    });
    await drainSyncQueue({
      db,
      now: () => 50,
      isOnline: () => true,
      getTurnstileToken: async () => "t",
      postSync,
    });
    expect(postSync).toHaveBeenCalledTimes(1);
    const after = await listSyncQueue(db);
    expect(after[0]?.intentos).toBe(MAX_SYNC_ATTEMPTS);
    expect(after[0]?.proxima_at).toBe(PAUSED_PROXIMA_AT);

    postSync.mockClear();
    await drainSyncQueue({
      db,
      now: () => 99_999,
      isOnline: () => true,
      getTurnstileToken: async () => "t2",
      postSync,
    });
    expect(postSync).not.toHaveBeenCalled();
  });

  it("Storage 5xx deja el ítem en cola con error_sync", async () => {
    await saveDenuncia(
      {
        categoria: "acaparamiento",
        relato: relatoOk,
        geo: toGeoPoint(4.6, -74.08),
        descargoAceptado: true,
        foto: new Blob([new Uint8Array([7])], { type: "image/webp" }),
      },
      { db, idFactory: () => "den-foto" },
    );
    await drainSyncQueue({
      db,
      isOnline: () => true,
      getTurnstileToken: async () => "tok",
      postSync: async () => ({ ok: false, error: "storage_failed" }),
    });
    expect((await getDenunciaRecord("den-foto", db))?.estado).toBe(
      ESTADO_ERROR_SYNC,
    );
    expect(await listSyncQueue(db)).toHaveLength(1);
  });
});
