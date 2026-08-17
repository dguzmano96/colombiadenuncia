import { describe, expect, it, vi } from "vitest";
import { GEOJSON_CACHE_CONTROL } from "@/pwa/precache";
import { handleTablaZonal } from "./handle-table-zonal";

describe("handleTablaZonal", () => {
  it("devuelve únicamente filas agregadas y cacheables", async () => {
    const response = await handleTablaZonal({
      list: vi.fn().mockResolvedValue({
        filas: [{ departamento: "ANTIOQUIA", municipio: "MEDELLÍN", cantidad: 2 }],
        meta: {
          page: 1,
          pageSize: 10,
          total: 1,
          hasMore: false,
          departamentos: ["ANTIOQUIA"],
          municipios: ["MEDELLÍN"],
        },
      }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(GEOJSON_CACHE_CONTROL);
    expect(await response.json()).toEqual({
      ok: true,
      filas: [{ departamento: "ANTIOQUIA", municipio: "MEDELLÍN", cantidad: 2 }],
      meta: {
        page: 1,
        pageSize: 10,
        total: 1,
        hasMore: false,
        departamentos: ["ANTIOQUIA"],
        municipios: ["MEDELLÍN"],
      },
    });
  });

  it("no presenta datos parciales si falla la consulta", async () => {
    const response = await handleTablaZonal({
      list: vi.fn().mockRejectedValue(new Error("db down")),
    });
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      ok: false,
      error: "tabla_zonal_unavailable",
      filas: [],
    });
  });
});
