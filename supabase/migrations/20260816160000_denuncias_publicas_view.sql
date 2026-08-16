-- HU-005: feed público para el mapa. Misma tabla denuncias (sin dual-track).
-- Anon NO obtiene SELECT sobre public.denuncias (relato/PII). Solo esta vista.

create or replace view public.denuncias_publicas
with (security_barrier = true) as
select
  d.id,
  d.categoria,
  extensions.st_x(d.location::extensions.geometry) as lon,
  extensions.st_y(d.location::extensions.geometry) as lat,
  d.trust_score,
  d.atestiguos_validos,
  d.reportes_falsedad,
  d.photo_path
from public.denuncias d
where d.estado = 'publicada';

comment on view public.denuncias_publicas is
  'GeoJSON público: solo publicada; sin relato ni columnas identificadoras.';

grant select on public.denuncias_publicas to anon, authenticated;
