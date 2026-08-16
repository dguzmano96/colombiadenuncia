import { isCercaRow, type CercaQuery, type CercaRow } from "./cerca-params";

export const CERCA_API_PATH = "/api/denuncias/cerca";

export const CERCA_EMPTY_MESSAGE =
  "No hay denuncias públicas en ese radio.";

export const CERCA_ERROR_MESSAGE =
  "No se pudo consultar la cercanía. El mapa sigue disponible.";

export type FetchCercaResult =
  | { ok: true; items: CercaRow[] }
  | { ok: false; error: string };

export type FetchCercaDeps = {
  fetchImpl?: typeof fetch;
  url?: string;
};

export function cercaRequestUrl(query: CercaQuery, base = CERCA_API_PATH): string {
  const params = new URLSearchParams({
    lat: String(query.origin.lat),
    long: String(query.origin.lon),
    dist_m: String(query.dist_m),
  });
  return `${base}?${params.toString()}`;
}

export async function fetchDenunciasCerca(
  query: CercaQuery,
  deps: FetchCercaDeps = {},
): Promise<FetchCercaResult> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const url = cercaRequestUrl(query, deps.url ?? CERCA_API_PATH);
  try {
    const response = await fetchImpl(url);
    const data: unknown = await response.json();
    if (!data || typeof data !== "object") {
      return { ok: false, error: CERCA_ERROR_MESSAGE };
    }
    const rec = data as { ok?: unknown; items?: unknown; error?: unknown };
    if (response.ok && rec.ok === true && Array.isArray(rec.items)) {
      return { ok: true, items: rec.items.filter(isCercaRow) };
    }
    return { ok: false, error: CERCA_ERROR_MESSAGE };
  } catch {
    return { ok: false, error: CERCA_ERROR_MESSAGE };
  }
}
