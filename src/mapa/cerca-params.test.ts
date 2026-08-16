import { describe, expect, it } from "vitest";
import {
  CERCA_DEFAULT_DIST_M,
  CERCA_MAX_DIST_M,
  clipDistM,
  parseCercaSearchParams,
} from "./cerca-params";

describe("cerca-params", () => {
  it("usa dist_m default 2000 y acepta lat/long", () => {
    const parsed = parseCercaSearchParams(
      new URLSearchParams("lat=4.60971&long=-74.08175"),
    );
    expect(parsed).toEqual({
      ok: true,
      query: {
        origin: { lat: 4.60971, lon: -74.08175 },
        dist_m: CERCA_DEFAULT_DIST_M,
      },
    });
  });

  it("recorta dist_m mayor a 20000 (NFR-13)", () => {
    const parsed = parseCercaSearchParams(
      new URLSearchParams("lat=4.6&long=-74&dist_m=50000"),
    );
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.query.dist_m).toBe(CERCA_MAX_DIST_M);
    }
    expect(clipDistM(25_000)).toBe(20_000);
  });

  it("rechaza origen inválido y dist negativo", () => {
    expect(parseCercaSearchParams(new URLSearchParams("lat=99&long=-74")).ok).toBe(
      false,
    );
    expect(
      parseCercaSearchParams(new URLSearchParams("lat=4.6&long=-74&dist_m=-1"))
        .ok,
    ).toBe(false);
  });
});
