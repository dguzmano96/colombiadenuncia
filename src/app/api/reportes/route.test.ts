import { describe, expect, it, beforeEach } from "vitest";
import { POST } from "./route";

describe("POST /api/reportes", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it("500 si falta TURNSTILE_SECRET_KEY", async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    const response = await POST(
      new Request("http://localhost/api/reportes", {
        method: "POST",
        body: "{}",
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("server_misconfigured");
    expect(body.message).toMatch(/TURNSTILE_SECRET_KEY/);
  });
});
