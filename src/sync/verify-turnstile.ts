export const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type SiteverifyResult = {
  success: boolean;
  "error-codes"?: string[];
};

export async function verifyTurnstileToken(
  token: string,
  secret: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SiteverifyResult> {
  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);

  try {
    const response = await fetchImpl(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await response.json()) as SiteverifyResult;
    return {
      success: data.success === true,
      "error-codes": data["error-codes"],
    };
  } catch {
    return { success: false, "error-codes": ["internal-error"] };
  }
}

export function isTimeoutOrDuplicate(result: SiteverifyResult): boolean {
  return (result["error-codes"] ?? []).includes("timeout-or-duplicate");
}
