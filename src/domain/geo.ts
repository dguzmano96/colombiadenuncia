export type GeoPoint = {
  lat: number;
  lon: number;
};

/** Radio de atestiguar (S-09). El servidor revalida con ST_DWithin geography. */
export const ATESTIGUAR_RADIO_M = 500;

const WGS84_DECIMALS = 5;
const EARTH_RADIUS_M = 6_371_000;

export function roundWgs84(value: number): number {
  const factor = 10 ** WGS84_DECIMALS;
  return Math.round(value * factor) / factor;
}

export function toGeoPoint(lat: number, lon: number): GeoPoint {
  return {
    lat: roundWgs84(lat),
    lon: roundWgs84(lon),
  };
}

export function isValidGeoPoint(point: GeoPoint | null | undefined): point is GeoPoint {
  if (!point) return false;
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lon)) return false;
  if (point.lat < -90 || point.lat > 90) return false;
  if (point.lon < -180 || point.lon > 180) return false;
  return true;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Distancia Haversine en metros (UX cliente; no sustituye ST_DWithin). */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isWithinAtestiguarRadio(meters: number): boolean {
  return Number.isFinite(meters) && meters <= ATESTIGUAR_RADIO_M;
}
