import { beforeEach, describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/denuncias/tabla-zonal", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it("devuelve 500 controlado si faltan variables de Supabase", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const response = await GET(
      new Request("http://localhost/api/denuncias/tabla-zonal"),
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: "server_misconfigured",
      filas: [],
    });
  });
});
