import { describe, expect, it, vi } from "vitest";
import { postReporte } from "./fetch-reportar";
import { REPORTAR_PATH } from "./reportar-params";

const body = {
  turnstileToken: "t",
  denunciaId: "11111111-1111-4111-8111-111111111111",
  deviceId: "22222222-2222-4222-8222-222222222222",
  tipo: "spam" as const,
};

describe("postReporte", () => {
  it("POST al path de reportes y lee conteos", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          counts: {
            atestiguos_validos: 0,
            reportes_falsedad: 1,
            trust_score: -2,
            estado: "publicada",
          },
        }),
        { status: 200 },
      ),
    );
    const result = await postReporte(body, fetchImpl);
    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      REPORTAR_PATH,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("409 duplicado no se interpreta como éxito", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: "duplicado" }), {
        status: 409,
      }),
    );
    const result = await postReporte(body, fetchImpl);
    expect(result).toMatchObject({ ok: false, error: "duplicado" });
  });
});
