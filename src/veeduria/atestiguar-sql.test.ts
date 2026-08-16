import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("contrato SQL atestiguos", () => {
  const sql = read("supabase/migrations/20260816210000_atestiguos_rpc.sql");

  it("tabla sin PII y unique device por denuncia", () => {
    const table = sql.slice(
      sql.indexOf("create table if not exists public.atestiguos"),
      sql.indexOf("alter table public.atestiguos"),
    );
    expect(table).toMatch(/device_id uuid not null/);
    expect(table).toMatch(/unique \(denuncia_id, device_id\)/);
    expect(table).not.toMatch(/nombre|email|telefono|teléfono|contacto/i);
    expect(sql).toMatch(/enable row level security/);
    expect(sql).toMatch(/revoke all on table public\.atestiguos/);
  });

  it("RPC ST_DWithin 500 m, trust S-10, grant anon execute", () => {
    expect(sql).toMatch(/atestiguar_denuncia\(/);
    expect(sql).toMatch(/st_dwithin/i);
    expect(sql).toMatch(/,\s*500\s*\)/);
    expect(sql).toMatch(/st_point\(p_lon, p_lat\)/i);
    expect(sql).toMatch(/trust_score = \(d\.atestiguos_validos \+ 1\) - \(2 \* d\.reportes_falsedad\)/);
    expect(sql).toMatch(/fuera_de_radio/);
    expect(sql).toMatch(/duplicado/);
    expect(sql).toMatch(/grant execute[\s\S]*to anon/);
    expect(sql).not.toMatch(/SERVICE_ROLE/);
    expect(sql).not.toMatch(/cuarentena/);
  });
});
