import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CAPTURA_PATH, OFFLINE_FALLBACK_PATH } from "./precache";

describe("Serwist precache (HU-003)", () => {
  it("expone captura y fallback /~offline", () => {
    expect(CAPTURA_PATH).toBe("/");
    expect(OFFLINE_FALLBACK_PATH).toBe("/~offline");
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
  });
});
