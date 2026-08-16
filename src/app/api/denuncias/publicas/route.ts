import { createAnonServerClient } from "@/lib/supabase/anon-server";
import { handlePublicDenuncias } from "@/mapa/handle-public-denuncias";
import { listPublicDenuncias } from "@/mapa/list-public-denuncias";

export async function GET(): Promise<Response> {
  try {
    const client = createAnonServerClient();
    return await handlePublicDenuncias({
      list: () => listPublicDenuncias(client),
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "server_misconfigured",
        message:
          err instanceof Error
            ? err.message
            : "Faltan variables de entorno de Supabase en el servidor.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
