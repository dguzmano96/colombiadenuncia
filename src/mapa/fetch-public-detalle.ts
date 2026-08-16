import type { PublicDetalle } from "./public-detalle";
import { YA_NO_ESTA_PUBLICO } from "./public-detalle";

export type FetchPublicDetalleResult =
  | { ok: true; detalle: PublicDetalle }
  | { ok: false; reason: "gone" | "error"; message?: string };

export type FetchPublicDetalleDeps = {
  fetchImpl?: typeof fetch;
  urlForId?: (id: string) => string;
};

export function publicDetallePath(id: string): string {
  return `/api/denuncias/publicas/${encodeURIComponent(id)}`;
}

export async function fetchPublicDetalle(
  id: string,
  deps: FetchPublicDetalleDeps = {},
): Promise<FetchPublicDetalleResult> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const url = (deps.urlForId ?? publicDetallePath)(id);

  try {
    const response = await fetchImpl(url);
    const data: unknown = await response.json().catch(() => null);
    if (response.status === 404) {
      const rec = data as { message?: unknown } | null;
      return {
        ok: false,
        reason: "gone",
        message:
          typeof rec?.message === "string" ? rec.message : YA_NO_ESTA_PUBLICO,
      };
    }
    if (!response.ok || !data || typeof data !== "object") {
      return { ok: false, reason: "error" };
    }
    const rec = data as { ok?: unknown; detalle?: PublicDetalle };
    if (rec.ok === true && rec.detalle && typeof rec.detalle.id === "string") {
      return { ok: true, detalle: rec.detalle };
    }
    return { ok: false, reason: "error" };
  } catch {
    return { ok: false, reason: "error" };
  }
}
