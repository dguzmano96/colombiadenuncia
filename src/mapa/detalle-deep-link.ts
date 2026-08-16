export const DETALLE_QUERY_PARAM = "id";

export function readMapDetalleId(
  search = typeof window === "undefined" ? "" : window.location.search,
): string | null {
  const id = new URLSearchParams(search).get(DETALLE_QUERY_PARAM);
  const trimmed = id?.trim();
  return trimmed ? trimmed : null;
}

export function writeMapDetalleId(id: string | null): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (id) {
    url.searchParams.set(DETALLE_QUERY_PARAM, id);
  } else {
    url.searchParams.delete(DETALLE_QUERY_PARAM);
  }
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}
