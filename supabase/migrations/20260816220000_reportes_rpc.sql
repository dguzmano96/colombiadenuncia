-- HU-009: reportes de falsedad + RPC Trust S-10 + cuarentena automática.
-- Unique (denuncia_id, device_id): una acción por dispositivo por denuncia.
-- SECURITY DEFINER: anon no SELECT/UPDATE denuncias ni INSERT reportes directo.
-- Anti-bot: Turnstile en Route Handler Next, no en SQL.
-- Trust Score S-10: atestiguos_validos - 2 * reportes_falsedad.
-- Cuarentena: reportes_falsedad >= 3 OR trust_score <= -3.
-- Columnas: id, denuncia_id, device_id, tipo, created_at (sin PII).
-- CHECK estado ya incluye cuarentena (HU-004). Auditoría Studio queda fuera de esta migración.

create table if not exists public.reportes (
  id uuid primary key default gen_random_uuid(),
  denuncia_id uuid not null references public.denuncias (id),
  device_id uuid not null,
  tipo text not null,
  created_at timestamptz not null default now(),
  constraint reportes_denuncia_device_uidx unique (denuncia_id, device_id),
  constraint reportes_tipo_chk check (
    tipo in ('spam', 'difamacion', 'contenido_falso')
  )
);

alter table public.reportes enable row level security;

revoke all on table public.reportes from public, anon, authenticated;

create or replace function public.reportar_denuncia(
  p_denuncia_id uuid,
  p_device_id uuid,
  p_tipo text
)
returns table (
  atestiguos_validos integer,
  reportes_falsedad integer,
  trust_score integer,
  estado text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_estado text;
begin
  if p_denuncia_id is null or p_device_id is null then
    raise exception 'invalid_payload' using errcode = '22023';
  end if;
  if p_tipo is null or p_tipo not in ('spam', 'difamacion', 'contenido_falso') then
    raise exception 'invalid_payload' using errcode = '22023';
  end if;

  select d.estado into v_estado
  from public.denuncias d
  where d.id = p_denuncia_id;

  if v_estado is null or v_estado <> 'publicada' then
    raise exception 'no_publicada' using errcode = 'P0002';
  end if;

  insert into public.reportes (denuncia_id, device_id, tipo)
  values (p_denuncia_id, p_device_id, p_tipo);

  update public.denuncias d
  set
    reportes_falsedad = d.reportes_falsedad + 1,
    trust_score = d.atestiguos_validos - (2 * (d.reportes_falsedad + 1)),
    estado = case
      when (d.reportes_falsedad + 1) >= 3
        or (d.atestiguos_validos - (2 * (d.reportes_falsedad + 1))) <= -3
      then 'cuarentena'
      else d.estado
    end
  where d.id = p_denuncia_id;

  return query
    select d.atestiguos_validos, d.reportes_falsedad, d.trust_score, d.estado
    from public.denuncias d
    where d.id = p_denuncia_id;
exception
  when unique_violation then
    raise exception 'duplicado' using errcode = '23505';
end;
$$;

comment on function public.reportar_denuncia(uuid, uuid, text) is
  'HU-009: reporte estructurado; unique device; trust S-10; cuarentena si reportes>=3 o trust<=-3.';

revoke all on function public.reportar_denuncia(uuid, uuid, text) from public;
grant execute on function public.reportar_denuncia(uuid, uuid, text) to anon, authenticated;
