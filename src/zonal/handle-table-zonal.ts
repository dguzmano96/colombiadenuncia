import { GEOJSON_CACHE_CONTROL } from "@/pwa/precache";
import type { ConsultaTablaZonal } from "./table-zonal";
import type { ResultadoListadoTablaZonal } from "./list-table-zonal";

export type ListTablaZonal = (
  consulta?: ConsultaTablaZonal,
) => Promise<ResultadoListadoTablaZonal>;

export type TablaZonalDeps = {
  list: ListTablaZonal;
};

function json(body: unknown, status: number, cacheControl = "no-store"): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cacheControl,
    },
  });
}

export async function handleTablaZonal(
  deps: TablaZonalDeps,
  consulta: ConsultaTablaZonal = {},
): Promise<Response> {
  try {
    const result = await deps.list(consulta);
    return json(
      { ok: true, filas: result.filas ?? [], meta: result.meta },
      200,
      GEOJSON_CACHE_CONTROL,
    );
  } catch {
    return json(
      {
        ok: false,
        error: "tabla_zonal_unavailable",
        filas: [],
      },
      502,
    );
  }
}
