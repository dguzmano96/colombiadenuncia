import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizeConsultaTablaZonal,
  TABLA_ZONAL_PAGE_SIZE,
  type ConsultaTablaZonal,
  type FilaTablaZonal,
  type MetaTablaZonal,
} from "./table-zonal";

const VIEW = "denuncias_publicas_zonales";
const COLUMNS = "departamento,municipio,cantidad";

export type ResultadoListadoTablaZonal = {
  filas: FilaTablaZonal[];
  meta: MetaTablaZonal;
};

function uniqueSorted(values: unknown[]): string[] {
  return [
    ...new Set(
      values.filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  ].sort((left, right) => left.localeCompare(right, "es"));
}

export async function listTablaZonal(
  client: SupabaseClient,
  consulta: ConsultaTablaZonal = {},
): Promise<ResultadoListadoTablaZonal> {
  const normalized = normalizeConsultaTablaZonal(consulta);
  const offset = (normalized.page - 1) * TABLA_ZONAL_PAGE_SIZE;
  let rowsQuery = client
    .from(VIEW)
    .select(COLUMNS, { count: "exact" })
    .order("departamento", { ascending: true })
    .order("municipio", { ascending: true })
    .range(offset, offset + TABLA_ZONAL_PAGE_SIZE - 1);
  if (normalized.departamento) {
    rowsQuery = rowsQuery.eq("departamento", normalized.departamento);
  }
  if (normalized.municipio) {
    rowsQuery = rowsQuery.eq("municipio", normalized.municipio);
  }

  const departmentsQuery = client.from(VIEW).select("departamento");
  const municipalitiesQuery = normalized.departamento
    ? client
        .from(VIEW)
        .select("municipio")
        .eq("departamento", normalized.departamento)
    : Promise.resolve({ data: [], error: null });

  const [{ data, error, count }, departments, municipalities] = await Promise.all([
    rowsQuery,
    departmentsQuery,
    municipalitiesQuery,
  ]);
  if (error) throw new Error(error.message);
  if (departments.error) throw new Error(departments.error.message);
  if (municipalities.error) throw new Error(municipalities.error.message);

  const total = count ?? 0;
  return {
    filas: (data ?? []) as FilaTablaZonal[],
    meta: {
      page: normalized.page,
      pageSize: TABLA_ZONAL_PAGE_SIZE,
      total,
      hasMore: offset + (data?.length ?? 0) < total,
      departamentos: uniqueSorted(
        (departments.data ?? []).map((row) => (row as { departamento?: unknown }).departamento),
      ),
      municipios: uniqueSorted(
        (municipalities.data ?? []).map((row) => (row as { municipio?: unknown }).municipio),
      ),
    },
  };
}
