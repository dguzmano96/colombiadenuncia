import { describe, expect, it, vi } from "vitest";
import { postAtestiguo } from "./fetch-atestiguar";
import { ATESTIGUAR_PATH } from "./atestiguar-params";

const body = {
  turnstileToken: "t",
  denunciaId: "11111111-1111-4111-8111-111111111111",
  deviceId: "22222222-2222-4222-8222-222222222222",
  lat: 4.6,
  lon: -74,
};

describe("postAtestiguo", () => {
  it("POST al path de atestiguos y lee conteos", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          counts: { atestiguos_validos: 2, reportes_falsedad: 0, trust_score: 2 },
        }),
        { status: 200 },
      ),
    );
    const result = await postAtestiguo(body, fetchImpl);
    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      ATESTIGUAR_PATH,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("409 duplicado no se interpreta como éxito", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: "duplicado" }), {
        status: 409,
      }),
    );
    const result = await postAtestiguo(body, fetchImpl);
    expect(result).toMatchObject({ ok: false, error: "duplicado" });
  });
});
