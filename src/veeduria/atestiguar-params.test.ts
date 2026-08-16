import { describe, expect, it } from "vitest";
import {
  ATESTIGUAR_RADIO_M,
  expectedTrustScore,
  parseAtestiguarBody,
} from "./atestiguar-params";

const valid = {
  turnstileToken: "tok",
  denunciaId: "11111111-1111-4111-8111-111111111111",
  deviceId: "22222222-2222-4222-8222-222222222222",
  lat: 4.6,
  lon: -74.08,
};

describe("parseAtestiguarBody", () => {
  it("acepta payload estructurado con UUIDs y geo", () => {
    expect(parseAtestiguarBody(valid)).toEqual(valid);
  });

  it("rechaza PII extra como contrato de parseo (ignora nombre)", () => {
    expect(
      parseAtestiguarBody({ ...valid, nombre: "Ana", email: "a@b.c" }),
    ).toEqual(valid);
  });

  it("rechaza device_id no UUID", () => {
    expect(parseAtestiguarBody({ ...valid, deviceId: "telefono-123" })).toBeNull();
  });
});

describe("expectedTrustScore S-10", () => {
  it("atestiguos_validos - 2 * reportes_falsedad", () => {
    expect(expectedTrustScore(1, 0)).toBe(1);
    expect(expectedTrustScore(3, 1)).toBe(1);
    expect(ATESTIGUAR_RADIO_M).toBe(500);
  });
});
