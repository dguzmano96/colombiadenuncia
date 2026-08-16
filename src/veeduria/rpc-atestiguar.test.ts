import { describe, expect, it, vi } from "vitest";
import { rpcAtestiguarDenuncia } from "./rpc-atestiguar";
import { ATESTIGUAR_RPC_NAME } from "./atestiguar-params";

describe("rpcAtestiguarDenuncia", () => {
  it("mapea unique a duplicado y no inventa conteos", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "duplicado", code: "23505" },
      }),
    };
    const result = await rpcAtestiguarDenuncia(client as never, {
      denunciaId: "11111111-1111-4111-8111-111111111111",
      deviceId: "22222222-2222-4222-8222-222222222222",
      lat: 4.6,
      lon: -74,
    });
    expect(result).toMatchObject({ ok: false, error: "duplicado" });
    expect(client.rpc).toHaveBeenCalledWith(
      ATESTIGUAR_RPC_NAME,
      expect.objectContaining({ p_lat: 4.6, p_lon: -74 }),
    );
  });
});
