import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("secretos HU-004", () => {
  it("el secreto Turnstile no usa prefijo NEXT_PUBLIC_", () => {
    const route = read("src/app/api/sync/denuncia/route.ts");
    expect(route).toMatch(/TURNSTILE_SECRET_KEY/);
    expect(route).not.toMatch(/NEXT_PUBLIC_TURNSTILE_SECRET/);
    expect(read(".env.example")).not.toMatch(/NEXT_PUBLIC_TURNSTILE_SECRET/);
  });

  it("el browser no carga service role", () => {
    const clientFiles = [
      "src/components/sync/SyncDrain.tsx",
      "src/components/sync/TurnstileWidget.tsx",
      "src/sync/drain-queue.ts",
      "src/app/page.tsx",
      "src/components/mapa/CercaDeMiControl.tsx",
      "src/components/mapa/MapaExplorer.tsx",
      "src/mapa/fetch-denuncias-cerca.ts",
      "src/components/mapa/AtestiguarControl.tsx",
      "src/veeduria/fetch-atestiguar.ts",
      "src/veeduria/device-id.ts",
      "src/components/mapa/ReportarControl.tsx",
      "src/veeduria/fetch-reportar.ts",
    ];
    for (const file of clientFiles) {
      const text = read(file);
      expect(text).not.toMatch(/SERVICE_ROLE/);
      expect(text).not.toMatch(/TURNSTILE_SECRET_KEY/);
    }
    const server = read("src/lib/supabase/anon-server.ts");
    expect(server).toMatch(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
    expect(server).not.toMatch(/SERVICE_ROLE/);
    const cercaRoute = read("src/app/api/denuncias/cerca/route.ts");
    expect(cercaRoute).toMatch(/createAnonServerClient/);
    expect(cercaRoute).not.toMatch(/SERVICE_ROLE/);
    const rpc = read("src/mapa/rpc-denuncias-cerca.ts");
    expect(rpc).toMatch(/\.rpc\(/);
    expect(rpc).not.toMatch(/SERVICE_ROLE/);
    const atestiguarRoute = read("src/app/api/atestiguos/route.ts");
    expect(atestiguarRoute).toMatch(/TURNSTILE_SECRET_KEY/);
    expect(atestiguarRoute).not.toMatch(/NEXT_PUBLIC_TURNSTILE_SECRET/);
    expect(atestiguarRoute).toMatch(/createAnonServerClient/);
    expect(atestiguarRoute).not.toMatch(/SERVICE_ROLE/);
    const atestiguarRpc = read("src/veeduria/rpc-atestiguar.ts");
    expect(atestiguarRpc).toMatch(/\.rpc\(/);
    expect(atestiguarRpc).not.toMatch(/SERVICE_ROLE/);
    const reportarRoute = read("src/app/api/reportes/route.ts");
    expect(reportarRoute).toMatch(/TURNSTILE_SECRET_KEY/);
    expect(reportarRoute).not.toMatch(/NEXT_PUBLIC_TURNSTILE_SECRET/);
    expect(reportarRoute).toMatch(/createAnonServerClient/);
    expect(reportarRoute).not.toMatch(/SERVICE_ROLE/);
    const reportarRpc = read("src/veeduria/rpc-reportar.ts");
    expect(reportarRpc).toMatch(/\.rpc\(/);
    expect(reportarRpc).not.toMatch(/SERVICE_ROLE/);
  });

  it("SQL documenta RLS insert anónimo", () => {
    const sql = read(
      "supabase/migrations/20260816120000_denuncias_postgis_rls_storage.sql",
    );
    expect(sql).toMatch(/denuncias_anon_insert_publicada/);
    expect(sql).toMatch(/to anon/);
    expect(sql).toMatch(/extensions\.geography/);
  });

  it("HU-010 no mete service role ni GRANT UPDATE a anon", () => {
    const sql = read(
      "supabase/migrations/20260816230000_moderacion_studio.sql",
    );
    expect(sql).not.toMatch(/SERVICE_ROLE/);
    expect(sql).toMatch(/revoke select, update, delete/);
    expect(sql).not.toMatch(
      /grant (select|update) on table public\.denuncias/i,
    );
  });
});
