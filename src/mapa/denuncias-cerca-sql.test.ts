import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("contrato SQL denuncias_cerca", () => {
  const rpc = read("supabase/migrations/20260816200000_denuncias_cerca_rpc.sql");
  const gist = read(
    "supabase/migrations/20260816120000_denuncias_postgis_rls_storage.sql",
  );
  const explain = read("supabase/tests/denuncias_cerca_explain.sql");

  it("define RPC denuncias_cerca(lat, long, dist_m default 2000) con ST_DWithin", () => {
    expect(rpc).toMatch(/denuncias_cerca\(/);
    expect(rpc).toMatch(/dist_m double precision default 2000/);
    expect(rpc).toMatch(
      /(?:extensions\.)?st_dwithin\(\s*d\.location,\s*(?:extensions\.)?st_point\(denuncias_cerca\.long,\s*denuncias_cerca\.lat\)::(?:extensions\.)?geography/i,
    );
    expect(rpc).toMatch(/estado = 'publicada'/);
    expect(rpc).toMatch(/least\([\s\S]*20000\)/);
    expect(rpc).toMatch(/grant execute[\s\S]*to anon/);
    expect(rpc).not.toMatch(/SERVICE_ROLE/);
  });

  it("reutiliza GIST HU-004 y no crea un segundo índice", () => {
    expect(gist).toMatch(/denuncias_location_gix/);
    expect(gist).toMatch(/using gist \(location\)/i);
    expect(rpc).not.toMatch(/^\s*create index/im);
    expect(rpc).toMatch(/Reutiliza denuncias_location_gix/);
  });

  it("documenta EXPLAIN de laboratorio sin fingir plan de producción", () => {
    expect(explain).toMatch(/NO es evidencia de producción/i);
    expect(explain).toMatch(/denuncias_location_gix/);
    expect(explain).toMatch(/Index Scan|Bitmap Index Scan/);
    expect(explain).toMatch(/800 m/);
  });
});
