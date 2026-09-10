-- Migración: Leads de la landing pública de marketing (/inicio)
-- Formulario de contacto para dueños de gimnasio interesados en el SaaS.
-- Confirmar que este es el siguiente número libre en supabase/migrations/ antes de aplicar.

create table if not exists leads_landing (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  gimnasio text not null,
  telefono text not null,
  ciudad text not null,
  origen text not null default 'landing',
  user_agent text,
  creado_at timestamptz not null default now()
);

-- Listado interno (más nuevos primero).
create index if not exists leads_landing_creado_idx
  on leads_landing (creado_at desc);

-- RLS: inserción pública (visitante anónimo desde la landing), sin lectura.
-- Los leads se consultan directo en el dashboard de Supabase / service_role.
alter table leads_landing enable row level security;

create policy "landing_insert_publico" on leads_landing
  for insert
  to anon, authenticated
  with check (true);
