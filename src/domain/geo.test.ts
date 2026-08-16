import { describe, expect, it } from "vitest";
import { toGeoPoint } from "./geo";

describe("toGeoPoint", () => {
  it("redondea lat/lon WGS84 a 5 decimales", () => {
    expect(toGeoPoint(4.6097149, -74.0817549)).toEqual({
      lat: 4.60971,
      lon: -74.08175,
    });
  });
});
