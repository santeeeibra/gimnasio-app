-- Registro simple de errores de la app para el semáforo por gimnasio en /admin.
-- Se escribe SOLO con service_role desde el servidor (helper registrarError en
-- src/lib/admin/errores.ts). Ningún rol anon/authenticated puede tocarla,
-- igual que admin_audit_log.

create table if not exists public.errores_app (
  id          bigint generated always as identity primary key,
  gimnasio_id uuid references public.gimnasios (id) on delete set null,
  origen      text not null,   -- 'alta_cliente' | 'checkin' | 'rutina' | 'pago' | 'push'
  mensaje     text not null,
  creado_en   timestamptz not null default now()
);

create index if not exists errores_app_creado_idx
  on public.errores_app (creado_en desc);

create index if not exists errores_app_gimnasio_idx
  on public.errores_app (gimnasio_id, creado_en desc);

alter table public.errores_app enable row level security;
-- Sin policies a propósito: acceso exclusivo por service_role.
