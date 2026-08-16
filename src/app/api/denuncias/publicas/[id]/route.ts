import { createAnonServerClient } from "@/lib/supabase/anon-server";
import { handlePublicDenunciaDetalle } from "@/mapa/handle-public-denuncia-detalle";
import { getPublicDenunciaById } from "@/mapa/list-public-denuncias";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handlePublicDenunciaDetalle(id, {
    getById: (denunciaId) =>
      getPublicDenunciaById(createAnonServerClient(), denunciaId),
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });
}
