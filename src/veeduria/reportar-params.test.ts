import { describe, expect, it } from "vitest";
import {
  expectedTrustScore,
  parseReportarBody,
  shouldEnterCuarentena,
} from "./reportar-params";

const valid = {
  turnstileToken: "tok",
  denunciaId: "11111111-1111-4111-8111-111111111111",
  deviceId: "22222222-2222-4222-8222-222222222222",
  tipo: "contenido_falso" as const,
};

describe("parseReportarBody", () => {
  it("acepta tipo estructurado spam | difamacion | contenido_falso", () => {
    expect(parseReportarBody(valid)).toEqual(valid);
    expect(parseReportarBody({ ...valid, tipo: "spam" })).toMatchObject({
      tipo: "spam",
    });
    expect(parseReportarBody({ ...valid, tipo: "difamacion" })).toMatchObject({
      tipo: "difamacion",
    });
  });

  it("rechaza tipo libre o relato como confirmación", () => {
    expect(parseReportarBody({ ...valid, tipo: "esto es mentira" })).toBeNull();
    expect(parseReportarBody({ ...valid, tipo: "relato falso" })).toBeNull();
  });

  it("ignora PII extra y rechaza device no UUID", () => {
    expect(
      parseReportarBody({ ...valid, nombre: "Ana", email: "a@b.c" }),
    ).toEqual(valid);
    expect(parseReportarBody({ ...valid, deviceId: "telefono-123" })).toBeNull();
  });
});

describe("expectedTrustScore S-10", () => {
  it("atestiguos_validos - 2 * reportes_falsedad (enteros)", () => {
    expect(expectedTrustScore(0, 0)).toBe(0);
    expect(expectedTrustScore(0, 1)).toBe(-2);
    expect(expectedTrustScore(3, 1)).toBe(1);
    expect(expectedTrustScore(0, 3)).toBe(-6);
  });
});

describe("shouldEnterCuarentena S-10", () => {
  it("no cuarentena con 1 reporte y 0 atestiguos (trust -2)", () => {
    expect(shouldEnterCuarentena(1, expectedTrustScore(0, 1))).toBe(false);
  });

  it("cuarentena si reportes_falsedad >= 3 aunque trust sea positivo", () => {
    expect(shouldEnterCuarentena(3, expectedTrustScore(10, 3))).toBe(true);
  });

  it("cuarentena si trust_score <= -3", () => {
    expect(shouldEnterCuarentena(2, expectedTrustScore(0, 2))).toBe(true);
  });
});
