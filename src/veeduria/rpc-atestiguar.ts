import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ATESTIGUAR_RPC_NAME,
  type AtestiguarCounts,
} from "./atestiguar-params";

export type AtestiguarRpcResult =
  | { ok: true; counts: AtestiguarCounts }
  | { ok: false; error: "fuera_de_radio" | "duplicado" | "rpc_failed"; detail?: string };

function isCounts(value: unknown): value is AtestiguarCounts {
  if (!value || typeof value !== "object") return false;
  const rec = value as Record<string, unknown>;
  return (
    typeof rec.atestiguos_validos === "number" &&
    typeof rec.reportes_falsedad === "number" &&
    typeof rec.trust_score === "number"
  );
}

function classifyRpcError(message: string, code?: string): AtestiguarRpcResult {
  const blob = `${code ?? ""} ${message}`.toLowerCase();
  if (blob.includes("fuera_de_radio") || code === "P0001") {
    return { ok: false, error: "fuera_de_radio", detail: message };
  }
  if (blob.includes("duplicado") || code === "23505") {
    return { ok: false, error: "duplicado", detail: message };
  }
  return { ok: false, error: "rpc_failed", detail: message };
}

export async function rpcAtestiguarDenuncia(
  client: SupabaseClient,
  input: {
    denunciaId: string;
    deviceId: string;
    lat: number;
    lon: number;
  },
): Promise<AtestiguarRpcResult> {
  const { data, error } = await client.rpc(ATESTIGUAR_RPC_NAME, {
    p_denuncia_id: input.denunciaId,
    p_device_id: input.deviceId,
    p_lat: input.lat,
    p_lon: input.lon,
  });
  if (error) {
    return classifyRpcError(error.message, error.code);
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!isCounts(row)) {
    return { ok: false, error: "rpc_failed", detail: "respuesta RPC inválida" };
  }
  return { ok: true, counts: row };
}
