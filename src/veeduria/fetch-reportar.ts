import {
  REPORTAR_PATH,
  type ReportarBody,
  type ReportarCounts,
} from "./reportar-params";

export type FetchReportarResult =
  | { ok: true; counts: ReportarCounts }
  | { ok: false; error: string; message?: string };

export async function postReporte(
  body: ReportarBody,
  fetchImpl: typeof fetch = fetch,
): Promise<FetchReportarResult> {
  try {
    const response = await fetchImpl(REPORTAR_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await response.json().catch(() => null)) as {
      ok?: unknown;
      error?: unknown;
      message?: unknown;
      counts?: ReportarCounts;
    } | null;
    if (
      response.ok &&
      data?.ok === true &&
      data.counts &&
      typeof data.counts.reportes_falsedad === "number" &&
      typeof data.counts.trust_score === "number"
    ) {
      return { ok: true, counts: data.counts };
    }
    return {
      ok: false,
      error: typeof data?.error === "string" ? data.error : "reportar_failed",
      message: typeof data?.message === "string" ? data.message : undefined,
    };
  } catch {
    return { ok: false, error: "network" };
  }
}
