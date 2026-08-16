import { expectedTrustScore, isUuid } from "./atestiguar-params";

export const REPORTAR_RPC_NAME = "reportar_denuncia";
export const REPORTAR_PATH = "/api/reportes";

export const REPORTAR_TIPOS = [
  "spam",
  "difamacion",
  "contenido_falso",
] as const;

export type ReportarTipo = (typeof REPORTAR_TIPOS)[number];

export type ReportarBody = {
  turnstileToken: string;
  denunciaId: string;
  deviceId: string;
  tipo: ReportarTipo;
};

export type ReportarCounts = {
  atestiguos_validos: number;
  reportes_falsedad: number;
  trust_score: number;
  estado: "publicada" | "cuarentena";
};

export function isReportarTipo(value: unknown): value is ReportarTipo {
  return (
    typeof value === "string" &&
    (REPORTAR_TIPOS as readonly string[]).includes(value)
  );
}

export function parseReportarBody(raw: unknown): ReportarBody | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const turnstileToken =
    typeof rec.turnstileToken === "string" ? rec.turnstileToken.trim() : "";
  const denunciaId =
    typeof rec.denunciaId === "string" ? rec.denunciaId.trim() : "";
  const deviceId = typeof rec.deviceId === "string" ? rec.deviceId.trim() : "";
  if (!turnstileToken || !isUuid(denunciaId) || !isUuid(deviceId)) {
    return null;
  }
  if (!isReportarTipo(rec.tipo)) {
    return null;
  }
  return { turnstileToken, denunciaId, deviceId, tipo: rec.tipo };
}

export function shouldEnterCuarentena(
  reportesFalsedad: number,
  trustScore: number,
): boolean {
  return reportesFalsedad >= 3 || trustScore <= -3;
}

export { expectedTrustScore };
