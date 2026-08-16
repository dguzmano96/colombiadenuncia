import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CAPTURA_PATH,
  MAPA_PATH,
  OFFLINE_FALLBACK_PATH,
  PUBLIC_GEOJSON_PATH,
} from "./precache";

describe("Serwist precache (HU-003 / HU-005)", () => {
  it("expone captura y fallback /~offline", () => {
    expect(CAPTURA_PATH).toBe("/");
    expect(OFFLINE_FALLBACK_PATH).toBe("/~offline");
  });

  it("expone mapa y GeoJSON público", () => {
    expect(PUBLIC_GEOJSON_PATH).toBe("/api/denuncias/publicas");
    expect(MAPA_PATH).toBe("/mapa");
  });

  it("configura withSerwistInit, swDest y fallback de navegación", () => {
    const nextConfig = readFileSync("next.config.ts", "utf8");
    expect(nextConfig).toMatch(/withSerwistInit/);
    expect(nextConfig).toMatch(/swDest:\s*"public\/sw\.js"/);
    expect(nextConfig).toContain("OFFLINE_FALLBACK_PATH");
    expect(nextConfig).toContain("CAPTURA_PATH");

    const sw = readFileSync("src/app/sw.ts", "utf8");
    expect(sw).toMatch(/defaultCache/);
    expect(sw).toMatch(/OFFLINE_FALLBACK_PATH/);
    expect(sw).toMatch(/request\.destination === "document"/);
    expect(sw).toMatch(/StaleWhileRevalidate/);
    expect(sw).toMatch(/PUBLIC_GEOJSON_PATH/);
    expect(sw).toMatch(/GEOJSON_CACHE_NAME/);
  });

  it("no añade react-leaflet y pinnea Leaflet 1.9.4", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies.leaflet).toBe("1.9.4");
    expect(pkg.dependencies["react-leaflet"]).toBeUndefined();
  });
});
