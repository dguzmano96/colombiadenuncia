import type { SupabaseClient } from "@supabase/supabase-js";
import {
  REPORTAR_RPC_NAME,
  type ReportarCounts,
  type ReportarTipo,
} from "./reportar-params";

export type ReportarRpcResult =
  | { ok: true; counts: ReportarCounts }
  | { ok: false; error: "duplicado" | "no_publicada" | "rpc_failed"; detail?: string };

function isCounts(value: unknown): value is ReportarCounts {
  if (!value || typeof value !== "object") return false;
  const rec = value as Record<string, unknown>;
  return (
    typeof rec.atestiguos_validos === "number" &&
    typeof rec.reportes_falsedad === "number" &&
    typeof rec.trust_score === "number" &&
    (rec.estado === "publicada" || rec.estado === "cuarentena")
  );
}

function classifyRpcError(message: string, code?: string): ReportarRpcResult {
  const blob = `${code ?? ""} ${message}`.toLowerCase();
  if (blob.includes("duplicado") || code === "23505") {
    return { ok: false, error: "duplicado", detail: message };
  }
  if (blob.includes("no_publicada") || code === "P0002") {
    return { ok: false, error: "no_publicada", detail: message };
  }
  return { ok: false, error: "rpc_failed", detail: message };
}

export async function rpcReportarDenuncia(
  client: SupabaseClient,
  input: {
    denunciaId: string;
    deviceId: string;
    tipo: ReportarTipo;
  },
): Promise<ReportarRpcResult> {
  const { data, error } = await client.rpc(REPORTAR_RPC_NAME, {
    p_denuncia_id: input.denunciaId,
    p_device_id: input.deviceId,
    p_tipo: input.tipo,
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
