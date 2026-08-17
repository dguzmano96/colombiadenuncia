import { createAnonServerClient } from "@/lib/supabase/anon-server";
import { handleTablaZonal } from "@/zonal/handle-table-zonal";
import { listTablaZonal } from "@/zonal/list-table-zonal";
import { parseConsultaTablaZonal } from "@/zonal/table-zonal";

export async function GET(request: Request): Promise<Response> {
  const consulta = parseConsultaTablaZonal(request.url);
  try {
    const client = createAnonServerClient();
    return await handleTablaZonal({
      list: (nextConsulta) => listTablaZonal(client, nextConsulta),
    }, consulta);
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "server_misconfigured",
        filas: [],
        message:
          error instanceof Error
            ? error.message
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
