-- Pagos del gimnasio a la plataforma (PLAN_PAGOS_PLATAFORMA.md). Una fila por
-- intento de pago. Al aprobar, se renueva gimnasios.plan_plataforma_vence_el y
-- el gym pasa a 'activo'. Solo la consola de soporte (service_role) o el
-- webhook de la pasarela escriben acá.
-- Idempotente.

create table if not exists public.pagos_plataforma (
  id                 uuid primary key default gen_random_uuid(),
  gimnasio_id        uuid not null references public.gimnasios (id) on delete cascade,
  plan_plataforma_id uuid references public.planes_plataforma (id) on delete set null,
  monto_ars          numeric(12,2) not null default 0,
  dias               int not null default 30 check (dias between 1 and 366),
  estado             text not null default 'pendiente'
                       check (estado in ('pendiente', 'aprobado', 'rechazado')),
  proveedor          text not null default 'manual',
  proveedor_ref      text,                       -- id del pago en la pasarela
  nota               text,
  creado_at          timestamptz not null default now(),
  confirmado_at      timestamptz
);

comment on table public.pagos_plataforma is
  'Pagos gimnasio -> plataforma. Aprobado => renueva plan_plataforma_vence_el.';

create index if not exists pagos_plataforma_gym_idx
  on public.pagos_plataforma (gimnasio_id, creado_at desc);

-- Dedupe del webhook: un ref del proveedor no se procesa dos veces.
create unique index if not exists pagos_plataforma_prov_ref_idx
  on public.pagos_plataforma (proveedor, proveedor_ref)
  where proveedor_ref is not null;

-- RLS: sin policies => solo service_role. La vista del dueño lee su último
-- pago vía service_role desde el server component (igual que planes_plataforma).
alter table public.pagos_plataforma enable row level security;
