-- 0043_rutina_plantillas.sql
-- Fase 1 monetización — compartir rutina de entrenador.
-- Un coach publica un snapshot de una rutina y obtiene un código corto legible
-- (ej. LUCAS) + un link /r/<codigo>. Los alumnos que abren el link se crean
-- como socios del gimnasio del coach y se les clona la rutina (onboarding 1 paso).
-- Idempotente.

create table if not exists public.rutina_plantillas (
  id              uuid primary key default gen_random_uuid(),
  gimnasio_id     uuid not null references public.gimnasios (id) on delete cascade,
  creada_por      uuid references public.profiles (id) on delete set null,
  nombre          text not null,
  codigo          text not null unique,            -- normalizado A-Z0-9, mayúsculas
  objetivo        text,
  nivel           text,
  dias_por_semana integer,
  dias_titulos    jsonb   not null default '[]'::jsonb,
  preferencias    jsonb   not null default '{}'::jsonb,
  items           jsonb   not null default '[]'::jsonb,  -- snapshot de rutina_items + slug/nombre de ejercicio
  activa          boolean not null default true,
  veces_cargada   integer not null default 0,
  creada_at       timestamptz not null default now(),
  actualizada_at  timestamptz not null default now()
);

create index if not exists rutina_plantillas_gimnasio_idx
  on public.rutina_plantillas (gimnasio_id);

alter table public.rutina_plantillas enable row level security;

-- El dueño gestiona sólo las plantillas de su gimnasio. El landing público
-- (/r/<codigo>) y el onboarding leen/escriben con service_role, sin RLS.
drop policy if exists rp_dueno on public.rutina_plantillas;
create policy rp_dueno on public.rutina_plantillas for all
  using (gimnasio_id = current_gimnasio_id() and is_dueno())
  with check (gimnasio_id = current_gimnasio_id() and is_dueno());

-- Atribución: de qué plantilla entró el socio (para métricas del coach).
alter table public.clientes
  add column if not exists origen_plantilla uuid
    references public.rutina_plantillas (id) on delete set null;

-- La rutina clonada de una plantilla se marca como 'plantilla' (ni 'auto' ni 'manual').
alter table public.rutinas drop constraint if exists rutinas_origen_check;
alter table public.rutinas
  add constraint rutinas_origen_check check (origen in ('auto', 'manual', 'plantilla'));
