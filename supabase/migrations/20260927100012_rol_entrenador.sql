-- Migración 0072: rol 'entrenador' + asignación de alumnos.
--
-- Un entrenador es un empleado del gimnasio que ve y trabaja SOLO con los
-- socios que tiene asignados (clientes.entrenador_id): lee sus datos, arma y
-- edita sus rutinas y ve su progreso/asistencia. No ve pagos, caja ni ajustes.
-- El dueño también puede figurar como entrenador asignado (gyms chicos donde
-- el dueño entrena): el trigger lo permite y el dueño ya ve todo igual.
--
-- Patrón RLS: se recrean las policies existentes agregando un OR para el
-- entrenador (una sola policy por acción, como en 0055, para no volver a
-- disparar el advisor "multiple_permissive_policies").
-- Idempotente: IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS.

-- ============================================================
-- 1. Rol nuevo
-- ============================================================
alter table public.profiles drop constraint if exists profiles_rol_check;
alter table public.profiles add constraint profiles_rol_check
  check (rol in ('dueno', 'cliente', 'staff', 'entrenador'));

-- ============================================================
-- 2. Asignación socio → entrenador
-- ============================================================
alter table public.clientes
  add column if not exists entrenador_id uuid
  references public.profiles (id) on delete set null;

create index if not exists clientes_entrenador_id_idx
  on public.clientes (entrenador_id);

-- La FK no alcanza: el asignado tiene que ser entrenador (o el dueño) del
-- MISMO gimnasio que el socio. Si no, un dueño podría asignar un perfil de
-- otro gym y abrirle datos ajenos.
create or replace function public.validar_entrenador_cliente()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.entrenador_id is null then
    return new;
  end if;
  if not exists (
    select 1 from profiles p
    where p.id = new.entrenador_id
      and p.gimnasio_id = new.gimnasio_id
      and p.rol in ('entrenador', 'dueno')
  ) then
    raise exception 'entrenador_id inválido: tiene que ser entrenador o dueño del mismo gimnasio'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists clientes_validar_entrenador on public.clientes;
create trigger clientes_validar_entrenador
  before insert or update of entrenador_id, gimnasio_id on public.clientes
  for each row execute function public.validar_entrenador_cliente();

-- ============================================================
-- 3. Helpers RLS (security definer: evitan recursión de RLS entre
--    profiles ↔ clientes, igual que is_dueno()/current_cliente_id()).
-- ============================================================
create or replace function public.is_entrenador()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and rol = 'entrenador' and activo = true
  )
$$;

-- ¿El socio _cliente_id está asignado al entrenador logueado (activo)?
create or replace function public.es_alumno_mio(_cliente_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from clientes c
    join profiles p on p.id = auth.uid()
    where c.id = _cliente_id
      and c.entrenador_id = p.id
      and c.gimnasio_id = p.gimnasio_id
      and p.rol = 'entrenador'
      and p.activo = true
  )
$$;

-- ¿El perfil _profile_id es de un socio asignado al entrenador logueado?
-- (los nombres/DNI viven en profiles, no en clientes).
create or replace function public.es_profile_de_alumno_mio(_profile_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from clientes c
    join profiles p on p.id = auth.uid()
    where c.profile_id = _profile_id
      and c.entrenador_id = p.id
      and c.gimnasio_id = p.gimnasio_id
      and p.rol = 'entrenador'
      and p.activo = true
  )
$$;

-- Entrenador asignado al socio logueado (para que el alumno vea quién es).
create or replace function public.mi_entrenador_id()
returns uuid language sql stable security definer set search_path = public as $$
  select c.entrenador_id from clientes c where c.profile_id = auth.uid()
$$;

-- ============================================================
-- 4. Policies
-- ============================================================

-- profiles: + el entrenador ve a sus alumnos; + el socio ve a su entrenador.
drop policy if exists "prof_select" on public.profiles;
create policy "prof_select" on public.profiles
  for select to public
  using (
    id = (select auth.uid())
    or ((gimnasio_id = current_gimnasio_id()) and is_staff_o_dueno())
    or ((gimnasio_id = current_gimnasio_id()) and es_profile_de_alumno_mio(id))
    or id = mi_entrenador_id()
  );

-- clientes: + el entrenador lee solo sus alumnos (no los edita: la
-- asignación y los datos del socio los maneja el dueño/recepción).
drop policy if exists "clientes_select" on public.clientes;
create policy "clientes_select" on public.clientes
  for select to public
  using (
    (gimnasio_id = current_gimnasio_id())
    and (
      is_staff_o_dueno()
      or profile_id = (select auth.uid())
      or (entrenador_id = (select auth.uid()) and is_entrenador())
    )
  );

-- rutinas: el entrenador lee y escribe las de sus alumnos.
drop policy if exists "rutinas_select" on public.rutinas;
create policy "rutinas_select" on public.rutinas
  for select to public
  using (
    (gimnasio_id = current_gimnasio_id())
    and (is_dueno() or cliente_id = current_cliente_id() or es_alumno_mio(cliente_id))
  );

drop policy if exists "rutinas_insert" on public.rutinas;
create policy "rutinas_insert" on public.rutinas
  for insert to public
  with check (
    (gimnasio_id = current_gimnasio_id())
    and gimnasio_permite_escritura()
    and (is_dueno() or cliente_id = current_cliente_id() or es_alumno_mio(cliente_id))
  );

drop policy if exists "rutinas_update" on public.rutinas;
create policy "rutinas_update" on public.rutinas
  for update to public
  using (
    ((gimnasio_id = current_gimnasio_id()) and is_dueno())
    or cliente_id = current_cliente_id()
    or ((gimnasio_id = current_gimnasio_id()) and es_alumno_mio(cliente_id))
  )
  with check (
    (gimnasio_id = current_gimnasio_id())
    and gimnasio_permite_escritura()
    and (is_dueno() or cliente_id = current_cliente_id() or es_alumno_mio(cliente_id))
  );

drop policy if exists "rutinas_delete" on public.rutinas;
create policy "rutinas_delete" on public.rutinas
  for delete to public
  using (
    ((gimnasio_id = current_gimnasio_id()) and is_dueno())
    or ((cliente_id = current_cliente_id()) and gimnasio_permite_escritura())
    or ((gimnasio_id = current_gimnasio_id()) and es_alumno_mio(cliente_id) and gimnasio_permite_escritura())
  );

-- rutina_items: misma regla vía la rutina padre.
drop policy if exists "rutina_items_write" on public.rutina_items;
create policy "rutina_items_write" on public.rutina_items
  for all to public
  using (exists (
    select 1 from public.rutinas r
    where r.id = rutina_id
      and r.gimnasio_id = current_gimnasio_id()
      and (is_dueno() or r.cliente_id = current_cliente_id() or es_alumno_mio(r.cliente_id))
  ))
  with check (exists (
    select 1 from public.rutinas r
    where r.id = rutina_id
      and r.gimnasio_id = current_gimnasio_id()
      and (is_dueno() or r.cliente_id = current_cliente_id() or es_alumno_mio(r.cliente_id))
  ) and gimnasio_permite_escritura());

-- registro_progreso / registro_peso: el entrenador solo LEE (el registro
-- lo carga el socio; creado_por sigue siendo 'cliente' | 'dueno').
drop policy if exists "rprog_select" on public.registro_progreso;
create policy "rprog_select" on public.registro_progreso
  for select to public
  using (
    (gimnasio_id = current_gimnasio_id())
    and (is_dueno() or cliente_id = current_cliente_id() or es_alumno_mio(cliente_id))
  );

drop policy if exists "rp_select" on public.registro_peso;
create policy "rp_select" on public.registro_peso
  for select to public
  using (
    (gimnasio_id = current_gimnasio_id())
    and (is_dueno() or cliente_id = current_cliente_id() or es_alumno_mio(cliente_id))
  );

-- registros_entrada: el entrenador ve la asistencia de sus alumnos
-- (mantiene el acceso de staff agregado en 0062).
drop policy if exists "registros_entrada_select" on public.registros_entrada;
create policy "registros_entrada_select" on public.registros_entrada
  for select to public
  using (
    (gimnasio_id = current_gimnasio_id())
    and (is_staff_o_dueno() or cliente_id = current_cliente_id() or es_alumno_mio(cliente_id))
  );
