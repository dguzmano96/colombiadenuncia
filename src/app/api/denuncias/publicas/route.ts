import { createAnonServerClient } from "@/lib/supabase/anon-server";
import { handlePublicDenuncias } from "@/mapa/handle-public-denuncias";
import { listPublicDenuncias } from "@/mapa/list-public-denuncias";

export async function GET(): Promise<Response> {
  return handlePublicDenuncias({
    list: () => listPublicDenuncias(createAnonServerClient()),
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });
}
