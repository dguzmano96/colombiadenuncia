import type { CercaQuery, CercaRow } from "./cerca-params";
import { parseCercaSearchParams } from "./cerca-params";

export type RpcDenunciasCerca = (query: CercaQuery) => Promise<CercaRow[]>;

export type CercaHandlerDeps = {
  rpc: RpcDenunciasCerca;
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function handleDenunciasCerca(
  request: Request,
  deps: CercaHandlerDeps,
): Promise<Response> {
  const url = new URL(request.url);
  const parsed = parseCercaSearchParams(url.searchParams);
  if (!parsed.ok) {
    return json({ ok: false, error: parsed.error, items: [] }, 400);
  }

  try {
    const items = await deps.rpc(parsed.query);
    return json({ ok: true, items }, 200);
  } catch {
    return json({ ok: false, error: "cerca_unavailable", items: [] }, 502);
  }
}
