import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createPublishStorage } from "./anon-server";

const baseRow = {
  categoria: "reventa",
  relato: "Relato de prueba con longitud suficiente.",
  location: "POINT(-74.08 4.6)",
  estado: "publicada" as const,
  trust_score: 0 as const,
  atestiguos_validos: 0 as const,
  reportes_falsedad: 0 as const,
  photo_path: null,
};

function fakeClient(overrides: {
  insert?: ReturnType<typeof vi.fn>;
  upload?: ReturnType<typeof vi.fn>;
  remove?: ReturnType<typeof vi.fn>;
} = {}): SupabaseClient {
  const insert =
    overrides.insert ?? vi.fn().mockResolvedValue({ error: null });
  const upload = overrides.upload ?? vi.fn().mockResolvedValue({ error: null });
  const remove = overrides.remove ?? vi.fn().mockResolvedValue({ error: null });
  const select = vi.fn(() => {
    throw new Error(
      "insert() no debe encadenar .select(): anon no tiene policy RLS de SELECT sobre denuncias.",
    );
  });
  return {
    from: vi.fn(() => ({ insert, select })),
    storage: { from: vi.fn(() => ({ upload, remove })) },
  } as unknown as SupabaseClient;
}

describe("createPublishStorage", () => {
  it("inserta sin encadenar .select() y genera un id propio (evita el 42501 de RLS)", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const client = fakeClient({ insert });
    const storage = createPublishStorage(client);

    const result = await storage.insert(baseRow);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.id).toBe("string");
      expect(result.id.length).toBeGreaterThan(0);
    }
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ ...baseRow, id: expect.any(String) }),
    );
  });

  it("si Postgres devuelve error en el insert, propaga detail y ok:false", async () => {
    const insert = vi
      .fn()
      .mockResolvedValue({ error: { message: "check constraint violada" } });
    const client = fakeClient({ insert });
    const storage = createPublishStorage(client);

    const result = await storage.insert(baseRow);

    expect(result).toEqual({ ok: false, detail: "check constraint violada" });
  });

  it("si el cliente lanza una excepción de red en insert, no rompe y devuelve detail", async () => {
    const insert = vi.fn().mockRejectedValue(new Error("fetch failed"));
    const client = fakeClient({ insert });
    const storage = createPublishStorage(client);

    const result = await storage.insert(baseRow);

    expect(result).toEqual({ ok: false, detail: "fetch failed" });
  });

  it("upload exitoso devuelve ok:true", async () => {
    const client = fakeClient();
    const storage = createPublishStorage(client);
    const result = await storage.upload("a.webp", new Uint8Array([1]).buffer, "image/webp");
    expect(result).toEqual({ ok: true });
  });

  it("upload con error de Storage propaga status y detail", async () => {
    const upload = vi
      .fn()
      .mockResolvedValue({ error: { message: "bucket no existe", statusCode: "404" } });
    const client = fakeClient({ upload });
    const storage = createPublishStorage(client);

    const result = await storage.upload("a.webp", new Uint8Array([1]).buffer, "image/webp");

    expect(result).toEqual({ ok: false, status: 404, detail: "bucket no existe" });
  });

  it("remove no lanza aunque falle (anon no tiene policy DELETE en storage.objects)", async () => {
    const remove = vi.fn().mockRejectedValue(new Error("permission denied"));
    const client = fakeClient({ remove });
    const storage = createPublishStorage(client);

    await expect(storage.remove?.("a.webp")).resolves.toBeUndefined();
  });
});
