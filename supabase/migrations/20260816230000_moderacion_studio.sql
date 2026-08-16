-- HU-010: moderación Studio — oculta_moderacion, auditoría, RLS, vista cuarentena.
-- Staff: Dashboard / service_role (BYPASSRLS). Nunca en el bundle web.
-- Anon: sin SELECT/UPDATE en public.denuncias; feed solo denuncias_publicas (publicada).
-- Atestiguos/reportes: INSERT solo vía RPC existentes (HU-008/009).

-- AC-2: ampliar CHECK de estado (Postgres: DROP + ADD, no hay ALTER CHECK).
alter table public.denuncias drop constraint if exists denuncias_estado_chk;
alter table public.denuncias
  add constraint denuncias_estado_chk
  check (estado in ('publicada', 'cuarentena', 'oculta_moderacion'));

-- AC-6: auditoría mínima staff
alter table public.denuncias
  add column if not exists moderado_at timestamptz,
  add column if not exists moderado_nota text;

comment on column public.denuncias.moderado_at is
  'HU-010: sello de última transición de moderación (trigger).';
comment on column public.denuncias.moderado_nota is
  'HU-010: texto libre staff en Studio.';

comment on table public.denuncias is
  'Studio: columnas estado, trust_score, atestiguos_validos, reportes_falsedad, relato, location. Estados: publicada | cuarentena | oculta_moderacion.';

create or replace function public.denuncias_stamp_moderado()
returns trigger
language plpgsql
as $$
begin
  if new.estado is distinct from old.estado
     or new.moderado_nota is distinct from old.moderado_nota then
    new.moderado_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists denuncias_stamp_moderado on public.denuncias;
create trigger denuncias_stamp_moderado
  before update of estado, moderado_nota on public.denuncias
  for each row
  execute function public.denuncias_stamp_moderado();

-- AC-4: defensa RLS. Sin GRANT SELECT/UPDATE en la tabla.
-- Policy SELECT documenta “solo publicada” si alguien otorga el privilegio después.
revoke select, update, delete on table public.denuncias from public, anon, authenticated;
grant insert on table public.denuncias to anon;

drop policy if exists denuncias_anon_select_publicada on public.denuncias;
create policy denuncias_anon_select_publicada
  on public.denuncias
  for select
  to anon
  using (estado = 'publicada');

-- Sin policy UPDATE para anon/authenticated: con RLS ON, UPDATE queda denegado
-- aunque alguien otorgue el privilegio. Staff = service_role / Studio.

-- AC-5: vista/filtro cuarentena para el operador (Studio). Sin GRANT a anon.
create or replace view public.denuncias_cuarentena
with (security_barrier = true) as
select
  d.id,
  d.estado,
  d.trust_score,
  d.atestiguos_validos,
  d.reportes_falsedad,
  d.relato,
  d.location,
  d.moderado_at,
  d.moderado_nota,
  d.created_at
from public.denuncias d
where d.estado = 'cuarentena';

comment on view public.denuncias_cuarentena is
  'HU-010: cola de moderación Studio. Filtro estado=cuarentena. Sin GRANT a anon.';

-- Vista pública (HU-005/006) sigue filtrando solo publicada. No se recrea.
