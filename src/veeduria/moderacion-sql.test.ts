import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("contrato SQL moderación Studio", () => {
  const sql = read("supabase/migrations/20260816230000_moderacion_studio.sql");
  const base = read(
    "supabase/migrations/20260816120000_denuncias_postgis_rls_storage.sql",
  );
  const viewPublica = read(
    "supabase/migrations/20260816170000_denuncias_publicas_relato.sql",
  );
  const atestiguos = read("supabase/migrations/20260816210000_atestiguos_rpc.sql");
  const reportes = read("supabase/migrations/20260816220000_reportes_rpc.sql");

  it("tabla Studio conserva estado, trust_score, conteos, relato, location", () => {
    expect(base).toMatch(/estado text/);
    expect(base).toMatch(/trust_score/);
    expect(base).toMatch(/atestiguos_validos/);
    expect(base).toMatch(/reportes_falsedad/);
    expect(base).toMatch(/relato text/);
    expect(base).toMatch(/location /);
    expect(sql).toMatch(
      /estado, trust_score, atestiguos_validos, reportes_falsedad, relato, location/,
    );
  });

  it("CHECK permite publicada, cuarentena y oculta_moderacion", () => {
    expect(sql).toMatch(/denuncias_estado_chk/);
    expect(sql).toMatch(
      /estado in \('publicada', 'cuarentena', 'oculta_moderacion'\)/,
    );
  });

  it("auditoría moderado_at / moderado_nota con trigger", () => {
    expect(sql).toMatch(/moderado_at timestamptz/);
    expect(sql).toMatch(/moderado_nota text/);
    expect(sql).toMatch(/denuncias_stamp_moderado/);
    expect(sql).toMatch(/before update of estado, moderado_nota/i);
    expect(sql).toMatch(/new\.moderado_at := now\(\)/i);
  });

  it("RLS: anon sin SELECT/UPDATE en tabla; policy solo publicada", () => {
    expect(sql).toMatch(
      /revoke select, update, delete on table public\.denuncias from public, anon, authenticated/,
    );
    expect(sql).toMatch(/grant insert on table public\.denuncias to anon/);
    expect(sql).toMatch(/denuncias_anon_select_publicada/);
    expect(sql).toMatch(/for select/);
    expect(sql).toMatch(/using \(estado = 'publicada'\)/);
    expect(sql).not.toMatch(/on public\.denuncias\s+for update/i);
    expect(sql).not.toMatch(
      /grant (select|update) on table public\.denuncias/i,
    );
    expect(sql).not.toMatch(/SERVICE_ROLE/);
  });

  it("GeoJSON/vista pública solo publicada; oculta y cuarentena fuera", () => {
    expect(viewPublica).toMatch(/where d\.estado = 'publicada'/);
    expect(sql).not.toMatch(
      /create or replace view public\.denuncias_publicas/i,
    );
  });

  it("vista denuncias_cuarentena documentada y sin GRANT a anon", () => {
    expect(sql).toMatch(/create or replace view public\.denuncias_cuarentena/);
    expect(sql).toMatch(/where d\.estado = 'cuarentena'/);
    expect(sql).not.toMatch(/grant select on [\s\S]*denuncias_cuarentena/i);
  });

  it("overview documenta vista/filtro cuarentena para el operador", () => {
    const overview = read("02-arquitectura/overview.md");
    expect(overview).toMatch(/denuncias_cuarentena/);
    expect(overview).toMatch(/estado = 'cuarentena'/);
    expect(overview).toMatch(/oculta_moderacion/);
    expect(overview).toMatch(/moderado_nota/);
  });

  it("INSERT atestiguos/reportes sigue siendo RPC (grant execute anon)", () => {
    expect(atestiguos).toMatch(/grant execute[\s\S]*to anon/);
    expect(reportes).toMatch(/grant execute[\s\S]*to anon/);
    expect(atestiguos).toMatch(/revoke all on table public\.atestiguos/);
    expect(reportes).toMatch(/revoke all on table public\.reportes/);
  });
});
