import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CERCA_RPC_NAME,
  isCercaRow,
  type CercaQuery,
  type CercaRow,
} from "./cerca-params";

export async function rpcDenunciasCerca(
  client: SupabaseClient,
  query: CercaQuery,
): Promise<CercaRow[]> {
  const { data, error } = await client.rpc(CERCA_RPC_NAME, {
    lat: query.origin.lat,
    long: query.origin.lon,
    dist_m: query.dist_m,
  });
  if (error) {
    throw new Error(error.message);
  }
  if (!Array.isArray(data)) {
    return [];
  }
  return data.filter(isCercaRow);
}
