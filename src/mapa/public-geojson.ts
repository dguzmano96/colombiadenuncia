import { EVIDENCIAS_BUCKET } from "@/lib/supabase/anon-server";

export const RELATO_SNIPPET_MAX = 140;
export const FEATURE_MAX_BYTES = 2048;

const PUBLIC_ESTADOS = new Set(["publicada"]);

export type PublicDenunciaRow = {
  id: string;
  categoria: string;
  lon: number;
  lat: number;
  trust_score: number;
  atestiguos_validos: number;
  reportes_falsedad: number;
  photo_path?: string | null;
  estado?: string | null;
  relato?: string | null;
};

export type PublicFeatureProperties = {
  id: string;
  categoria: string;
  lon: number;
  lat: number;
  trust_score: number;
  atestiguos_validos: number;
  reportes_falsedad: number;
  photo_url?: string;
  relato?: string;
};

export type PublicFeature = {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: PublicFeatureProperties;
};

export type PublicFeatureCollection = {
  type: "FeatureCollection";
  features: PublicFeature[];
};

export function publicPhotoUrl(
  supabaseUrl: string | undefined,
  photoPath: string | null | undefined,
): string | undefined {
  if (!supabaseUrl || !photoPath) return undefined;
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${EVIDENCIAS_BUCKET}/${photoPath}`;
}

function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).length;
}

function clipRelato(relato: string | null | undefined): string | undefined {
  if (!relato) return undefined;
  const trimmed = relato.trim();
  if (!trimmed) return undefined;
  if (trimmed.length <= RELATO_SNIPPET_MAX) return trimmed;
  return `${trimmed.slice(0, RELATO_SNIPPET_MAX)}…`;
}

export function rowToPublicFeature(
  row: PublicDenunciaRow,
  supabaseUrl?: string,
): PublicFeature | null {
  if (row.estado && !PUBLIC_ESTADOS.has(row.estado)) {
    return null;
  }
  const lon = Number(row.lon);
  const lat = Number(row.lat);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    return null;
  }

  const properties: PublicFeatureProperties = {
    id: row.id,
    categoria: row.categoria,
    lon,
    lat,
    trust_score: row.trust_score,
    atestiguos_validos: row.atestiguos_validos,
    reportes_falsedad: row.reportes_falsedad,
  };

  const photoUrl = publicPhotoUrl(supabaseUrl, row.photo_path);
  if (photoUrl) {
    properties.photo_url = photoUrl;
  }

  const feature: PublicFeature = {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [lon, lat],
    },
    properties,
  };

  const snippet = clipRelato(row.relato);
  if (snippet) {
    const withRelato = {
      ...feature,
      properties: { ...properties, relato: snippet },
    };
    if (utf8Bytes(JSON.stringify(withRelato)) <= FEATURE_MAX_BYTES) {
      return withRelato;
    }
  }

  return feature;
}

export function toPublicFeatureCollection(
  rows: PublicDenunciaRow[],
  supabaseUrl?: string,
): PublicFeatureCollection {
  const features: PublicFeature[] = [];
  for (const row of rows) {
    const feature = rowToPublicFeature(row, supabaseUrl);
    if (feature) features.push(feature);
  }
  return { type: "FeatureCollection", features };
}
