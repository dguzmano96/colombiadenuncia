import { isValidGeoPoint, toGeoPoint, type GeoPoint } from "@/domain/geo";

export const CERCA_DEFAULT_DIST_M = 2000;
export const CERCA_MAX_DIST_M = 20_000;
export const CERCA_RPC_NAME = "denuncias_cerca";

export type CercaRow = {
  id: string;
  lat: number;
  long: number;
  dist_meters: number;
  categoria: string;
};

export type CercaQuery = {
  origin: GeoPoint;
  dist_m: number;
};

export type ParseCercaResult =
  | { ok: true; query: CercaQuery }
  | { ok: false; error: "invalid_origin" | "invalid_dist" };

function readNumber(raw: string | null): number | null {
  if (raw == null || raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function clipDistM(dist_m: number): number {
  if (!Number.isFinite(dist_m) || dist_m < 0) return 0;
  return Math.min(dist_m, CERCA_MAX_DIST_M);
}

export function parseCercaSearchParams(
  params: URLSearchParams,
): ParseCercaResult {
  const lat = readNumber(params.get("lat"));
  const lon = readNumber(params.get("long") ?? params.get("lon"));
  if (lat == null || lon == null) {
    return { ok: false, error: "invalid_origin" };
  }
  const origin = toGeoPoint(lat, lon);
  if (!isValidGeoPoint(origin)) {
    return { ok: false, error: "invalid_origin" };
  }

  const distRaw = params.get("dist_m");
  if (distRaw == null || distRaw.trim() === "") {
    return { ok: true, query: { origin, dist_m: CERCA_DEFAULT_DIST_M } };
  }
  const dist = readNumber(distRaw);
  if (dist == null || dist < 0) {
    return { ok: false, error: "invalid_dist" };
  }
  return { ok: true, query: { origin, dist_m: clipDistM(dist) } };
}

export function isCercaRow(value: unknown): value is CercaRow {
  if (!value || typeof value !== "object") return false;
  const rec = value as Record<string, unknown>;
  return (
    typeof rec.id === "string" &&
    typeof rec.lat === "number" &&
    typeof rec.long === "number" &&
    typeof rec.dist_meters === "number" &&
    typeof rec.categoria === "string"
  );
}
