import { describe, expect, it, vi } from "vitest";
import { fetchPublicDetalle, publicDetallePath } from "./fetch-public-detalle";
import { YA_NO_ESTA_PUBLICO } from "./public-detalle";

describe("fetchPublicDetalle", () => {
  it("lee detalle ok", async () => {
    const result = await fetchPublicDetalle("a", {
      fetchImpl: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: true,
            detalle: {
              id: "a",
              categoria: "otro",
              relato: "Relato público de prueba con más de veinte.",
              trust_score: 0,
              atestiguos_validos: 0,
              reportes_falsedad: 0,
            },
          }),
          { status: 200 },
        ),
      ),
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.detalle.id).toBe("a");
  });

  it("404 se traduce a gone con mensaje canónico", async () => {
    const result = await fetchPublicDetalle("old", {
      fetchImpl: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: false,
            error: "ya_no_esta_publico",
            message: YA_NO_ESTA_PUBLICO,
          }),
          { status: 404 },
        ),
      ),
    });
    expect(result).toEqual({
      ok: false,
      reason: "gone",
      message: YA_NO_ESTA_PUBLICO,
    });
  });

  it("construye path hermano del feed", () => {
    expect(publicDetallePath("abc")).toBe("/api/denuncias/publicas/abc");
  });
});
