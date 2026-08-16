import { describe, expect, it, vi } from "vitest";
import { handleAtestiguar } from "./handle-atestiguar";
import { expectedTrustScore } from "./atestiguar-params";

const payload = {
  turnstileToken: "tok",
  denunciaId: "11111111-1111-4111-8111-111111111111",
  deviceId: "22222222-2222-4222-8222-222222222222",
  lat: 4.601078,
  lon: -74,
};

function req(body: unknown): Request {
  return new Request("http://localhost/api/atestiguos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("handleAtestiguar", () => {
  it("happy path 120 m: Siteverify y RPC incrementan trust S-10", async () => {
    const rpc = vi.fn().mockResolvedValue({
      ok: true,
      counts: { atestiguos_validos: 1, reportes_falsedad: 0, trust_score: 1 },
    });
    const verify = vi.fn().mockResolvedValue({ success: true });
    const response = await handleAtestiguar(req(payload), {
      turnstileSecret: "sec",
      verify,
      rpc,
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      ok: boolean;
      counts: { atestiguos_validos: number; trust_score: number };
    };
    expect(body.ok).toBe(true);
    expect(body.counts.atestiguos_validos).toBe(1);
    expect(body.counts.trust_score).toBe(
      expectedTrustScore(1, 0),
    );
    expect(verify).toHaveBeenCalledWith("tok", "sec");
    expect(rpc).toHaveBeenCalledOnce();
  });

  it("sin token no llama RPC", async () => {
    const rpc = vi.fn();
    const verify = vi.fn();
    const response = await handleAtestiguar(
      req({ ...payload, turnstileToken: "   " }),
      { turnstileSecret: "sec", verify, rpc },
    );
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
    expect(verify).not.toHaveBeenCalled();
  });

  it("Turnstile fail no llama RPC", async () => {
    const rpc = vi.fn();
    const response = await handleAtestiguar(req(payload), {
      turnstileSecret: "sec",
      verify: async () => ({ success: false, "error-codes": ["invalid-input-response"] }),
      rpc,
    });
    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("turnstile_failed");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("servidor rechaza >500 m aunque el cliente habilite", async () => {
    const rpc = vi.fn().mockResolvedValue({ ok: false, error: "fuera_de_radio" });
    const response = await handleAtestiguar(
      req({ ...payload, lat: 4.62 }),
      {
        turnstileSecret: "sec",
        verify: async () => ({ success: true }),
        rpc,
      },
    );
    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("fuera_de_radio");
  });

  it("duplicado device no cambia conteos (409)", async () => {
    const rpc = vi.fn().mockResolvedValue({ ok: false, error: "duplicado" });
    const response = await handleAtestiguar(req(payload), {
      turnstileSecret: "sec",
      verify: async () => ({ success: true }),
      rpc,
    });
    expect(response.status).toBe(409);
    const body = (await response.json()) as { error: string; counts?: unknown };
    expect(body.error).toBe("duplicado");
    expect(body.counts).toBeUndefined();
  });
});
