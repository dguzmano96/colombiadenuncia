import { publicPhotoUrl } from "./public-geojson";
import type { PublicDenunciaRow } from "./public-geojson";

export const YA_NO_ESTA_PUBLICO = "ya no está público";
export const PII_DENIED_KEYS = [
  "ip",
  "user_agent",
  "user-agent",
  "userAgent",
  "device_id",
  "deviceId",
  "identificador_dispositivo",
] as const;

export type PublicDetalle = {
  id: string;
  categoria: string;
  relato: string;
  lat: number;
  lon: number;
  trust_score: number;
  atestiguos_validos: number;
  reportes_falsedad: number;
  photo_url?: string;
};

export function toPublicDetalle(
  row: PublicDenunciaRow,
  supabaseUrl?: string,
): PublicDetalle | null {
  if (row.estado && row.estado !== "publicada") {
    return null;
  }
  if (!row.id || !row.categoria) {
    return null;
  }
  const lat = Number(row.lat);
  const lon = Number(row.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }
  const relato = (row.relato ?? "").trim();
  const detalle: PublicDetalle = {
    id: row.id,
    categoria: row.categoria,
    relato,
    lat,
    lon,
    trust_score: Number(row.trust_score) || 0,
    atestiguos_validos: Number(row.atestiguos_validos) || 0,
    reportes_falsedad: Number(row.reportes_falsedad) || 0,
  };
  const photoUrl = publicPhotoUrl(supabaseUrl, row.photo_path);
  if (photoUrl) {
    detalle.photo_url = photoUrl;
  }
  return detalle;
}

export function detalleHasDeniedPii(value: unknown): boolean {
  const blob = JSON.stringify(value).toLowerCase();
  return PII_DENIED_KEYS.some((key) => {
    const needle = `"${key.toLowerCase()}"`;
    return blob.includes(needle);
  });
}
