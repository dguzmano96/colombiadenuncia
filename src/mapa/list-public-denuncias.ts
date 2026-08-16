import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicDenunciaRow } from "./public-geojson";

const VIEW = "denuncias_publicas";
const COLUMNS =
  "id,categoria,lon,lat,trust_score,atestiguos_validos,reportes_falsedad,photo_path";
const DETALLE_COLUMNS = `${COLUMNS},relato`;

export async function listPublicDenuncias(
  client: SupabaseClient,
): Promise<PublicDenunciaRow[]> {
  const { data, error } = await client.from(VIEW).select(COLUMNS);
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as PublicDenunciaRow[];
}

export async function getPublicDenunciaById(
  client: SupabaseClient,
  id: string,
): Promise<PublicDenunciaRow | null> {
  const { data, error } = await client
    .from(VIEW)
    .select(DETALLE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return (data as PublicDenunciaRow | null) ?? null;
}
