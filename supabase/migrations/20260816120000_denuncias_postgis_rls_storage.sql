-- HU-004: denuncias PostGIS + RLS insert anónimo + Storage evidencias.
-- Aplicar en Studio/CLI cuando exista proyecto. El código de app usa anon key + estas policies.
-- Service role: solo migraciones/Studio, nunca el browser.

create extension if not exists postgis with schema extensions;

create table if not exists public.denuncias (
  id uuid primary key default gen_random_uuid(),
  categoria text not null,
  relato text not null,
  location extensions.geography(point, 4326) not null,
  estado text not null default 'publicada',
  trust_score integer not null default 0,
  atestiguos_validos integer not null default 0,
  reportes_falsedad integer not null default 0,
  photo_path text,
  created_at timestamptz not null default now(),
  constraint denuncias_estado_chk check (estado in ('publicada', 'cuarentena')),
  constraint denuncias_categoria_chk check (
    categoria in ('acaparamiento', 'reventa', 'desvío', 'otro')
  )
);

create index if not exists denuncias_location_gix
  on public.denuncias
  using gist (location);

alter table public.denuncias enable row level security;

-- Política documentada: el rol `anon` puede INSERTAR una denuncia ya publicada
-- con trust/conteos en cero (el anti-bot es Turnstile en el Route Handler de Next,
-- no un login). Sin SELECT de cuarentena. SELECT de `publicada` queda para EP-002.
drop policy if exists denuncias_anon_insert_publicada on public.denuncias;
create policy denuncias_anon_insert_publicada
  on public.denuncias
  for insert
  to anon
  with check (
    estado = 'publicada'
    and trust_score = 0
    and atestiguos_validos = 0
    and reportes_falsedad = 0
  );

grant usage on schema public to anon, authenticated;
grant insert on table public.denuncias to anon;

insert into storage.buckets (id, name, public)
values ('evidencias', 'evidencias', true)
on conflict (id) do update set public = true;

drop policy if exists evidencias_anon_insert on storage.objects;
create policy evidencias_anon_insert
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'evidencias');

drop policy if exists evidencias_public_read on storage.objects;
create policy evidencias_public_read
  on storage.objects
  for select
  to public
  using (bucket_id = 'evidencias');
