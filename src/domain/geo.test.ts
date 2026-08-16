import { describe, expect, it } from "vitest";
import {
  ATESTIGUAR_RADIO_M,
  distanceMeters,
  isWithinAtestiguarRadio,
  toGeoPoint,
} from "./geo";

describe("toGeoPoint", () => {
  it("redondea lat/lon WGS84 a 5 decimales", () => {
    expect(toGeoPoint(4.6097149, -74.0817549)).toEqual({
      lat: 4.60971,
      lon: -74.08175,
    });
  });
});

describe("distanceMeters / radio atestiguar", () => {
  const geopunto = { lat: 4.6, lon: -74 };

  it("120 m queda dentro del radio 500", () => {
    const near = { lat: 4.601078, lon: -74 };
    const meters = distanceMeters(geopunto, near);
    expect(meters).toBeGreaterThan(100);
    expect(meters).toBeLessThan(140);
    expect(isWithinAtestiguarRadio(meters)).toBe(true);
    expect(ATESTIGUAR_RADIO_M).toBe(500);
  });

  it("1200 m queda fuera del radio", () => {
    const far = { lat: 4.61078, lon: -74 };
    const meters = distanceMeters(geopunto, far);
    expect(Math.round(meters)).toBeGreaterThan(1100);
    expect(isWithinAtestiguarRadio(meters)).toBe(false);
  });
});
