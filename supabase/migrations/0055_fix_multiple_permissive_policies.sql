-- 0055_fix_multiple_permissive_policies.sql
-- Fix advisor "multiple_permissive_policies" (WARN, 98 hallazgos): varias tablas
-- tenían una policy FOR ALL del dueño + una policy separada para la misma
-- acción (select/update/insert/delete), y Postgres evalúa TODAS las policies
-- permisivas de una acción aunque sean excluyentes. A escala (más gyms, más
-- filas) es trabajo duplicado en cada query.
--
-- Estrategia (sin cambiar permisos, permissive policies ya se combinan con OR):
--   - Donde la condición del dueño era subconjunto de la policy específica
--     (ej. "is_dueno()" ya incluido en "is_dueno() OR profile_id = self"),
--     se achica la policy ALL del dueño para que ya no cubra esa acción.
--   - Donde las condiciones son poblaciones distintas (dueño vs. socio propio),
--     se fusionan en UNA policy con OR (USING = U1 OR U2, WITH CHECK = C1 OR C2)
--     — resultado idéntico al de las 2 policies por separado, una sola evaluación.
-- Idempotente: DROP POLICY IF EXISTS + CREATE POLICY.

-- ============================================================
-- clientes
-- ============================================================
drop policy if exists "clientes_dueno" on public.clientes;
drop policy if exists "clientes_update_propio" on public.clientes;

create policy "clientes_dueno_insert" on public.clientes
  for insert to public
  with check ((gimnasio_id = current_gimnasio_id()) and is_dueno() and gimnasio_permite_escritura());

create policy "clientes_dueno_delete" on public.clientes
  for delete to public
  using ((gimnasio_id = current_gimnasio_id()) and is_dueno());

create policy "clientes_update" on public.clientes
  for update to public
  using (
    ((gimnasio_id = current_gimnasio_id()) and is_dueno())
    or profile_id = (select auth.uid())
  )
  with check (
    ((gimnasio_id = current_gimnasio_id()) and is_dueno() and gimnasio_permite_escritura())
    or profile_id = (select auth.uid())
  );
-- clientes_select queda igual (ya cubre is_dueno() OR profile_id propio)

-- ============================================================
-- profiles
-- ============================================================
drop policy if exists "prof_dueno_all" on public.profiles;
drop policy if exists "prof_update_self" on public.profiles;

create policy "prof_dueno_insert" on public.profiles
  for insert to public
  with check ((gimnasio_id = current_gimnasio_id()) and is_dueno() and gimnasio_permite_escritura());

create policy "prof_dueno_delete" on public.profiles
  for delete to public
  using ((gimnasio_id = current_gimnasio_id()) and is_dueno());

create policy "prof_update" on public.profiles
  for update to public
  using (
    ((gimnasio_id = current_gimnasio_id()) and is_dueno())
    or id = (select auth.uid())
  )
  with check (
    ((gimnasio_id = current_gimnasio_id()) and is_dueno() and gimnasio_permite_escritura())
    or id = (select auth.uid())
  );
-- prof_select queda igual (ya cubre id = self OR dueño del gym)

-- ============================================================
-- rutinas
-- ============================================================
drop policy if exists "rutinas_dueno" on public.rutinas;
drop policy if exists "rutinas_cliente_insert" on public.rutinas;
drop policy if exists "rutinas_cliente_update" on public.rutinas;
drop policy if exists "rutinas_cliente_delete" on public.rutinas;

create policy "rutinas_insert" on public.rutinas
  for insert to public
  with check (
    ((gimnasio_id = current_gimnasio_id()) and is_dueno() and gimnasio_permite_escritura())
    or ((gimnasio_id = current_gimnasio_id()) and (cliente_id = current_cliente_id()) and gimnasio_permite_escritura())
  );

create policy "rutinas_update" on public.rutinas
  for update to public
  using (
    ((gimnasio_id = current_gimnasio_id()) and is_dueno())
    or cliente_id = current_cliente_id()
  )
  with check (
    ((gimnasio_id = current_gimnasio_id()) and is_dueno() and gimnasio_permite_escritura())
    or ((cliente_id = current_cliente_id()) and (gimnasio_id = current_gimnasio_id()) and gimnasio_permite_escritura())
  );

create policy "rutinas_delete" on public.rutinas
  for delete to public
  using (
    ((gimnasio_id = current_gimnasio_id()) and is_dueno())
    or ((cliente_id = current_cliente_id()) and gimnasio_permite_escritura())
  );
-- rutinas_select queda igual (ya cubre is_dueno() OR cliente_id propio)

-- ============================================================
-- rutina_items — rutina_items_select es idéntica a la condición de
-- rutina_items_write (misma EXISTS), directamente redundante: se borra.
-- ============================================================
drop policy if exists "rutina_items_select" on public.rutina_items;

-- ============================================================
-- registro_peso
-- ============================================================
drop policy if exists "rp_dueno" on public.registro_peso;
drop policy if exists "rp_cliente_insert" on public.registro_peso;
drop policy if exists "rp_cliente_select" on public.registro_peso;
drop policy if exists "rp_cliente_update" on public.registro_peso;

create policy "rp_insert" on public.registro_peso
  for insert to public
  with check (
    ((gimnasio_id = current_gimnasio_id()) and is_dueno())
    or ((gimnasio_id = current_gimnasio_id()) and (cliente_id = current_cliente_id()) and (creado_por = 'cliente'::text))
  );

create policy "rp_select" on public.registro_peso
  for select to public
  using (
    ((gimnasio_id = current_gimnasio_id()) and is_dueno())
    or ((gimnasio_id = current_gimnasio_id()) and (cliente_id = current_cliente_id()))
  );

create policy "rp_update" on public.registro_peso
  for update to public
  using (
    ((gimnasio_id = current_gimnasio_id()) and is_dueno())
    or ((gimnasio_id = current_gimnasio_id()) and (cliente_id = current_cliente_id()))
  )
  with check (
    ((gimnasio_id = current_gimnasio_id()) and is_dueno())
    or ((gimnasio_id = current_gimnasio_id()) and (cliente_id = current_cliente_id()) and (creado_por = 'cliente'::text))
  );

create policy "rp_dueno_delete" on public.registro_peso
  for delete to public
  using ((gimnasio_id = current_gimnasio_id()) and is_dueno());

-- ============================================================
-- registro_progreso (mismo patrón que registro_peso)
-- ============================================================
drop policy if exists "rprog_dueno" on public.registro_progreso;
drop policy if exists "rprog_cliente_insert" on public.registro_progreso;
drop policy if exists "rprog_cliente_select" on public.registro_progreso;
drop policy if exists "rprog_cliente_update" on public.registro_progreso;

create policy "rprog_insert" on public.registro_progreso
  for insert to public
  with check (
    ((gimnasio_id = current_gimnasio_id()) and is_dueno())
    or ((gimnasio_id = current_gimnasio_id()) and (cliente_id = current_cliente_id()) and (creado_por = 'cliente'::text))
  );

create policy "rprog_select" on public.registro_progreso
  for select to public
  using (
    ((gimnasio_id = current_gimnasio_id()) and is_dueno())
    or ((gimnasio_id = current_gimnasio_id()) and (cliente_id = current_cliente_id()))
  );

create policy "rprog_update" on public.registro_progreso
  for update to public
  using (
    ((gimnasio_id = current_gimnasio_id()) and is_dueno())
    or ((gimnasio_id = current_gimnasio_id()) and (cliente_id = current_cliente_id()))
  )
  with check (
    ((gimnasio_id = current_gimnasio_id()) and is_dueno())
    or ((gimnasio_id = current_gimnasio_id()) and (cliente_id = current_cliente_id()) and (creado_por = 'cliente'::text))
  );

create policy "rprog_dueno_delete" on public.registro_progreso
  for delete to public
  using ((gimnasio_id = current_gimnasio_id()) and is_dueno());

-- ============================================================
-- registros_entrada
-- ============================================================
drop policy if exists "registros_entrada_dueno" on public.registros_entrada;
drop policy if exists "registros_entrada_cliente_select" on public.registros_entrada;

create policy "registros_entrada_select" on public.registros_entrada
  for select to public
  using (
    ((gimnasio_id = current_gimnasio_id()) and is_dueno())
    or ((gimnasio_id = current_gimnasio_id()) and (cliente_id = current_cliente_id()))
  );

create policy "registros_entrada_dueno_insert" on public.registros_entrada
  for insert to public
  with check ((gimnasio_id = current_gimnasio_id()) and is_dueno() and gimnasio_permite_escritura());

create policy "registros_entrada_dueno_update" on public.registros_entrada
  for update to public
  using ((gimnasio_id = current_gimnasio_id()) and is_dueno())
  with check ((gimnasio_id = current_gimnasio_id()) and is_dueno() and gimnasio_permite_escritura());

create policy "registros_entrada_dueno_delete" on public.registros_entrada
  for delete to public
  using ((gimnasio_id = current_gimnasio_id()) and is_dueno());

-- ============================================================
-- pagos — pagos_select ya es superset de la condición del dueño
-- (gimnasio_id = current AND (is_dueno() OR cliente propio)); se achica
-- pagos_dueno para que no cubra más SELECT.
-- ============================================================
drop policy if exists "pagos_dueno" on public.pagos;

create policy "pagos_dueno_insert" on public.pagos
  for insert to public
  with check ((gimnasio_id = current_gimnasio_id()) and is_dueno() and gimnasio_permite_escritura());

create policy "pagos_dueno_update" on public.pagos
  for update to public
  using ((gimnasio_id = current_gimnasio_id()) and is_dueno())
  with check ((gimnasio_id = current_gimnasio_id()) and is_dueno() and gimnasio_permite_escritura());

create policy "pagos_dueno_delete" on public.pagos
  for delete to public
  using ((gimnasio_id = current_gimnasio_id()) and is_dueno());

-- ============================================================
-- planes — planes_select ya es superset (gimnasio_id = current, sin
-- restricción de rol); se achica planes_dueno para que no cubra SELECT.
-- ============================================================
drop policy if exists "planes_dueno" on public.planes;

create policy "planes_dueno_insert" on public.planes
  for insert to public
  with check ((gimnasio_id = current_gimnasio_id()) and is_dueno() and gimnasio_permite_escritura());

create policy "planes_dueno_update" on public.planes
  for update to public
  using ((gimnasio_id = current_gimnasio_id()) and is_dueno())
  with check ((gimnasio_id = current_gimnasio_id()) and is_dueno() and gimnasio_permite_escritura());

create policy "planes_dueno_delete" on public.planes
  for delete to public
  using ((gimnasio_id = current_gimnasio_id()) and is_dueno());

-- ============================================================
-- ejercicios — ejercicios_select ya es superset (gimnasio_id IS NULL OR
-- = current, sin restricción de rol); se achica ejercicios_dueno.
-- ============================================================
drop policy if exists "ejercicios_dueno" on public.ejercicios;

create policy "ejercicios_dueno_insert" on public.ejercicios
  for insert to public
  with check ((gimnasio_id = current_gimnasio_id()) and is_dueno() and gimnasio_permite_escritura());

create policy "ejercicios_dueno_update" on public.ejercicios
  for update to public
  using ((gimnasio_id = current_gimnasio_id()) and is_dueno())
  with check ((gimnasio_id = current_gimnasio_id()) and is_dueno() and gimnasio_permite_escritura());

create policy "ejercicios_dueno_delete" on public.ejercicios
  for delete to public
  using ((gimnasio_id = current_gimnasio_id()) and is_dueno());

-- ============================================================
-- buzon_comentarios — fusiona SELECT (dueño del gym OR socio dueño del
-- comentario) en una sola policy.
-- ============================================================
drop policy if exists "dueno_select_gimnasio" on public.buzon_comentarios;
drop policy if exists "socio_select_propio" on public.buzon_comentarios;

create policy "buzon_comentarios_select" on public.buzon_comentarios
  for select to authenticated
  using (
    (
      (gimnasio_id = ( select profiles.gimnasio_id from profiles where profiles.id = (select auth.uid()) ))
      and ( ( select profiles.rol from profiles where profiles.id = (select auth.uid()) ) = 'dueno'::text )
    )
    or cliente_id = ( select clientes.id from clientes where clientes.profile_id = (select auth.uid()) limit 1 )
  );

-- ============================================================
-- pedidos_asistencia — fusiona SELECT y UPDATE (dueño del gym OR socio
-- dueño del pedido) en una sola policy por acción.
-- ============================================================
drop policy if exists "dueno_select_asistencia_gym" on public.pedidos_asistencia;
drop policy if exists "socio_select_asistencia_propia" on public.pedidos_asistencia;
drop policy if exists "dueno_update_asistencia_gym" on public.pedidos_asistencia;
drop policy if exists "socio_update_asistencia_propia" on public.pedidos_asistencia;

create policy "pedidos_asistencia_select" on public.pedidos_asistencia
  for select to authenticated
  using (
    (
      (gimnasio_id = ( select profiles.gimnasio_id from profiles where profiles.id = (select auth.uid()) ))
      and ( ( select profiles.rol from profiles where profiles.id = (select auth.uid()) ) = 'dueno'::text )
    )
    or cliente_id = ( select clientes.id from clientes where clientes.profile_id = (select auth.uid()) limit 1 )
  );

create policy "pedidos_asistencia_update" on public.pedidos_asistencia
  for update to authenticated
  using (
    (
      (gimnasio_id = ( select profiles.gimnasio_id from profiles where profiles.id = (select auth.uid()) ))
      and ( ( select profiles.rol from profiles where profiles.id = (select auth.uid()) ) = 'dueno'::text )
    )
    or cliente_id = ( select clientes.id from clientes where clientes.profile_id = (select auth.uid()) limit 1 )
  );
