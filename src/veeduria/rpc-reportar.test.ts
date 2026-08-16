import { describe, expect, it, vi } from "vitest";
import { rpcReportarDenuncia } from "./rpc-reportar";
import { REPORTAR_RPC_NAME } from "./reportar-params";

describe("rpcReportarDenuncia", () => {
  it("mapea unique a duplicado y no inventa conteos", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "duplicado", code: "23505" },
      }),
    };
    const result = await rpcReportarDenuncia(client as never, {
      denunciaId: "11111111-1111-4111-8111-111111111111",
      deviceId: "22222222-2222-4222-8222-222222222222",
      tipo: "spam",
    });
    expect(result).toMatchObject({ ok: false, error: "duplicado" });
    expect(client.rpc).toHaveBeenCalledWith(
      REPORTAR_RPC_NAME,
      expect.objectContaining({ p_tipo: "spam" }),
    );
  });
});
