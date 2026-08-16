import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("contrato SQL reportes", () => {
  const sql = read("supabase/migrations/20260816220000_reportes_rpc.sql");
  const view = read("supabase/migrations/20260816160000_denuncias_publicas_view.sql");

  it("tabla sin PII, unique device y tipos estructurados", () => {
    const table = sql.slice(
      sql.indexOf("create table if not exists public.reportes"),
      sql.indexOf("alter table public.reportes"),
    );
    expect(table).toMatch(/device_id uuid not null/);
    expect(table).toMatch(/unique \(denuncia_id, device_id\)/);
    expect(table).toMatch(/'spam', 'difamacion', 'contenido_falso'/);
    expect(table).not.toMatch(/nombre|email|telefono|teléfono|contacto/i);
    expect(sql).toMatch(/enable row level security/);
    expect(sql).toMatch(/revoke all on table public\.reportes/);
  });

  it("RPC trust S-10, umbral cuarentena y grant anon execute", () => {
    expect(sql).toMatch(/reportar_denuncia\(/);
    expect(sql).toMatch(
      /trust_score = d\.atestiguos_validos - \(2 \* \(d\.reportes_falsedad \+ 1\)\)/,
    );
    expect(sql).toMatch(/\(d\.reportes_falsedad \+ 1\) >= 3/);
    expect(sql).toMatch(/<= -3/);
    expect(sql).toMatch(/then 'cuarentena'/);
    expect(sql).toMatch(/duplicado/);
    expect(sql).toMatch(/grant execute[\s\S]*to anon/);
    expect(sql).not.toMatch(/SERVICE_ROLE/);
    expect(sql).not.toMatch(/moderado_at/);
  });

  it("vista pública solo publicada (exclusión GeoJSON)", () => {
    expect(view).toMatch(/where d\.estado = 'publicada'/);
  });
});
