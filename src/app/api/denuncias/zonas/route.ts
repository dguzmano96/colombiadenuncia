import { readZonaSnapshot, resolveZonaBounds } from "@/zonal/zona-bounds";

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300",
    },
  });
}

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const departamento = params.get("departamento")?.trim();
  const municipio = params.get("municipio")?.trim() || undefined;
  if (!departamento) {
    return json({ ok: false, error: "zona_invalida" }, 400);
  }

  try {
    const result = resolveZonaBounds(await readZonaSnapshot(), departamento, municipio);
    if (!result.ok) {
      return json({ ok: false, error: "geometria_no_disponible" }, 404);
    }
    return json(result, 200);
  } catch {
    return json({ ok: false, error: "geometria_no_disponible" }, 502);
  }
}
