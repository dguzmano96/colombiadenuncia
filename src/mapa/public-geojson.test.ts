import { describe, expect, it } from "vitest";
import {
  FEATURE_MAX_BYTES,
  toPublicFeatureCollection,
  type PublicDenunciaRow,
} from "./public-geojson";

const publicada: PublicDenunciaRow = {
  id: "a1111111-1111-4111-8111-111111111111",
  categoria: "reventa",
  lon: -74.08,
  lat: 4.61,
  trust_score: 2,
  atestiguos_validos: 2,
  reportes_falsedad: 0,
  photo_path: "foto.webp",
  estado: "publicada",
};

describe("toPublicFeatureCollection", () => {
  it("incluye solo publicada y omite cuarentena y oculta_moderacion", () => {
    const fc = toPublicFeatureCollection([
      publicada,
      { ...publicada, id: "b", estado: "cuarentena" },
      { ...publicada, id: "c", estado: "oculta_moderacion" },
    ]);
    expect(fc.type).toBe("FeatureCollection");
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0]?.properties.id).toBe(publicada.id);
  });

  it("expone props públicas y photo_url, sin PII ni relato largo", () => {
    const longRelato = "x".repeat(3000);
    const fc = toPublicFeatureCollection(
      [
        {
          ...publicada,
          relato: longRelato,
        },
      ],
      "https://example.supabase.co",
    );
    const props = fc.features[0]?.properties;
    expect(props).toMatchObject({
      id: publicada.id,
      categoria: "reventa",
      lon: -74.08,
      lat: 4.61,
      trust_score: 2,
      atestiguos_validos: 2,
      reportes_falsedad: 0,
    });
    expect(props?.photo_url).toContain("/storage/v1/object/public/evidencias/foto.webp");
    expect(JSON.stringify(fc)).not.toContain(longRelato);
    expect(JSON.stringify(props)).not.toMatch(/nombre|documento|tel[eé]fono|email|correo/i);
    const featureBytes = new TextEncoder().encode(
      JSON.stringify(fc.features[0]),
    ).length;
    expect(featureBytes).toBeLessThanOrEqual(FEATURE_MAX_BYTES);
  });

  it("tres publicadas producen tres puntos", () => {
    const fc = toPublicFeatureCollection([
      publicada,
      { ...publicada, id: "p2", lon: -75, lat: 6 },
      { ...publicada, id: "p3", lon: -76, lat: 3 },
    ]);
    expect(fc.features).toHaveLength(3);
  });
});
