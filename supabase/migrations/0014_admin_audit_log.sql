-- Consola de soporte (/admin): registro de auditoría de lo que hace el
-- superadmin de la plataforma. Se lee/escribe SOLO con service_role desde el
-- servidor; ningún rol anon/authenticated puede tocarla.

create table if not exists public.admin_audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid not null references public.profiles (id),
  action      text not null,            -- 'ver_gym' | 'listar_gyms' | 'push_prueba'
  gimnasio_id uuid references public.gimnasios (id) on delete set null,
  meta        jsonb not null default '{}',
  creado_en   timestamptz not null default now()
);

create index if not exists admin_audit_log_creado_idx
  on public.admin_audit_log (creado_en desc);

alter table public.admin_audit_log enable row level security;
-- Sin policies a propósito: acceso exclusivo por service_role.
