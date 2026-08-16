import { describe, expect, it, vi } from "vitest";
import { pointWkt, publishDenuncia, type PublishStorage } from "./publish-denuncia";

function mockStorage(overrides: Partial<PublishStorage> = {}): PublishStorage & {
  upload: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
} {
  const upload = vi.fn().mockResolvedValue({ ok: true });
  const insert = vi.fn().mockResolvedValue({ ok: true, id: "srv-1" });
  const remove = vi.fn().mockResolvedValue(undefined);
  return {
    upload,
    insert,
    remove,
    ...overrides,
  } as PublishStorage & {
    upload: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
}

const base = {
  categoria: "reventa",
  relato: "Relato de prueba con longitud suficiente para sync.",
  lat: 4.6,
  lon: -74.08,
};

describe("publishDenuncia", () => {
  it("inserta Point lon lat, publicada, trust 0 y conteos 0", async () => {
    const storage = mockStorage();
    const result = await publishDenuncia(base, storage);
    expect(result.ok).toBe(true);
    expect(storage.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        location: pointWkt(-74.08, 4.6),
        estado: "publicada",
        trust_score: 0,
        atestiguos_validos: 0,
        reportes_falsedad: 0,
        photo_path: null,
      }),
    );
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("sube foto con path UUID después (el caller ya verificó Turnstile)", async () => {
    const storage = mockStorage();
    const bytes = new Uint8Array([1, 2, 3]).buffer;
    const result = await publishDenuncia(
      { ...base, fotoBytes: bytes, fotoMime: "image/webp" },
      storage,
      () => "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.photoPath).toBe(
        "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.webp",
      );
    }
    expect(storage.upload).toHaveBeenCalledWith(
      "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.webp",
      bytes,
      "image/webp",
    );
    expect(storage.insert.mock.invocationCallOrder[0]).toBeGreaterThan(
      storage.upload.mock.invocationCallOrder[0],
    );
  });

  it("si Storage 5xx no inserta", async () => {
    const storage = mockStorage({
      upload: vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    });
    const result = await publishDenuncia(
      { ...base, fotoBytes: new Uint8Array([9]).buffer, fotoMime: "image/webp" },
      storage,
    );
    expect(result).toEqual({ ok: false, reason: "storage", status: 503 });
    expect(storage.insert).not.toHaveBeenCalled();
  });
});
