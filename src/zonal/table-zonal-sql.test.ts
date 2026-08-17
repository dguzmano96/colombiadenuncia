import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260817000000_exploracion_zonal.sql",
  "utf8",
);

describe("contrato SQL de HU-012", () => {
  it("incorpora el snapshot oficial y valida su integridad", () => {
    expect(migration).toContain("MGN-2024");
    expect(migration).toContain("FeatureServer/317");
    expect(migration).toContain("b50eff977078105b3cf3bd51e339ec613a5f6aaa924b118b0fad0fa963b5366b");
    expect(migration).toContain(
      "select count(*) from public.zonas_administrativas) <> 1121",
    );
    expect(migration).toContain("st_isvalid(geometria)");
    expect((migration.match(/insert into public\.zonas_administrativas/g) ?? []).length).toBe(
      1121,
    );
  });

  it("expone solo el contrato mínimo y observa zonas no asignadas", () => {
    expect(migration).toContain(
      "create or replace view public.denuncias_publicas_zonales",
    );
    expect(migration).toContain(
      "select z.departamento, z.municipio, count(um.denuncia_id)::integer as cantidad",
    );
    expect(migration).toContain("d.estado = 'publicada'");
    expect(migration).toContain("denuncias_publicadas_sin_zona");
    expect(migration).toContain("grant select on public.denuncias_publicas_zonales to anon");
    expect(migration).toContain(
      "revoke all on view public.denuncias_publicadas_sin_zona from public, anon, authenticated",
    );
  });
});
