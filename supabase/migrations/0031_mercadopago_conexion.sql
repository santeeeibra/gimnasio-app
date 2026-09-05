-- Migración para soporte de cobro automático recurrente / Preapproval con Mercado Pago (plan Elite)

alter table public.gimnasios
  add column if not exists mp_access_token text,
  add column if not exists mp_refresh_token text,
  add column if not exists mp_user_id text,
  add column if not exists mp_token_expira_en timestamptz,
  add column if not exists mp_application_fee_pct numeric(5,2) default 5;

-- Si ya existía mp_collector_id de la 0029, sincronizar mp_user_id inicial
update public.gimnasios
  set mp_user_id = mp_collector_id
  where mp_user_id is null and mp_collector_id is not null;

comment on column public.gimnasios.mp_access_token is
  'OAuth MP Connect / Preapproval. NUNCA exponer a un client component.';

alter table public.clientes
  add column if not exists mp_preapproval_id text,
  add column if not exists email text;

create index if not exists clientes_mp_preapproval_id_idx
  on public.clientes (mp_preapproval_id)
  where mp_preapproval_id is not null;

-- Tabla de idempotencia para webhooks de Mercado Pago
create table if not exists public.mp_webhook_log (
  id uuid primary key default gen_random_uuid(),
  mp_event_id text unique not null,
  tipo text,
  procesado_en timestamptz default now()
);

-- RLS: tabla interna para webhook, solo accesible por service_role
alter table public.mp_webhook_log enable row level security;