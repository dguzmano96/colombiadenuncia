import {
  ATESTIGUAR_RADIO_M,
  isValidGeoPoint,
  type GeoPoint,
} from "@/domain/geo";

export const ATESTIGUAR_RPC_NAME = "atestiguar_denuncia";
export const ATESTIGUAR_PATH = "/api/atestiguos";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AtestiguarBody = {
  turnstileToken: string;
  denunciaId: string;
  deviceId: string;
  lat: number;
  lon: number;
};

export type AtestiguarCounts = {
  atestiguos_validos: number;
  reportes_falsedad: number;
  trust_score: number;
};

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function parseAtestiguarBody(raw: unknown): AtestiguarBody | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const turnstileToken =
    typeof rec.turnstileToken === "string" ? rec.turnstileToken.trim() : "";
  const denunciaId =
    typeof rec.denunciaId === "string" ? rec.denunciaId.trim() : "";
  const deviceId = typeof rec.deviceId === "string" ? rec.deviceId.trim() : "";
  const lat = typeof rec.lat === "number" ? rec.lat : Number.NaN;
  const lon = typeof rec.lon === "number" ? rec.lon : Number.NaN;
  const point: GeoPoint = { lat, lon };
  if (!turnstileToken || !isUuid(denunciaId) || !isUuid(deviceId)) {
    return null;
  }
  if (!isValidGeoPoint(point)) {
    return null;
  }
  return { turnstileToken, denunciaId, deviceId, lat: point.lat, lon: point.lon };
}

export function expectedTrustScore(
  atestiguosValidos: number,
  reportesFalsedad: number,
): number {
  return atestiguosValidos - 2 * reportesFalsedad;
}

export { ATESTIGUAR_RADIO_M };
