-- SPEC_MONITOR_SUPABASE.md — aviso al ADMIN de la plataforma cuando el
-- proyecto Supabase entero se acerca al límite del plan (free: 500 MB).
-- No es por-gimnasio. Solo lo lee/escribe el service_role (cron + panel /admin).

-- ─────────────────────────────────────────────────────────────
-- Función: tamaño real de la base en bytes.
-- security definer para poder llamarla desde el cron con service_role.
-- ─────────────────────────────────────────────────────────────
create or replace function public.db_size_bytes()
returns bigint
language sql
security definer
set search_path = public
as $$ select pg_database_size(current_database()); $$;

revoke all on function public.db_size_bytes() from public, anon, authenticated;
grant execute on function public.db_size_bytes() to service_role;

-- ─────────────────────────────────────────────────────────────
-- Estado del monitor: una sola fila (id = 1).
-- umbral_avisado = último umbral (0 / 70 / 90) ya notificado por email,
-- para no repetir el mismo aviso día a día. Sube al cruzar 70→90 y baja
-- solo si el uso real bajó (purga manual) — reset automático.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.monitor_db_estado (
  id smallint primary key default 1 check (id = 1),
  umbral_avisado smallint not null default 0 check (umbral_avisado in (0, 70, 90)),
  pct numeric,
  bytes bigint,
  actualizado_at timestamptz not null default now()
);

insert into public.monitor_db_estado (id) values (1) on conflict (id) do nothing;

alter table public.monitor_db_estado enable row level security;
-- Sin policies a propósito: ni dueños ni clientes tienen acceso.
-- El service_role bypassa RLS (cron y Server Component de /admin).
