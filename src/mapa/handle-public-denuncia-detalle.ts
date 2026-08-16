import { toPublicDetalle, YA_NO_ESTA_PUBLICO } from "./public-detalle";
import type { PublicDenunciaRow } from "./public-geojson";

export type GetPublicDenunciaById = (
  id: string,
) => Promise<PublicDenunciaRow | null>;

export type PublicDetalleDeps = {
  getById: GetPublicDenunciaById;
  supabaseUrl?: string;
};

function json(body: unknown, status: number, cacheControl: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cacheControl,
    },
  });
}

export async function handlePublicDenunciaDetalle(
  id: string,
  deps: PublicDetalleDeps,
): Promise<Response> {
  const trimmed = id.trim();
  if (!trimmed) {
    return json(
      { ok: false, error: "ya_no_esta_publico", message: YA_NO_ESTA_PUBLICO },
      404,
      "no-store",
    );
  }

  try {
    const row = await deps.getById(trimmed);
    const detalle = row ? toPublicDetalle(row, deps.supabaseUrl) : null;
    if (!detalle) {
      return json(
        { ok: false, error: "ya_no_esta_publico", message: YA_NO_ESTA_PUBLICO },
        404,
        "no-store",
      );
    }
    return json({ ok: true, detalle }, 200, "no-store");
  } catch {
    return json({ ok: false, error: "detalle_unavailable" }, 502, "no-store");
  }
}
