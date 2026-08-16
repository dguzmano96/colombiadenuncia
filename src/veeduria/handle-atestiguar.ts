import {
  isTimeoutOrDuplicate,
  verifyTurnstileToken,
  type SiteverifyResult,
} from "@/sync/verify-turnstile";
import { parseAtestiguarBody, type AtestiguarCounts } from "./atestiguar-params";
import type { AtestiguarRpcResult } from "./rpc-atestiguar";

export type AtestiguarHandlerDeps = {
  turnstileSecret: string;
  verify: typeof verifyTurnstileToken;
  rpc: (input: {
    denunciaId: string;
    deviceId: string;
    lat: number;
    lon: number;
  }) => Promise<AtestiguarRpcResult>;
};

export type AtestiguarHandlerJson = {
  ok: boolean;
  error?: string;
  errorCodes?: string[];
  message?: string;
  counts?: AtestiguarCounts;
};

function json(body: AtestiguarHandlerJson, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function handleAtestiguar(
  request: Request,
  deps: AtestiguarHandlerDeps,
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

  const body = parseAtestiguarBody(raw);
  if (!body) {
    return json(
      {
        ok: false,
        error: "invalid_payload",
        message: "Payload de atestiguo inválido.",
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
    lat: body.lat,
    lon: body.lon,
  });

  if (!rpcResult.ok) {
    if (rpcResult.error === "fuera_de_radio") {
      return json(
        {
          ok: false,
          error: "fuera_de_radio",
          message: "Fuera del radio de 500 m.",
        },
        403,
      );
    }
    if (rpcResult.error === "duplicado") {
      return json(
        {
          ok: false,
          error: "duplicado",
          message: "Este dispositivo ya atestiguó esta denuncia.",
        },
        409,
      );
    }
    return json(
      {
        ok: false,
        error: "rpc_failed",
        message: rpcResult.detail ?? "No se pudo registrar el atestiguo.",
      },
      502,
    );
  }

  return json({ ok: true, counts: rpcResult.counts }, 200);
}
