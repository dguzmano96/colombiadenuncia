import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const workflowRel = ".github/workflows/deploy-production.yml";
const guideRel = ".github/deploy-production.md";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("workflow deploy-production", () => {
  const yaml = read(workflowRel);
  const guide = read(guideRel);

  it("dispara en push a main y permite workflow_dispatch", () => {
    expect(yaml).toMatch(/^\s*on:\s*$/m);
    expect(yaml).toMatch(/push:/);
    expect(yaml).toMatch(/branches:\s*\n\s*-\s*main/);
    expect(yaml).toMatch(/workflow_dispatch:/);
  });

  it("usa permisos mínimos y concurrencia de producción", () => {
    expect(yaml).toMatch(/permissions:\s*\n\s*contents:\s*read/);
    expect(yaml).toMatch(/concurrency:/);
    expect(yaml).toMatch(/group:\s*production-deploy/);
    expect(yaml).toMatch(/cancel-in-progress:\s*false/);
    expect(yaml).not.toMatch(/permissions:[\s\S]*write/);
  });

  it("sigue el orden checkout → node → ci → test → lint → build → migrate → vercel", () => {
    const markers = [
      "actions/checkout@",
      "actions/setup-node@",
      "npm ci",
      "npm test",
      "npm run lint",
      "npm run build",
      "supabase@2.114.0 db push",
      "vercel@59.1.3 deploy --prod --yes",
    ];
    let last = -1;
    for (const marker of markers) {
      const idx = yaml.indexOf(marker);
      expect(idx, `falta o desordenado: ${marker}`).toBeGreaterThan(last);
      last = idx;
    }
    expect(yaml).toMatch(/node-version:\s*"20"/);
    expect(yaml).toMatch(/cache:\s*npm/);
    expect(yaml).toMatch(/--db-url "\$SUPABASE_DB_URL"/);
  });

  it("no incrusta secretos, service role ni URLs con credenciales", () => {
    const forbidden = [
      /service[_-]?role/i,
      /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\./,
      /postgres(ql)?:\/\/[^\s]+:[^\s]+@/i,
      /vcp_[A-Za-z0-9]+/,
      /sk_live_/i,
      /SUPABASE_SERVICE_ROLE/,
      /printenv/,
      /set -x/,
      /--debug/,
      /echo\s+\$\{?SUPABASE_DB_URL/,
      /echo\s+\$\{?VERCEL_TOKEN/,
      /--token\s+\$\{\{\s*secrets/,
    ];
    for (const pattern of forbidden) {
      expect(yaml, `patrón prohibido: ${pattern}`).not.toMatch(pattern);
    }
    expect(yaml).toMatch(/secrets\.SUPABASE_DB_URL/);
    expect(yaml).toMatch(/secrets\.VERCEL_TOKEN/);
    expect(yaml).toMatch(/secrets\.VERCEL_ORG_ID/);
    expect(yaml).toMatch(/secrets\.VERCEL_PROJECT_ID/);
    expect(yaml).not.toMatch(/TURNSTILE_SECRET_KEY/);
    expect(yaml).not.toMatch(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it("desactiva auto-deploy de Git en Vercel para no adelantar migraciones", () => {
    const vercelJson = read("vercel.json");
    expect(vercelJson).toMatch(/"deploymentEnabled"\s*:\s*false/);
    expect(guide).toMatch(/deploymentEnabled/);
  });

  it("la guía cubre secrets, orden y rotación sin valores reales", () => {
    expect(guide).toMatch(/SUPABASE_DB_URL/);
    expect(guide).toMatch(/VERCEL_TOKEN/);
    expect(guide).toMatch(/VERCEL_ORG_ID/);
    expect(guide).toMatch(/VERCEL_PROJECT_ID/);
    expect(guide).toMatch(/main/);
    expect(guide).toMatch(/migraciones/);
    expect(guide).toMatch(/workflow_dispatch/);
    expect(guide).toMatch(/rotar/i);
    expect(guide).not.toMatch(/postgres(ql)?:\/\/[^\s]+:[^\s]+@/i);
    expect(guide).not.toMatch(/vcp_[A-Za-z0-9]{8,}/);
    expect(guide).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}\./);
  });
});
