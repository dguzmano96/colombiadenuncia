import { describe, expect, it } from "vitest";
import { resolveZonaBounds } from "@/zonal/zona-bounds";
import { GET } from "./route";

const mockSnapshot = {
  features: [
    {
      geometry: {
        coordinates: [
          [
            [-75.6, 6.2],
            [-75.5, 6.2],
            [-75.5, 6.3],
            [-75.6, 6.3],
            [-75.6, 6.2],
          ],
        ],
      },
      properties: {
        DPTO_CNMBR: "ANTIOQUIA",
        MPIO_CNMBR: "MEDELLÍN",
      },
    },
    {
      geometry: {
        coordinates: [
          [
            [-75.4, 6.0],
            [-75.3, 6.0],
            [-75.3, 6.1],
            [-75.4, 6.1],
            [-75.4, 6.0],
          ],
        ],
      },
      properties: {
        DPTO_CNMBR: "ANTIOQUIA",
        MPIO_CNMBR: "RIONEGRO",
      },
    },
  ],
};

describe("resolveZonaBounds", () => {
  it("resuelve bounds de municipio individual con nivel 'municipio'", () => {
    const result = resolveZonaBounds(mockSnapshot, "ANTIOQUIA", "MEDELLÍN");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nivel).toBe("municipio");
      expect(result.bounds).toEqual([
        [6.2, -75.6],
        [6.3, -75.5],
      ]);
    }
  });

  it("resuelve bounds conjuntos de departamento con nivel 'departamento'", () => {
    const result = resolveZonaBounds(mockSnapshot, "ANTIOQUIA");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nivel).toBe("departamento");
      expect(result.bounds).toEqual([
        [6.0, -75.6],
        [6.3, -75.3],
      ]);
    }
  });

  it("normaliza mayúsculas, minúsculas y espacios", () => {
    const result = resolveZonaBounds(mockSnapshot, "  antioquia  ", "  medellín  ");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nivel).toBe("municipio");
    }
  });

  it("devuelve not_found si la zona no existe en el snapshot", () => {
    const result = resolveZonaBounds(mockSnapshot, "CALDAS", "MANIZALES");
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("devuelve invalid_snapshot si features no es un arreglo", () => {
    const result = resolveZonaBounds({} as never, "ANTIOQUIA");
    expect(result).toEqual({ ok: false, reason: "invalid_snapshot" });
  });
});

describe("GET /api/denuncias/zonas", () => {
  it("retorna 400 si falta el parámetro departamento", async () => {
    const request = new Request("http://localhost/api/denuncias/zonas");
    const response = await GET(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ ok: false, error: "zona_invalida" });
  });

  it("retorna 200 con bounds válidos y cabecera de cache para municipio real", async () => {
    const request = new Request(
      "http://localhost/api/denuncias/zonas?departamento=ANTIOQUIA&municipio=MEDELL%C3%8DN",
    );
    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("public");
    const body = (await response.json()) as {
      ok: boolean;
      bounds: [[number, number], [number, number]];
      nivel: string;
    };
    expect(body.ok).toBe(true);
    expect(body.nivel).toBe("municipio");
    expect(body.bounds).toHaveLength(2);
    expect(body.bounds[0][0]).toBeLessThanOrEqual(body.bounds[1][0]);
    expect(body.bounds[0][1]).toBeLessThanOrEqual(body.bounds[1][1]);
  });

  it("retorna 200 para departamento real sin exponer PII ni coordenadas individuales", async () => {
    const request = new Request(
      "http://localhost/api/denuncias/zonas?departamento=ANTIOQUIA",
    );
    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.nivel).toBe("departamento");
    expect(body).not.toHaveProperty("id");
    expect(body).not.toHaveProperty("email");
    expect(body).not.toHaveProperty("denuncia");
    expect(body).not.toHaveProperty("coordenadas");
  });

  it("retorna 404 controlado para zona inexistente", async () => {
    const request = new Request(
      "http://localhost/api/denuncias/zonas?departamento=INEXISTENTE",
    );
    const response = await GET(request);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ ok: false, error: "geometria_no_disponible" });
  });
});
