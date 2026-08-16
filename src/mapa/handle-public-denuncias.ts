import { GEOJSON_CACHE_CONTROL } from "@/pwa/precache";
import {
  toPublicFeatureCollection,
  type PublicDenunciaRow,
  type PublicFeatureCollection,
} from "./public-geojson";

export type ListPublicDenuncias = () => Promise<PublicDenunciaRow[]>;

export type PublicDenunciasDeps = {
  list: ListPublicDenuncias;
  supabaseUrl?: string;
};

function geojsonResponse(
  body: PublicFeatureCollection,
  status: number,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/geo+json; charset=utf-8",
      "Cache-Control": GEOJSON_CACHE_CONTROL,
    },
  });
}

export async function handlePublicDenuncias(
  deps: PublicDenunciasDeps,
): Promise<Response> {
  try {
    const rows = await deps.list();
    return geojsonResponse(
      toPublicFeatureCollection(rows ?? [], deps.supabaseUrl),
      200,
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "geojson_unavailable",
        message:
          err instanceof Error
            ? err.message
            : "No se pudieron consultar las denuncias públicas.",
      }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
