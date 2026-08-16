-- HU-007: RPC de cercanía. Reutiliza denuncias_location_gix (HU-004).
-- No CREATE INDEX: un solo GIST, no dual-track espacial.
-- SECURITY DEFINER: anon no tiene SELECT sobre public.denuncias.location.
-- search_path fijado (docs Supabase functions 2026-08-16).
-- Predicado: ST_DWithin(location, st_point(long,lat)::geography, dist_m)
--   — longitud primero; geography = metros (PostGIS 3.5).
-- Plan esperado con seed ≥1k (cuando haya cloud live): Index/Bitmap Scan
--   sobre denuncias_location_gix, no Seq Scan completo. Sin EXPLAIN live aquí.

create or replace function public.denuncias_cerca(
  lat double precision,
  long double precision,
  dist_m double precision default 2000
)
returns table (
  id uuid,
  lat double precision,
  long double precision,
  dist_meters double precision,
  categoria text
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    d.id,
    extensions.st_y(d.location::extensions.geometry) as lat,
    extensions.st_x(d.location::extensions.geometry) as long,
    extensions.st_distance(
      d.location,
      extensions.st_point(denuncias_cerca.long, denuncias_cerca.lat)::extensions.geography
    ) as dist_meters,
    d.categoria
  from public.denuncias d
  where d.estado = 'publicada'
    and extensions.st_dwithin(
      d.location,
      extensions.st_point(denuncias_cerca.long, denuncias_cerca.lat)::extensions.geography,
      least(greatest(coalesce(denuncias_cerca.dist_m, 2000), 0), 20000)
    );
$$;

comment on function public.denuncias_cerca(double precision, double precision, double precision) is
  'HU-007: denuncias publicada en radio (default 2000 m, cap 20000). ST_DWithin + GIST existente.';

revoke all on function public.denuncias_cerca(double precision, double precision, double precision) from public;
grant execute on function public.denuncias_cerca(double precision, double precision, double precision) to anon, authenticated;
