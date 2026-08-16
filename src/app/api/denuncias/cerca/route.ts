import { createAnonServerClient } from "@/lib/supabase/anon-server";
import { handleDenunciasCerca } from "@/mapa/handle-denuncias-cerca";
import { rpcDenunciasCerca } from "@/mapa/rpc-denuncias-cerca";

export async function GET(request: Request): Promise<Response> {
  return handleDenunciasCerca(request, {
    rpc: (query) => rpcDenunciasCerca(createAnonServerClient(), query),
  });
}
