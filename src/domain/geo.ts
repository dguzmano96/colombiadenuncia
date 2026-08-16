export type GeoPoint = {
  lat: number;
  lon: number;
};

const WGS84_DECIMALS = 5;

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
