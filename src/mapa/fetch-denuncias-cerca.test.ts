import { describe, expect, it, vi } from "vitest";
import {
  CERCA_API_PATH,
  CERCA_EMPTY_MESSAGE,
  CERCA_ERROR_MESSAGE,
  cercaRequestUrl,
  fetchDenunciasCerca,
} from "./fetch-denuncias-cerca";

describe("fetchDenunciasCerca", () => {
  it("GET al Route Handler con lat, long y dist_m (no service role)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        items: [
          {
            id: "a",
            lat: 4.6,
            long: -74,
            dist_meters: 100,
            categoria: "reventa",
          },
        ],
      }),
    });
    const result = await fetchDenunciasCerca(
      { origin: { lat: 4.6, lon: -74 }, dist_m: 2000 },
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    expect(fetchImpl).toHaveBeenCalledWith(
      `${CERCA_API_PATH}?lat=4.6&long=-74&dist_m=2000`,
    );
    expect(result).toEqual({
      ok: true,
      items: [
        {
          id: "a",
          lat: 4.6,
          long: -74,
          dist_meters: 100,
          categoria: "reventa",
        },
      ],
    });
  });

  it("error de red o 502 → mensaje controlado", async () => {
    const result = await fetchDenunciasCerca(
      { origin: { lat: 4.6, lon: -74 }, dist_m: 2000 },
      {
        fetchImpl: async () => {
          throw new Error("offline");
        },
      },
    );
    expect(result).toEqual({ ok: false, error: CERCA_ERROR_MESSAGE });
  });

  it("arma URL de contrato", () => {
    expect(
      cercaRequestUrl({ origin: { lat: 1, lon: 2 }, dist_m: 2000 }),
    ).toContain("long=2");
    expect(CERCA_EMPTY_MESSAGE).toMatch(/no hay denuncias/i);
  });
});
