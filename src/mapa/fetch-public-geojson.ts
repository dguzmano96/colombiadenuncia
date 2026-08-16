import { PUBLIC_GEOJSON_PATH } from "@/pwa/precache";
import type { PublicFeatureCollection } from "./public-geojson";

export const CACHE_BANNER = "datos de caché";

export type FetchPublicGeojsonResult =
  | { ok: true; collection: PublicFeatureCollection; fromCache: boolean }
  | { ok: false; fromCache: false };

export type FetchPublicGeojsonDeps = {
  fetchImpl?: typeof fetch;
  cacheMatch?: (request: RequestInfo) => Promise<Response | undefined>;
  isOnline?: () => boolean;
  url?: string;
};

function isFeatureCollection(data: unknown): data is PublicFeatureCollection {
  if (!data || typeof data !== "object") return false;
  const rec = data as { type?: unknown; features?: unknown };
  return rec.type === "FeatureCollection" && Array.isArray(rec.features);
}

async function readCollection(
  response: Response,
): Promise<PublicFeatureCollection | null> {
  try {
    const data: unknown = await response.json();
    return isFeatureCollection(data) ? data : null;
  } catch {
    return null;
  }
}

export async function fetchPublicGeojson(
  deps: FetchPublicGeojsonDeps = {},
): Promise<FetchPublicGeojsonResult> {
  const url = deps.url ?? PUBLIC_GEOJSON_PATH;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const isOnline =
    deps.isOnline ??
    (() => (typeof navigator === "undefined" ? true : navigator.onLine));

  try {
    const response = await fetchImpl(url);
    if (response.ok) {
      const collection = await readCollection(response);
      if (collection) {
        return {
          ok: true,
          collection,
          fromCache: !isOnline(),
        };
      }
    }
  } catch {
    // red fallida: intentar caché
  }

  const cached = deps.cacheMatch
    ? await deps.cacheMatch(url)
    : typeof caches !== "undefined"
      ? await caches.match(url)
      : undefined;

  if (cached?.ok) {
    const collection = await readCollection(cached);
    if (collection) {
      return { ok: true, collection, fromCache: true };
    }
  }

  return { ok: false, fromCache: false };
}
