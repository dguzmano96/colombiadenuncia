import { describe, expect, it, vi } from "vitest";
import { SITEVERIFY_URL, verifyTurnstileToken } from "./verify-turnstile";

describe("verifyTurnstileToken", () => {
  it("POSTea secret+response a Siteverify y exige success true", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      json: async () => ({ success: true }),
    });
    const result = await verifyTurnstileToken("tok", "sec", fetchImpl);
    expect(result.success).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      SITEVERIFY_URL,
      expect.objectContaining({ method: "POST" }),
    );
    const body = fetchImpl.mock.calls[0][1].body as URLSearchParams;
    expect(body.get("secret")).toBe("sec");
    expect(body.get("response")).toBe("tok");
  });

  it("success false si Siteverify rechaza", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      json: async () => ({
        success: false,
        "error-codes": ["timeout-or-duplicate"],
      }),
    });
    const result = await verifyTurnstileToken("old", "sec", fetchImpl);
    expect(result.success).toBe(false);
    expect(result["error-codes"]).toContain("timeout-or-duplicate");
  });
});
