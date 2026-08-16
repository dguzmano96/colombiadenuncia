import { describe, expect, it, vi } from "vitest";
import { GEOJSON_CACHE_CONTROL } from "@/pwa/precache";
import { handlePublicDenuncias } from "./handle-public-denuncias";
import type { PublicDenunciaRow } from "./public-geojson";

const row = (id: string, estado = "publicada"): PublicDenunciaRow => ({
  id,
  categoria: "acaparamiento",
  lon: -74,
  lat: 4.6,
  trust_score: 0,
  atestiguos_validos: 0,
  reportes_falsedad: 0,
  estado,
});

describe("handlePublicDenuncias", () => {
  it("responde FeatureCollection cacheable solo con publicadas", async () => {
    const response = await handlePublicDenuncias({
      list: async () => [row("1"), row("2", "cuarentena"), row("3")],
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(GEOJSON_CACHE_CONTROL);
    expect(response.headers.get("Content-Type")).toMatch(/geo\+json/);
    const body = (await response.json()) as {
      type: string;
      features: { properties: { id: string; relato?: string } }[];
    };
    expect(body.type).toBe("FeatureCollection");
    expect(body.features.map((f) => f.properties.id)).toEqual(["1", "3"]);
    expect(body.features.some((f) => "relato" in f.properties && f.properties.relato)).toBe(
      false,
    );
  });

  it("colección vacía cuando no hay publicadas", async () => {
    const response = await handlePublicDenuncias({ list: async () => [] });
    const body = (await response.json()) as { features: unknown[] };
    expect(response.status).toBe(200);
    expect(body.features).toEqual([]);
  });

  it("error de listado no inventa puntos", async () => {
    const response = await handlePublicDenuncias({
      list: async () => {
        throw new Error("db down");
      },
    });
    expect(response.status).toBe(502);
    const body = (await response.json()) as { error: string; features?: unknown };
    expect(body.error).toBe("geojson_unavailable");
    expect(body.features).toBeUndefined();
  });

  it("no consulta la tabla denuncias desde el list inyectado de producto", async () => {
    const list = vi.fn().mockResolvedValue([]);
    await handlePublicDenuncias({ list });
    expect(list).toHaveBeenCalledOnce();
  });
});
