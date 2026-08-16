-- HU-006: mismo path de lectura (denuncias_publicas). Relato solo para GET por id;
-- el FeatureCollection sigue omitiéndolo en el SELECT del listado.

drop view if exists public.denuncias_publicas;

create view public.denuncias_publicas
with (security_barrier = true) as
select
  d.id,
  d.categoria,
  extensions.st_x(d.location::extensions.geometry) as lon,
  extensions.st_y(d.location::extensions.geometry) as lat,
  d.trust_score,
  d.atestiguos_validos,
  d.reportes_falsedad,
  d.photo_path,
  d.relato
from public.denuncias d
where d.estado = 'publicada';

comment on view public.denuncias_publicas is
  'Público: solo publicada. Relato para detalle por id; el feed GeoJSON no lo selecciona.';

grant select on public.denuncias_publicas to anon, authenticated;
