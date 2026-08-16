import { describe, expect, it, vi } from "vitest";
import { requestCurrentPosition } from "./request-current-position";

describe("requestCurrentPosition", () => {
  it("redondea coordenadas GPS a 5 decimales", async () => {
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (ok: PositionCallback) => {
          ok({
            coords: {
              latitude: 4.60971444,
              longitude: -74.08175444,
              accuracy: 10,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            },
            timestamp: Date.now(),
          } as GeolocationPosition);
        },
      },
    });
    const result = await requestCurrentPosition();
    expect(result).toEqual({
      ok: true,
      point: { lat: 4.60971, lon: -74.08175 },
    });
    vi.unstubAllGlobals();
  });
});
