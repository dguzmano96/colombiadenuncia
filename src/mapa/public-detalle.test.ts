import { describe, expect, it } from "vitest";
import { DESCARGO_LEGAL } from "@/domain/denuncia";
import {
  detalleHasDeniedPii,
  toPublicDetalle,
  YA_NO_ESTA_PUBLICO,
} from "./public-detalle";
import type { PublicDenunciaRow } from "./public-geojson";

const row: PublicDenunciaRow = {
  id: "d1",
  categoria: "reventa",
  lon: -74,
  lat: 4.6,
  trust_score: 3,
  atestiguos_validos: 5,
  reportes_falsedad: 1,
  photo_path: "foto.webp",
  estado: "publicada",
  relato: "Vi reventa de kits de alimentos en la esquina del barrio.",
};

describe("toPublicDetalle", () => {
  it("expone categoría, relato completo, trust y conteos, sin PII", () => {
    const detalle = toPublicDetalle(row, "https://example.supabase.co");
    expect(detalle).toMatchObject({
      id: "d1",
      categoria: "reventa",
      relato: row.relato,
      trust_score: 3,
      atestiguos_validos: 5,
      reportes_falsedad: 1,
    });
    expect(detalle?.photo_url).toContain("/evidencias/foto.webp");
    expect(detalleHasDeniedPii(detalle)).toBe(false);
    expect(JSON.stringify(detalle)).not.toMatch(
      /user_agent|user-agent|"ip"|device_id|deviceId/i,
    );
  });

  it("omite cuarentena y no copia campos de identidad", () => {
    expect(
      toPublicDetalle({ ...row, estado: "cuarentena" }),
    ).toBeNull();
    const extra = {
      ...row,
      ip: "1.2.3.4",
      user_agent: "Mozilla",
      device_id: "abc",
    } as PublicDenunciaRow & {
      ip: string;
      user_agent: string;
      device_id: string;
    };
    const detalle = toPublicDetalle(extra);
    expect(detalle).not.toBeNull();
    expect(detalleHasDeniedPii(detalle)).toBe(false);
    expect(detalle).not.toHaveProperty("ip");
    expect(detalle).not.toHaveProperty("user_agent");
    expect(detalle).not.toHaveProperty("device_id");
  });

  it("mantiene el copy de descargo y el mensaje de no público en dominio", () => {
    expect(DESCARGO_LEGAL).toMatch(/no constituye denuncia penal/i);
    expect(YA_NO_ESTA_PUBLICO).toBe("ya no está público");
  });
});
