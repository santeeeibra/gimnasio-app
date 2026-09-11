-- Migración 0062: Soporte para rol 'staff' (empleados/recepción)
-- Permite que el dueño cree cuentas de recepción con acceso operativo acotado.

-- 1. Modificar constraint de rol en profiles
alter table public.profiles drop constraint if exists profiles_rol_check;
alter table public.profiles add constraint profiles_rol_check check (rol in ('dueno', 'cliente', 'staff'));

-- 2. Agregar columna activo y permisos para staff
alter table public.profiles add column if not exists activo boolean not null default true;
alter table public.profiles add column if not exists permisos jsonb default '{}'::jsonb;

-- Índice para búsqueda de staff activo por gimnasio
create index if not exists profiles_gimnasio_rol_activo_idx on public.profiles (gimnasio_id, rol, activo);

-- 3. Funciones RLS auxiliares
create or replace function is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and rol = 'staff'
      and activo = true
  )
$$;

create or replace function is_staff_o_dueno()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and (rol = 'dueno' or (rol = 'staff' and activo = true))
  )
$$;

-- 4. Actualizar policies RLS

-- Profiles: lectura para staff o dueño del gimnasio
drop policy if exists "prof_select" on public.profiles;
create policy "prof_select" on public.profiles
  for select to public
  using (
    id = (select auth.uid())
    or ((gimnasio_id = current_gimnasio_id()) and is_staff_o_dueno())
  );

-- Clientes: lectura para staff o dueño del gimnasio
drop policy if exists "clientes_select" on public.clientes;
create policy "clientes_select" on public.clientes
  for select to public
  using (
    (gimnasio_id = current_gimnasio_id()) and (is_staff_o_dueno() or profile_id = (select auth.uid()))
  );

-- Clientes: update para check-in o edición operativa
drop policy if exists "clientes_dueno_update" on public.clientes;
drop policy if exists "clientes_staff_o_dueno_update" on public.clientes;
create policy "clientes_staff_o_dueno_update" on public.clientes
  for update to public
  using (
    (gimnasio_id = current_gimnasio_id()) and is_staff_o_dueno()
  )
  with check (
    (gimnasio_id = current_gimnasio_id()) and is_staff_o_dueno() and gimnasio_permite_escritura()
  );

-- Registros de entrada (check-in)
drop policy if exists "registros_entrada_select" on public.registros_entrada;
create policy "registros_entrada_select" on public.registros_entrada
  for select to public
  using (
    (gimnasio_id = current_gimnasio_id()) and (is_staff_o_dueno() or (cliente_id = current_cliente_id()))
  );

drop policy if exists "registros_entrada_dueno_insert" on public.registros_entrada;
drop policy if exists "registros_entrada_staff_o_dueno_insert" on public.registros_entrada;
create policy "registros_entrada_staff_o_dueno_insert" on public.registros_entrada
  for insert to public
  with check (
    (gimnasio_id = current_gimnasio_id()) and is_staff_o_dueno() and gimnasio_permite_escritura()
  );

-- Pedidos de asistencia
drop policy if exists "pedidos_asistencia_select" on public.pedidos_asistencia;
create policy "pedidos_asistencia_select" on public.pedidos_asistencia
  for select to public
  using (
    ((gimnasio_id = current_gimnasio_id()) and is_staff_o_dueno()) or (cliente_id = current_cliente_id())
  );

drop policy if exists "pedidos_asistencia_update" on public.pedidos_asistencia;
create policy "pedidos_asistencia_update" on public.pedidos_asistencia
  for update to public
  using (
    ((gimnasio_id = current_gimnasio_id()) and is_staff_o_dueno()) or (cliente_id = current_cliente_id())
  );

-- Pagos: select para staff o dueño
drop policy if exists "pagos_select" on public.pagos;
create policy "pagos_select" on public.pagos
  for select to public
  using (
    (gimnasio_id = current_gimnasio_id()) and (is_staff_o_dueno() or cliente_id = current_cliente_id())
  );
