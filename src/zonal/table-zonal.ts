export const TABLA_ZONAL_API_PATH = "/api/denuncias/tabla-zonal";
export const ZONAS_API_PATH = "/api/denuncias/zonas";
export const TABLA_ZONAL_PAGE_SIZE = 25;

export type FilaTablaZonal = {
  departamento: string;
  municipio: string;
  cantidad: number;
};

export type ResultadoFetchZonaBounds =
  | {
      ok: true;
      bounds: [[number, number], [number, number]];
      nivel: "departamento" | "municipio";
    }
  | {
      ok: false;
      error: string;
    };

export type ConsultaTablaZonal = {
  departamento?: string;
  municipio?: string;
  page?: number;
};

export type MetaTablaZonal = {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  departamentos: string[];
  municipios: string[];
};

export type ResultadoTablaZonal =
  | { ok: true; filas: FilaTablaZonal[]; meta: MetaTablaZonal }
  | { ok: false; error: string };

export function isFilaTablaZonal(value: unknown): value is FilaTablaZonal {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<FilaTablaZonal>;
  return (
    typeof row.departamento === "string" &&
    row.departamento.length > 0 &&
    typeof row.municipio === "string" &&
    row.municipio.length > 0 &&
    typeof row.cantidad === "number" &&
    Number.isInteger(row.cantidad) &&
    row.cantidad >= 0
  );
}

export function normalizeConsultaTablaZonal(
  consulta: ConsultaTablaZonal = {},
): Required<Pick<ConsultaTablaZonal, "page">> &
  Pick<ConsultaTablaZonal, "departamento" | "municipio"> {
  const departamento = consulta.departamento?.trim() || undefined;
  const municipio = departamento ? consulta.municipio?.trim() || undefined : undefined;
  const page =
    typeof consulta.page === "number" &&
    Number.isInteger(consulta.page) &&
    consulta.page > 0
      ? consulta.page
      : 1;
  return { departamento, municipio, page };
}

export function parseConsultaTablaZonal(url?: string): ConsultaTablaZonal {
  if (!url) return { page: 1 };
  const params = new URL(url, "http://localhost").searchParams;
  const page = Number.parseInt(params.get("page") ?? "1", 10);
  return {
    departamento: params.get("departamento") || undefined,
    municipio: params.get("municipio") || undefined,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

function isMetaTablaZonal(value: unknown): value is MetaTablaZonal {
  if (!value || typeof value !== "object") return false;
  const meta = value as Partial<MetaTablaZonal>;
  return (
    Number.isInteger(meta.page) &&
    typeof meta.pageSize === "number" &&
    meta.pageSize > 0 &&
    typeof meta.total === "number" &&
    Number.isInteger(meta.total) &&
    meta.total >= 0 &&
    typeof meta.hasMore === "boolean" &&
    Array.isArray(meta.departamentos) &&
    meta.departamentos.every((item) => typeof item === "string") &&
    Array.isArray(meta.municipios) &&
    meta.municipios.every((item) => typeof item === "string")
  );
}

export async function fetchTablaZonal(
  consulta: ConsultaTablaZonal = {},
  fetchImpl: typeof fetch = fetch,
): Promise<ResultadoTablaZonal> {
  const normalized = normalizeConsultaTablaZonal(consulta);
  const params = new URLSearchParams({ page: String(normalized.page) });
  if (normalized.departamento) {
    params.set("departamento", normalized.departamento);
  }
  if (normalized.municipio) {
    params.set("municipio", normalized.municipio);
  }
  try {
    const response = await fetchImpl(`${TABLA_ZONAL_API_PATH}?${params.toString()}`);
    const body: unknown = await response.json();
    if (
      response.ok &&
      body &&
      typeof body === "object" &&
      (body as { ok?: unknown }).ok === true &&
      Array.isArray((body as { filas?: unknown }).filas) &&
      isMetaTablaZonal((body as { meta?: unknown }).meta)
    ) {
      return {
        ok: true,
        filas: (body as { filas: unknown[] }).filas.filter(isFilaTablaZonal),
        meta: (body as { meta: MetaTablaZonal }).meta,
      };
    }
  } catch {
    // La interfaz muestra el estado de error controlado.
  }
  return {
    ok: false,
    error: "No se pudo consultar la tabla zonal. Intenta nuevamente.",
  };
}

export async function fetchZonaBounds(
  departamento: string,
  municipio?: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ResultadoFetchZonaBounds> {
  const dpto = departamento.trim();
  if (!dpto) {
    return { ok: false, error: "Departamento inválido para consultar zona." };
  }
  const params = new URLSearchParams({ departamento: dpto });
  if (municipio?.trim()) {
    params.set("municipio", municipio.trim());
  }
  try {
    const response = await fetchImpl(`${ZONAS_API_PATH}?${params.toString()}`);
    const body = (await response.json()) as {
      ok?: boolean;
      bounds?: [[number, number], [number, number]];
      nivel?: "departamento" | "municipio";
      error?: string;
    };
    if (
      response.ok &&
      body &&
      body.ok === true &&
      Array.isArray(body.bounds) &&
      body.bounds.length === 2 &&
      Array.isArray(body.bounds[0]) &&
      Array.isArray(body.bounds[1])
    ) {
      return {
        ok: true,
        bounds: body.bounds,
        nivel: body.nivel ?? (municipio?.trim() ? "municipio" : "departamento"),
      };
    }
    return {
      ok: false,
      error: "Geometría no disponible para la zona seleccionada.",
    };
  } catch {
    return {
      ok: false,
      error: "No se pudo consultar la geometría de la zona.",
    };
  }
}

