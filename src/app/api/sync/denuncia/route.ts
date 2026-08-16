import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createAnonServerClient,
  createPublishStorage,
} from "@/lib/supabase/anon-server";
import { handleSyncDenuncia } from "@/sync/handle-sync-denuncia";
import { verifyTurnstileToken } from "@/sync/verify-turnstile";

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "server_misconfigured",
        message: "Falta configurar TURNSTILE_SECRET_KEY en el servidor.",
      }),
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } },
    );
  }

  let client: SupabaseClient;
  try {
    client = createAnonServerClient();
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
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } },
    );
  }

  return handleSyncDenuncia(request, {
    turnstileSecret: secret,
    verify: verifyTurnstileToken,
    storage: createPublishStorage(client),
  });
}
