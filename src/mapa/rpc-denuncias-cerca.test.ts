import { describe, expect, it, vi } from "vitest";
import { CERCA_RPC_NAME } from "./cerca-params";
import { rpcDenunciasCerca } from "./rpc-denuncias-cerca";

describe("rpcDenunciasCerca", () => {
  it("llama rpc denuncias_cerca con lat, long y dist_m (anon client)", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          id: "in-800",
          lat: 4.6169,
          long: -74.08175,
          dist_meters: 800,
          categoria: "acaparamiento",
        },
      ],
      error: null,
    });
    const items = await rpcDenunciasCerca(
      { rpc } as never,
      { origin: { lat: 4.60971, lon: -74.08175 }, dist_m: 2000 },
    );
    expect(rpc).toHaveBeenCalledWith(CERCA_RPC_NAME, {
      lat: 4.60971,
      long: -74.08175,
      dist_m: 2000,
    });
    expect(items).toEqual([
      {
        id: "in-800",
        lat: 4.6169,
        long: -74.08175,
        dist_meters: 800,
        categoria: "acaparamiento",
      },
    ]);
  });

  it("propaga error de PostGIS/RPC", async () => {
    await expect(
      rpcDenunciasCerca(
        { rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "down" } }) } as never,
        { origin: { lat: 4.6, lon: -74 }, dist_m: 2000 },
      ),
    ).rejects.toThrow("down");
  });
});
