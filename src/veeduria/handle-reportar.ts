import {
  isTimeoutOrDuplicate,
  verifyTurnstileToken,
  type SiteverifyResult,
} from "@/sync/verify-turnstile";
import {
  parseReportarBody,
  type ReportarCounts,
  type ReportarTipo,
} from "./reportar-params";
import type { ReportarRpcResult } from "./rpc-reportar";

export type ReportarHandlerDeps = {
  turnstileSecret: string;
  verify: typeof verifyTurnstileToken;
  rpc: (input: {
    denunciaId: string;
    deviceId: string;
    tipo: ReportarTipo;
  }) => Promise<ReportarRpcResult>;
};

export type ReportarHandlerJson = {
  ok: boolean;
  error?: string;
  errorCodes?: string[];
  message?: string;
  counts?: ReportarCounts;
};

function json(body: ReportarHandlerJson, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function handleReportar(
  request: Request,
  deps: ReportarHandlerDeps,
): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json(
      { ok: false, error: "invalid_payload", message: "JSON inválido." },
      400,
    );
  }

  const body = parseReportarBody(raw);
  if (!body) {
    return json(
      {
        ok: false,
        error: "invalid_payload",
        message: "Payload de reporte inválido.",
      },
      400,
    );
  }

  if (!body.turnstileToken) {
    return json(
      {
        ok: false,
        error: "turnstile_required",
        message: "Token de Turnstile no proporcionado.",
      },
      400,
    );
  }

  const verified: SiteverifyResult = await deps.verify(
    body.turnstileToken,
    deps.turnstileSecret,
  );
  if (verified.success !== true) {
    const isTimeout = isTimeoutOrDuplicate(verified);
    return json(
      {
        ok: false,
        error: isTimeout ? "timeout-or-duplicate" : "turnstile_failed",
        errorCodes: verified["error-codes"],
        message: isTimeout
          ? "El token de verificación expiró o ya fue utilizado."
          : "Fallo en la validación del token de seguridad Turnstile.",
      },
      403,
    );
  }

  const rpcResult = await deps.rpc({
    denunciaId: body.denunciaId,
    deviceId: body.deviceId,
    tipo: body.tipo,
  });

  if (!rpcResult.ok) {
    if (rpcResult.error === "duplicado") {
      return json(
        {
          ok: false,
          error: "duplicado",
          message: "Este dispositivo ya reportó esta denuncia.",
        },
        409,
      );
    }
    if (rpcResult.error === "no_publicada") {
      return json(
        {
          ok: false,
          error: "no_publicada",
          message: "La denuncia ya no está pública.",
        },
        404,
      );
    }
    return json(
      {
        ok: false,
        error: "rpc_failed",
        message: rpcResult.detail ?? "No se pudo registrar el reporte.",
      },
      502,
    );
  }

  return json({ ok: true, counts: rpcResult.counts }, 200);
}
