import { describe, expect, it, vi } from "vitest";
import { handlePublicDenunciaDetalle } from "./handle-public-denuncia-detalle";
import { YA_NO_ESTA_PUBLICO } from "./public-detalle";
import type { PublicDenunciaRow } from "./public-geojson";

const publicada: PublicDenunciaRow = {
  id: "pub-1",
  categoria: "desvío",
  lon: -75,
  lat: 6,
  trust_score: 1,
  atestiguos_validos: 1,
  reportes_falsedad: 0,
  estado: "publicada",
  relato: "Desvío de donaciones en un centro de acopio comunitario.",
};

describe("handlePublicDenunciaDetalle", () => {
  it("sirve detalle publicado sin PII", async () => {
    const response = await handlePublicDenunciaDetalle("pub-1", {
      getById: async () => publicada,
      supabaseUrl: "https://example.supabase.co",
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      ok: boolean;
      detalle: Record<string, unknown>;
    };
    expect(body.ok).toBe(true);
    expect(body.detalle.relato).toBe(publicada.relato);
    expect(body.detalle.categoria).toBe("desvío");
    expect(JSON.stringify(body)).not.toMatch(
      /user_agent|"ip"|device_id|deviceId/i,
    );
  });

  it("id en cuarentena responde 404/gone sin el relato", async () => {
    const response = await handlePublicDenunciaDetalle("pub-1", {
      getById: async () => ({ ...publicada, estado: "cuarentena" }),
    });
    expect(response.status).toBe(404);
    const raw = await response.text();
    expect(raw).not.toContain(publicada.relato ?? "");
    const body = JSON.parse(raw) as { error: string; detalle?: unknown };
    expect(body.error).toBe("ya_no_esta_publico");
    expect(body.detalle).toBeUndefined();
  });

  it("id oculta_moderacion responde 404/gone sin el relato", async () => {
    const response = await handlePublicDenunciaDetalle("pub-1", {
      getById: async () => ({ ...publicada, estado: "oculta_moderacion" }),
    });
    expect(response.status).toBe(404);
    const raw = await response.text();
    expect(raw).not.toContain(publicada.relato ?? "");
    const body = JSON.parse(raw) as { error: string; detalle?: unknown };
    expect(body.error).toBe("ya_no_esta_publico");
    expect(body.detalle).toBeUndefined();
  });

  it("id ya no público responde mensaje canónico, no error genérico", async () => {
    const response = await handlePublicDenunciaDetalle("gone", {
      getById: async () => null,
    });
    expect(response.status).toBe(404);
    const body = (await response.json()) as {
      error: string;
      message: string;
    };
    expect(body.message).toBe(YA_NO_ESTA_PUBLICO);
    expect(body.error).toBe("ya_no_esta_publico");
    expect(JSON.stringify(body)).not.toMatch(/internal server|unexpected/i);
  });

  it("error de consulta no inventa detalle", async () => {
    const response = await handlePublicDenunciaDetalle("x", {
      getById: async () => {
        throw new Error("db");
      },
    });
    expect(response.status).toBe(502);
    const body = (await response.json()) as { detalle?: unknown };
    expect(body.detalle).toBeUndefined();
  });

  it("no consulta la tabla denuncias desde el getById de producto", async () => {
    const getById = vi.fn().mockResolvedValue(null);
    await handlePublicDenunciaDetalle("x", { getById });
    expect(getById).toHaveBeenCalledWith("x");
  });
});
