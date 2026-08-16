import { describe, expect, it, beforeEach } from "vitest";
import { POST } from "./route";

describe("POST /api/sync/denuncia", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it("devuelve 500 server_misconfigured si falta TURNSTILE_SECRET_KEY", async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    const request = new Request("http://localhost/api/sync/denuncia", {
      method: "POST",
      body: new FormData(),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("server_misconfigured");
    expect(body.message).toMatch(/TURNSTILE_SECRET_KEY/);
  });

  it("devuelve 500 server_misconfigured si falta NEXT_PUBLIC_SUPABASE_URL", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    const request = new Request("http://localhost/api/sync/denuncia", {
      method: "POST",
      body: new FormData(),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("server_misconfigured");
    expect(body.message).toMatch(/supabase/i);
  });
});
