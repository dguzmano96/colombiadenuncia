import type { SupabaseClient } from "@supabase/supabase-js";
import { createAnonServerClient, EVIDENCIAS_BUCKET } from "@/lib/supabase/anon-server";
import { handleSyncDenuncia } from "@/sync/handle-sync-denuncia";
import type { DenunciaInsertRow, PublishStorage } from "@/sync/publish-denuncia";
import { verifyTurnstileToken } from "@/sync/verify-turnstile";

function supabaseStorage(client: SupabaseClient): PublishStorage {
  return {
    async upload(path, bytes, mime) {
      const { error } = await client.storage
        .from(EVIDENCIAS_BUCKET)
        .upload(path, bytes, { contentType: mime, upsert: false });
      if (error) {
        const status =
          typeof (error as { statusCode?: string }).statusCode === "string"
            ? Number((error as { statusCode: string }).statusCode)
            : 502;
        return { ok: false, status: Number.isFinite(status) ? status : 502 };
      }
      return { ok: true };
    },
    async insert(row: DenunciaInsertRow) {
      const { data, error } = await client
        .from("denuncias")
        .insert(row)
        .select("id")
        .single();
      if (error || !data?.id) {
        return { ok: false };
      }
      return { ok: true, id: data.id as string };
    },
    async remove(path) {
      await client.storage.from(EVIDENCIAS_BUCKET).remove([path]);
    },
  };
}

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return new Response(
      JSON.stringify({ ok: false, error: "server_misconfigured" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  return handleSyncDenuncia(request, {
    turnstileSecret: secret,
    verify: verifyTurnstileToken,
    storage: supabaseStorage(createAnonServerClient()),
  });
}
