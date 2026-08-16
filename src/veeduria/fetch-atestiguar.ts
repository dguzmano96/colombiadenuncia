import {
  ATESTIGUAR_PATH,
  type AtestiguarBody,
  type AtestiguarCounts,
} from "./atestiguar-params";

export type FetchAtestiguarResult =
  | { ok: true; counts: AtestiguarCounts }
  | { ok: false; error: string; message?: string };

export async function postAtestiguo(
  body: AtestiguarBody,
  fetchImpl: typeof fetch = fetch,
): Promise<FetchAtestiguarResult> {
  try {
    const response = await fetchImpl(ATESTIGUAR_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => null)) as {
      ok?: unknown;
      error?: unknown;
      message?: unknown;
      counts?: AtestiguarCounts;
    } | null;
    if (
      response.ok &&
      data?.ok === true &&
      data.counts &&
      typeof data.counts.atestiguos_validos === "number"
    ) {
      return { ok: true, counts: data.counts };
    }
    return {
      ok: false,
      error: typeof data?.error === "string" ? data.error : "atestiguar_failed",
      message: typeof data?.message === "string" ? data.message : undefined,
    };
  } catch {
    return { ok: false, error: "network" };
  }
}
