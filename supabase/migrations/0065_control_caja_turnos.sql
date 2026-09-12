-- Migración 0065: Control de Caja Diaria, Turnos y Arqueo Ciego
-- Permite aperturas y cierres de turno para staff y dueños, registro de ingresos/egresos y arqueo ciego.

create table if not exists public.caja_sesiones (
  id uuid primary key default gen_random_uuid(),
  gimnasio_id uuid not null references public.gimnasios(id) on delete cascade,
  turno_nombre text not null default 'Turno Mañana',
  abierta_por uuid not null references public.profiles(id),
  cerrada_por uuid references public.profiles(id),
  monto_inicial_efectivo numeric(12,2) not null default 0 check (monto_inicial_efectivo >= 0),
  monto_final_declarado numeric(12,2),
  monto_final_esperado_efectivo numeric(12,2),
  diferencia_efectivo numeric(12,2),
  estado text not null default 'abierta' check (estado in ('abierta', 'cerrada')),
  abierta_en timestamptz not null default now(),
  cerrada_en timestamptz,
  notas_apertura text,
  notas_cierre text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists caja_sesiones_gym_estado_idx 
  on public.caja_sesiones (gimnasio_id, estado, abierta_en desc);

create table if not exists public.caja_movimientos (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references public.caja_sesiones(id) on delete cascade,
  gimnasio_id uuid not null references public.gimnasios(id) on delete cascade,
  tipo text not null check (tipo in ('ingreso', 'egreso')),
  categoria text not null default 'otro',
  concepto text not null,
  monto numeric(12,2) not null check (monto > 0),
  medio_pago text not null default 'efectivo' check (medio_pago in ('efectivo', 'transferencia', 'mercadopago', 'tarjeta')),
  pago_id uuid references public.pagos(id) on delete set null,
  comprobante_ref text,
  creado_por uuid references public.profiles(id),
  creado_en timestamptz not null default now()
);

create index if not exists caja_movimientos_sesion_idx 
  on public.caja_movimientos (sesion_id, creado_en desc);
create index if not exists caja_movimientos_gym_idx 
  on public.caja_movimientos (gimnasio_id, creado_en desc);

-- RLS
alter table public.caja_sesiones enable row level security;
alter table public.caja_movimientos enable row level security;

-- Policies caja_sesiones
drop policy if exists "caja_sesiones_select" on public.caja_sesiones;
create policy "caja_sesiones_select" on public.caja_sesiones
  for select to public
  using ((gimnasio_id = current_gimnasio_id()) and is_staff_o_dueno());

drop policy if exists "caja_sesiones_insert" on public.caja_sesiones;
create policy "caja_sesiones_insert" on public.caja_sesiones
  for insert to public
  with check ((gimnasio_id = current_gimnasio_id()) and is_staff_o_dueno() and gimnasio_permite_escritura());

drop policy if exists "caja_sesiones_update" on public.caja_sesiones;
create policy "caja_sesiones_update" on public.caja_sesiones
  for update to public
  using ((gimnasio_id = current_gimnasio_id()) and is_staff_o_dueno())
  with check ((gimnasio_id = current_gimnasio_id()) and is_staff_o_dueno() and gimnasio_permite_escritura());

drop policy if exists "caja_sesiones_delete" on public.caja_sesiones;
create policy "caja_sesiones_delete" on public.caja_sesiones
  for delete to public
  using ((gimnasio_id = current_gimnasio_id()) and is_dueno());

-- Policies caja_movimientos
drop policy if exists "caja_movimientos_select" on public.caja_movimientos;
create policy "caja_movimientos_select" on public.caja_movimientos
  for select to public
  using ((gimnasio_id = current_gimnasio_id()) and is_staff_o_dueno());

drop policy if exists "caja_movimientos_insert" on public.caja_movimientos;
create policy "caja_movimientos_insert" on public.caja_movimientos
  for insert to public
  with check ((gimnasio_id = current_gimnasio_id()) and is_staff_o_dueno() and gimnasio_permite_escritura());

drop policy if exists "caja_movimientos_update" on public.caja_movimientos;
create policy "caja_movimientos_update" on public.caja_movimientos
  for update to public
  using ((gimnasio_id = current_gimnasio_id()) and is_dueno())
  with check ((gimnasio_id = current_gimnasio_id()) and is_dueno() and gimnasio_permite_escritura());

drop policy if exists "caja_movimientos_delete" on public.caja_movimientos;
create policy "caja_movimientos_delete" on public.caja_movimientos
  for delete to public
  using ((gimnasio_id = current_gimnasio_id()) and is_dueno());
