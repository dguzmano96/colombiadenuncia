import { describe, expect, it, beforeEach } from "vitest";
import { GET } from "./route";

describe("GET /api/denuncias/publicas", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it("devuelve 500 server_misconfigured si faltan variables de Supabase", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const response = await GET();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("server_misconfigured");
  });
});
