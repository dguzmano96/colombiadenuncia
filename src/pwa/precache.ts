export const CAPTURA_PATH = "/";
export const OFFLINE_FALLBACK_PATH = "/~offline";
export const MAPA_PATH = "/mapa";
export const PUBLIC_GEOJSON_PATH = "/api/denuncias/publicas";

export const GEOJSON_CACHE_CONTROL =
  "public, s-maxage=60, stale-while-revalidate=300";

export const GEOJSON_CACHE_NAME = "denuncias-publicas-geojson";
export const GEOJSON_CACHE_MAX_AGE_SECONDS = 300;
