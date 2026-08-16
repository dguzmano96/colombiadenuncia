import { describe, expect, it, vi } from "vitest";
import { CACHE_BANNER, fetchPublicGeojson } from "./fetch-public-geojson";

const emptyFc = { type: "FeatureCollection", features: [] };

describe("fetchPublicGeojson", () => {
  it("usa red cuando responde FeatureCollection", async () => {
    const result = await fetchPublicGeojson({
      isOnline: () => true,
      fetchImpl: vi.fn().mockResolvedValue(
        new Response(JSON.stringify(emptyFc), { status: 200 }),
      ),
      cacheMatch: vi.fn(),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.fromCache).toBe(false);
      expect(result.collection.features).toEqual([]);
    }
  });

  it("con red fallida usa caché y marca fromCache", async () => {
    const result = await fetchPublicGeojson({
      isOnline: () => false,
      fetchImpl: vi.fn().mockRejectedValue(new Error("offline")),
      cacheMatch: vi.fn().mockResolvedValue(
        new Response(JSON.stringify(emptyFc), { status: 200 }),
      ),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.fromCache).toBe(true);
    }
    expect(CACHE_BANNER).toBe("datos de caché");
  });

  it("sin red ni caché no inventa puntos", async () => {
    const result = await fetchPublicGeojson({
      fetchImpl: vi.fn().mockRejectedValue(new Error("offline")),
      cacheMatch: vi.fn().mockResolvedValue(undefined),
    });
    expect(result).toEqual({ ok: false, fromCache: false });
  });
});
