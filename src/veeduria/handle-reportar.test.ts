import { describe, expect, it, vi } from "vitest";
import { handleReportar } from "./handle-reportar";
import { expectedTrustScore, shouldEnterCuarentena } from "./reportar-params";

const payload = {
  turnstileToken: "tok",
  denunciaId: "11111111-1111-4111-8111-111111111111",
  deviceId: "22222222-2222-4222-8222-222222222222",
  tipo: "contenido_falso",
};

function req(body: unknown): Request {
  return new Request("http://localhost/api/reportes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("handleReportar", () => {
  it("happy path: 1 reporte → reportes 1, trust -2, publicada", async () => {
    const rpc = vi.fn().mockResolvedValue({
      ok: true,
      counts: {
        atestiguos_validos: 0,
        reportes_falsedad: 1,
        trust_score: -2,
        estado: "publicada",
      },
    });
    const verify = vi.fn().mockResolvedValue({ success: true });
    const response = await handleReportar(req(payload), {
      turnstileSecret: "sec",
      verify,
      rpc,
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      ok: boolean;
      counts: {
        reportes_falsedad: number;
        trust_score: number;
        estado: string;
      };
    };
    expect(body.ok).toBe(true);
    expect(body.counts.reportes_falsedad).toBe(1);
    expect(body.counts.trust_score).toBe(expectedTrustScore(0, 1));
    expect(body.counts.estado).toBe("publicada");
    expect(verify).toHaveBeenCalledWith("tok", "sec");
    expect(rpc).toHaveBeenCalledOnce();
  });

  it("sin token no llama RPC", async () => {
    const rpc = vi.fn();
    const verify = vi.fn();
    const response = await handleReportar(
      req({ ...payload, turnstileToken: "   " }),
      { turnstileSecret: "sec", verify, rpc },
    );
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
    expect(verify).not.toHaveBeenCalled();
  });

  it("Turnstile fail no llama RPC ni cambia trust", async () => {
    const rpc = vi.fn();
    const response = await handleReportar(req(payload), {
      turnstileSecret: "sec",
      verify: async () => ({
        success: false,
        "error-codes": ["invalid-input-response"],
      }),
      rpc,
    });
    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("turnstile_failed");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("duplicado device no incrementa (409)", async () => {
    const rpc = vi.fn().mockResolvedValue({ ok: false, error: "duplicado" });
    const response = await handleReportar(req(payload), {
      turnstileSecret: "sec",
      verify: async () => ({ success: true }),
      rpc,
    });
    expect(response.status).toBe(409);
    const body = (await response.json()) as { error: string; counts?: unknown };
    expect(body.error).toBe("duplicado");
    expect(body.counts).toBeUndefined();
  });

  it("tercer reporte → cuarentena", async () => {
    const counts = {
      atestiguos_validos: 0,
      reportes_falsedad: 3,
      trust_score: expectedTrustScore(0, 3),
      estado: "cuarentena" as const,
    };
    expect(shouldEnterCuarentena(counts.reportes_falsedad, counts.trust_score)).toBe(
      true,
    );
    const rpc = vi.fn().mockResolvedValue({ ok: true, counts });
    const response = await handleReportar(req(payload), {
      turnstileSecret: "sec",
      verify: async () => ({ success: true }),
      rpc,
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      counts: { estado: string; reportes_falsedad: number };
    };
    expect(body.counts.estado).toBe("cuarentena");
    expect(body.counts.reportes_falsedad).toBe(3);
  });
});
