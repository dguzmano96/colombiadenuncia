import { describe, expect, it, vi } from "vitest";
import {
  fetchTablaZonal,
  fetchZonaBounds,
  isFilaTablaZonal,
} from "./table-zonal";

const meta = {
  page: 1,
  pageSize: 25,
  total: 1,
  hasMore: false,
  departamentos: ["ANTIOQUIA"],
  municipios: ["MEDELLÍN"],
};

describe("tabla zonal", () => {
  it("acepta únicamente filas públicas estructuradas", () => {
    expect(isFilaTablaZonal({ departamento: "ANTIOQUIA", municipio: "MEDELLÍN", cantidad: 2 })).toBe(
      true,
    );
    expect(isFilaTablaZonal({ departamento: "ANTIOQUIA", municipio: "MEDELLÍN", cantidad: -1 })).toBe(
      false,
    );
    expect(
      isFilaTablaZonal({
        departamento: "ANTIOQUIA",
        municipio: "MEDELLÍN",
        cantidad: 2,
        lat: 6.2,
      }),
    ).toBe(true);
  });

  it("conserva filas válidas y descarta payloads parciales", async () => {
    const result = await fetchTablaZonal(
      {},
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: true,
            filas: [
              { departamento: "ANTIOQUIA", municipio: "MEDELLÍN", cantidad: 2 },
              { departamento: "ANTIOQUIA", municipio: "", cantidad: 9 },
            ],
            meta,
          }),
          { status: 200 },
        ),
      ),
    );
    expect(result).toEqual({
      ok: true,
      filas: [{ departamento: "ANTIOQUIA", municipio: "MEDELLÍN", cantidad: 2 }],
      meta,
    });
  });

  it("convierte error de red o contrato en error controlado", async () => {
    const result = await fetchTablaZonal(
      {},
      vi.fn().mockRejectedValue(new Error("offline")),
    );
    expect(result.ok).toBe(false);
  });

  it("fetchZonaBounds resuelve bounds válidos de municipio y departamento", async () => {
    const resultMunicipio = await fetchZonaBounds(
      "ANTIOQUIA",
      "MEDELLÍN",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: true,
            bounds: [
              [6.1, -75.7],
              [6.4, -75.5],
            ],
            nivel: "municipio",
          }),
          { status: 200 },
        ),
      ),
    );
    expect(resultMunicipio).toEqual({
      ok: true,
      bounds: [
        [6.1, -75.7],
        [6.4, -75.5],
      ],
      nivel: "municipio",
    });

    const resultDpto = await fetchZonaBounds(
      "ANTIOQUIA",
      undefined,
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: true,
            bounds: [
              [5.4, -77.1],
              [8.9, -73.8],
            ],
            nivel: "departamento",
          }),
          { status: 200 },
        ),
      ),
    );
    expect(resultDpto).toEqual({
      ok: true,
      bounds: [
        [5.4, -77.1],
        [8.9, -73.8],
      ],
      nivel: "departamento",
    });
  });

  it("fetchZonaBounds maneja errores 404/502 y red de forma controlada", async () => {
    const emptyDpto = await fetchZonaBounds("  ");
    expect(emptyDpto.ok).toBe(false);

    const notFound = await fetchZonaBounds(
      "DESCONOCIDO",
      undefined,
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ ok: false, error: "geometria_no_disponible" }),
          { status: 404 },
        ),
      ),
    );
    expect(notFound.ok).toBe(false);

    const networkErr = await fetchZonaBounds(
      "ANTIOQUIA",
      "MEDELLÍN",
      vi.fn().mockRejectedValue(new Error("network failure")),
    );
    expect(networkErr.ok).toBe(false);
  });
});
