import { describe, expect, it } from "vitest";
import {
  createDenunciaLocal,
  validateDenunciaInput,
} from "./denuncia";
import { toGeoPoint } from "./geo";

const relatoOk =
  "Hay acaparamiento de kits de alimentos en un punto de acopio del barrio.";
const geoOk = toGeoPoint(4.60971, -74.08175);

describe("validateDenunciaInput", () => {
  it("acepta categoría, relato 20–1000, geo y descargo", () => {
    const result = validateDenunciaInput({
      categoria: "acaparamiento",
      relato: relatoOk,
      geo: geoOk,
      descargoAceptado: true,
    });
    expect(result.ok).toBe(true);
  });

  it("rechaza relato menor a 20 caracteres", () => {
    const result = validateDenunciaInput({
      categoria: "reventa",
      relato: "muy corto",
      geo: geoOk,
      descargoAceptado: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.field === "relato")).toBe(true);
      expect(result.issues.find((i) => i.field === "relato")?.message).toMatch(
        /mínimo 20/,
      );
    }
  });

  it("rechaza sin descargo legal", () => {
    const result = validateDenunciaInput({
      categoria: "desvío",
      relato: relatoOk,
      geo: geoOk,
      descargoAceptado: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.field === "descargo")).toBe(true);
    }
  });

  it("rechaza sin geopunto", () => {
    const result = validateDenunciaInput({
      categoria: "otro",
      relato: relatoOk,
      geo: null,
      descargoAceptado: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.field === "geo")).toBe(true);
    }
  });

  it("rechaza categoría fuera del enumerado", () => {
    const result = validateDenunciaInput({
      categoria: "fraude",
      relato: relatoOk,
      geo: geoOk,
      descargoAceptado: true,
    });
    expect(result.ok).toBe(false);
  });
});

describe("createDenunciaLocal", () => {
  it("happy path: UUID local, coords 5 decimales y pendiente_sync", () => {
    const result = createDenunciaLocal(
      {
        categoria: "acaparamiento",
        relato: relatoOk,
        geo: geoOk,
        descargoAceptado: true,
      },
      () => "11111111-1111-4111-8111-111111111111",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.denuncia.id).toBe("11111111-1111-4111-8111-111111111111");
      expect(result.denuncia.lat).toBe(4.60971);
      expect(result.denuncia.lon).toBe(-74.08175);
      expect(result.denuncia.estado).toBe("pendiente_sync");
    }
  });

  it("no crea denuncia si el relato tiene 10 caracteres", () => {
    const result = createDenunciaLocal({
      categoria: "acaparamiento",
      relato: "1234567890",
      geo: geoOk,
      descargoAceptado: true,
    });
    expect(result.ok).toBe(false);
  });
});
