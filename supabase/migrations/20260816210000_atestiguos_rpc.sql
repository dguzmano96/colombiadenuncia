-- HU-008: atestiguos + RPC proximidad 500 m + unique device/denuncia.
-- Reutiliza denuncias_location_gix (HU-004). No CREATE INDEX espacial extra.
-- SECURITY DEFINER: anon no SELECT/UPDATE denuncias ni INSERT atestiguos directo.
-- Anti-bot: Turnstile en Route Handler Next, no en SQL.
-- Trust Score S-10: atestiguos_validos - 2 * reportes_falsedad.
-- Columnas: id, denuncia_id, device_id, veedor_location, created_at (sin PII).

create table if not exists public.atestiguos (
  id uuid primary key default gen_random_uuid(),
  denuncia_id uuid not null references public.denuncias (id),
  device_id uuid not null,
  veedor_location extensions.geography(point, 4326) not null,
  created_at timestamptz not null default now(),
  constraint atestiguos_denuncia_device_uidx unique (denuncia_id, device_id)
);

alter table public.atestiguos enable row level security;

revoke all on table public.atestiguos from public, anon, authenticated;

create or replace function public.atestiguar_denuncia(
  p_denuncia_id uuid,
  p_device_id uuid,
  p_lat double precision,
  p_lon double precision
)
returns table (
  atestiguos_validos integer,
  reportes_falsedad integer,
  trust_score integer
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_point extensions.geography;
  v_ok boolean;
begin
  if p_denuncia_id is null or p_device_id is null then
    raise exception 'invalid_payload' using errcode = '22023';
  end if;
  if p_lat is null or p_lon is null then
    raise exception 'invalid_payload' using errcode = '22023';
  end if;

  v_point := extensions.st_point(p_lon, p_lat)::extensions.geography;

  select exists (
    select 1
    from public.denuncias d
    where d.id = p_denuncia_id
      and d.estado = 'publicada'
      and extensions.st_dwithin(
        d.location,
        v_point,
        500
      )
  ) into v_ok;

  if not coalesce(v_ok, false) then
    raise exception 'fuera_de_radio' using errcode = 'P0001';
  end if;

  insert into public.atestiguos (denuncia_id, device_id, veedor_location)
  values (p_denuncia_id, p_device_id, v_point);

  update public.denuncias d
  set
    atestiguos_validos = d.atestiguos_validos + 1,
    trust_score = (d.atestiguos_validos + 1) - (2 * d.reportes_falsedad)
  where d.id = p_denuncia_id;

  return query
    select d.atestiguos_validos, d.reportes_falsedad, d.trust_score
    from public.denuncias d
    where d.id = p_denuncia_id;
exception
  when unique_violation then
    raise exception 'duplicado' using errcode = '23505';
end;
$$;

comment on function public.atestiguar_denuncia(uuid, uuid, double precision, double precision) is
  'HU-008: atestiguo si ST_DWithin 500 m; unique device; trust_score = atestiguos_validos - 2 * reportes_falsedad.';

revoke all on function public.atestiguar_denuncia(uuid, uuid, double precision, double precision) from public;
grant execute on function public.atestiguar_denuncia(uuid, uuid, double precision, double precision) to anon, authenticated;
