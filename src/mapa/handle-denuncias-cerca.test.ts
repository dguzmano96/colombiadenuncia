import { describe, expect, it, vi } from "vitest";
import { handleDenunciasCerca } from "./handle-denuncias-cerca";
import type { CercaRow } from "./cerca-params";

const near: CercaRow = {
  id: "in-800",
  lat: 4.6169,
  long: -74.08175,
  dist_meters: 800,
  categoria: "acaparamiento",
};

function req(qs: string): Request {
  return new Request(`http://localhost/api/denuncias/cerca?${qs}`);
}

describe("handleDenunciasCerca", () => {
  it("BDD: 800 m entra y 5 km no — el RPC (no haversine cliente) decide", async () => {
    const rpc = vi.fn().mockResolvedValue([near]);
    const response = await handleDenunciasCerca(
      req("lat=4.60971&long=-74.08175&dist_m=2000"),
      { rpc },
    );
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith({
      origin: { lat: 4.60971, lon: -74.08175 },
      dist_m: 2000,
    });
    const body = (await response.json()) as { ok: boolean; items: CercaRow[] };
    expect(body.ok).toBe(true);
    expect(body.items.map((i) => i.id)).toEqual(["in-800"]);
    expect(body.items.some((i) => i.id === "out-5km")).toBe(false);
  });

  it("recorta dist_m > 20000 antes de llamar el RPC", async () => {
    const rpc = vi.fn().mockResolvedValue([]);
    await handleDenunciasCerca(req("lat=4.6&long=-74&dist_m=50000"), { rpc });
    expect(rpc).toHaveBeenCalledWith({
      origin: { lat: 4.6, lon: -74 },
      dist_m: 20_000,
    });
  });

  it("0 resultados → lista vacía 200", async () => {
    const response = await handleDenunciasCerca(
      req("lat=4.6&long=-74"),
      { rpc: async () => [] },
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { items: unknown[] };
    expect(body.items).toEqual([]);
  });

  it("PostGIS down → 502 controlado sin inventar filas", async () => {
    const response = await handleDenunciasCerca(req("lat=4.6&long=-74"), {
      rpc: async () => {
        throw new Error("postgis down");
      },
    });
    expect(response.status).toBe(502);
    const body = (await response.json()) as {
      error: string;
      items: unknown[];
    };
    expect(body.error).toBe("cerca_unavailable");
    expect(body.items).toEqual([]);
  });
});
