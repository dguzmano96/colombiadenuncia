import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DenunciaInsertRow, PublishStorage } from "@/sync/publish-denuncia";

export const EVIDENCIAS_BUCKET = "evidencias";

export function createAnonServerClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * IMPORTANTE (causa raíz histórica del bug "las denuncias no se guardan"):
 * el rol `anon` solo tiene policy RLS de INSERT sobre `public.denuncias`
 * (ver supabase/migrations/20260816120000_denuncias_postgis_rls_storage.sql),
 * a propósito, para no exponer SELECT de la tabla base (el feed público usa
 * la vista `denuncias_publicas`, que corre con los privilegios del owner).
 * Si aquí se encadena `.select().single()` tras el insert, PostgREST pide el
 * INSERT ... RETURNING, que internamente exige una policy de SELECT para
 * poder devolver la fila nueva. Sin esa policy, Postgres responde 42501
 * ("new row violates row-level security policy") y el insert completo se
 * revierte, aunque el WITH CHECK del INSERT sea válido. Por eso NUNCA se
 * debe usar `.select()` después de `insert()` en esta tabla: generamos el
 * id acá mismo (server) y lo insertamos explícito, así no hace falta pedir
 * representación de vuelta y no se requiere ampliar RLS.
 */
export function createPublishStorage(client: SupabaseClient): PublishStorage {
  return {
    async upload(path, bytes, mime) {
      try {
        const { error } = await client.storage
          .from(EVIDENCIAS_BUCKET)
          .upload(path, bytes, { contentType: mime, upsert: false });
        if (error) {
          const errObj = error as unknown as { statusCode?: string | number };
          const rawStatus = errObj?.statusCode;
          const status =
            typeof rawStatus === "string"
              ? Number(rawStatus)
              : typeof rawStatus === "number"
                ? rawStatus
                : 502;
          return {
            ok: false,
            status: Number.isFinite(status) ? status : 502,
            detail: error.message,
          };
        }
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          status: 502,
          detail: err instanceof Error ? err.message : "Fallo de red en Storage.",
        };
      }
    },
    async insert(row: DenunciaInsertRow) {
      const id = crypto.randomUUID();
      try {
        // Sin .select(): insert-only no necesita policy de SELECT (ver nota arriba).
        const { error } = await client.from("denuncias").insert({ id, ...row });
        if (error) {
          return { ok: false, detail: error.message };
        }
        return { ok: true, id };
      } catch (err) {
        return {
          ok: false,
          detail: err instanceof Error ? err.message : "Fallo de red en Supabase.",
        };
      }
    },
    async remove(path) {
      try {
        await client.storage.from(EVIDENCIAS_BUCKET).remove([path]);
      } catch {
        // Ignorar fallo de borrado de evidencia huérfana: anon no tiene
        // policy de DELETE en storage.objects (a propósito, ver migración).
      }
    },
  };
}
