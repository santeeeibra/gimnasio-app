-- 0054_fix_rls_performance.sql
-- Fix Supabase performance advisors antes de escalar con partners dando de alta gyms:
--   1) auth_rls_initplan (WARN, 28 hallazgos): las policies llamaban a auth.uid()
--      "pelado", lo que hace que Postgres lo re-evalúe fila por fila. Se envuelve
--      en (select auth.uid()) para que se evalúe una sola vez por query (initplan).
--      Mismo texto de policy (USING/WITH CHECK), mismos roles y comando: no cambia
--      permisos, solo performance a escala.
--   2) duplicate_index (WARN, 2 hallazgos): registros_entrada tenía índices
--      duplicados (mismas columnas, distinto nombre) — se borran los sobrantes.
-- Idempotente: usa DROP POLICY/INDEX IF EXISTS + recrea con CREATE POLICY.

-- ============================================================
-- 1) auth_rls_initplan — envolver auth.uid() en (select auth.uid())
-- ============================================================

-- buzon_comentarios ------------------------------------------------
drop policy if exists "dueno_delete_gimnasio" on public.buzon_comentarios;
create policy "dueno_delete_gimnasio" on public.buzon_comentarios
  for delete to authenticated
  using (
    (gimnasio_id = ( select profiles.gimnasio_id from profiles where profiles.id = (select auth.uid()) ))
    and ( ( select profiles.rol from profiles where profiles.id = (select auth.uid()) ) = 'dueno'::text )
  );

drop policy if exists "dueno_select_gimnasio" on public.buzon_comentarios;
create policy "dueno_select_gimnasio" on public.buzon_comentarios
  for select to authenticated
  using (
    (gimnasio_id = ( select profiles.gimnasio_id from profiles where profiles.id = (select auth.uid()) ))
    and ( ( select profiles.rol from profiles where profiles.id = (select auth.uid()) ) = 'dueno'::text )
  );

drop policy if exists "dueno_update_gimnasio" on public.buzon_comentarios;
create policy "dueno_update_gimnasio" on public.buzon_comentarios
  for update to authenticated
  using (
    (gimnasio_id = ( select profiles.gimnasio_id from profiles where profiles.id = (select auth.uid()) ))
    and ( ( select profiles.rol from profiles where profiles.id = (select auth.uid()) ) = 'dueno'::text )
  );

drop policy if exists "socio_insert" on public.buzon_comentarios;
create policy "socio_insert" on public.buzon_comentarios
  for insert to authenticated
  with check (
    (gimnasio_id = ( select profiles.gimnasio_id from profiles where profiles.id = (select auth.uid()) ))
    and (cliente_id = ( select clientes.id from clientes where clientes.profile_id = (select auth.uid()) limit 1 ))
  );

drop policy if exists "socio_select_propio" on public.buzon_comentarios;
create policy "socio_select_propio" on public.buzon_comentarios
  for select to authenticated
  using (
    cliente_id = ( select clientes.id from clientes where clientes.profile_id = (select auth.uid()) limit 1 )
  );

-- clientes -----------------------------------------------------------
drop policy if exists "clientes_select" on public.clientes;
create policy "clientes_select" on public.clientes
  for select to public
  using (
    (gimnasio_id = current_gimnasio_id())
    and (is_dueno() or profile_id = (select auth.uid()))
  );

drop policy if exists "clientes_update_propio" on public.clientes;
create policy "clientes_update_propio" on public.clientes
  for update to public
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

-- mensaje_destinatarios ------------------------------------------------
drop policy if exists "md_select" on public.mensaje_destinatarios;
create policy "md_select" on public.mensaje_destinatarios
  for select to public
  using (
    profile_id = (select auth.uid())
    or (mensaje_gimnasio(mensaje_id) = current_gimnasio_id() and is_dueno())
  );

drop policy if exists "md_update_leido" on public.mensaje_destinatarios;
create policy "md_update_leido" on public.mensaje_destinatarios
  for update to public
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

-- mensaje_respuestas -----------------------------------------------------
drop policy if exists "resp_insert" on public.mensaje_respuestas;
create policy "resp_insert" on public.mensaje_respuestas
  for insert to public
  with check (
    autor_id = (select auth.uid())
    and mensaje_respondible(mensaje_id)
    and (mensaje_remitente(mensaje_id) = (select auth.uid()) or soy_destinatario(mensaje_id))
    and gimnasio_permite_escritura()
  );

drop policy if exists "resp_select" on public.mensaje_respuestas;
create policy "resp_select" on public.mensaje_respuestas
  for select to public
  using (
    mensaje_remitente(mensaje_id) = (select auth.uid())
    or soy_destinatario(mensaje_id)
  );

-- mensajes ---------------------------------------------------------------
drop policy if exists "mensajes_dueno_insert" on public.mensajes;
create policy "mensajes_dueno_insert" on public.mensajes
  for insert to public
  with check (
    (gimnasio_id = current_gimnasio_id())
    and is_dueno()
    and remitente_id = (select auth.uid())
    and gimnasio_permite_escritura()
  );

drop policy if exists "mensajes_select" on public.mensajes;
create policy "mensajes_select" on public.mensajes
  for select to public
  using (
    (gimnasio_id = current_gimnasio_id())
    and (remitente_id = (select auth.uid()) or soy_destinatario(id))
  );

-- partner_commissions ------------------------------------------------------
drop policy if exists "partner_commissions_select_own" on public.partner_commissions;
create policy "partner_commissions_select_own" on public.partner_commissions
  for select to public
  using (
    partner_id in ( select partners.id from partners where partners.user_id = (select auth.uid()) )
  );

-- partner_milestone_awards -------------------------------------------------
drop policy if exists "partner_milestones_select_own" on public.partner_milestone_awards;
create policy "partner_milestones_select_own" on public.partner_milestone_awards
  for select to public
  using (
    partner_id in ( select partners.id from partners where partners.user_id = (select auth.uid()) )
  );

-- partner_notifications -----------------------------------------------------
drop policy if exists "Partners pueden marcar como leidas sus notificaciones" on public.partner_notifications;
create policy "Partners pueden marcar como leidas sus notificaciones" on public.partner_notifications
  for update to public
  using (
    partner_id in ( select partners.id from partners where partners.user_id = (select auth.uid()) )
  )
  with check (
    partner_id in ( select partners.id from partners where partners.user_id = (select auth.uid()) )
  );

drop policy if exists "Partners ven sus notificaciones" on public.partner_notifications;
create policy "Partners ven sus notificaciones" on public.partner_notifications
  for select to public
  using (
    partner_id in ( select partners.id from partners where partners.user_id = (select auth.uid()) )
  );

-- partner_payouts -------------------------------------------------------
drop policy if exists "partner_payouts_select_own" on public.partner_payouts;
create policy "partner_payouts_select_own" on public.partner_payouts
  for select to public
  using (
    partner_id in ( select partners.id from partners where partners.user_id = (select auth.uid()) )
  );

-- partners ----------------------------------------------------------------
drop policy if exists "partners_select_own" on public.partners;
create policy "partners_select_own" on public.partners
  for select to public
  using (user_id = (select auth.uid()));

-- pedidos_asistencia ---------------------------------------------------------
drop policy if exists "dueno_select_asistencia_gym" on public.pedidos_asistencia;
create policy "dueno_select_asistencia_gym" on public.pedidos_asistencia
  for select to authenticated
  using (
    (gimnasio_id = ( select profiles.gimnasio_id from profiles where profiles.id = (select auth.uid()) ))
    and ( ( select profiles.rol from profiles where profiles.id = (select auth.uid()) ) = 'dueno'::text )
  );

drop policy if exists "dueno_update_asistencia_gym" on public.pedidos_asistencia;
create policy "dueno_update_asistencia_gym" on public.pedidos_asistencia
  for update to authenticated
  using (
    (gimnasio_id = ( select profiles.gimnasio_id from profiles where profiles.id = (select auth.uid()) ))
    and ( ( select profiles.rol from profiles where profiles.id = (select auth.uid()) ) = 'dueno'::text )
  );

drop policy if exists "socio_insert_asistencia" on public.pedidos_asistencia;
create policy "socio_insert_asistencia" on public.pedidos_asistencia
  for insert to authenticated
  with check (
    (gimnasio_id = ( select profiles.gimnasio_id from profiles where profiles.id = (select auth.uid()) ))
    and (cliente_id = ( select clientes.id from clientes where clientes.profile_id = (select auth.uid()) limit 1 ))
  );

drop policy if exists "socio_select_asistencia_propia" on public.pedidos_asistencia;
create policy "socio_select_asistencia_propia" on public.pedidos_asistencia
  for select to authenticated
  using (
    cliente_id = ( select clientes.id from clientes where clientes.profile_id = (select auth.uid()) limit 1 )
  );

drop policy if exists "socio_update_asistencia_propia" on public.pedidos_asistencia;
create policy "socio_update_asistencia_propia" on public.pedidos_asistencia
  for update to authenticated
  using (
    cliente_id = ( select clientes.id from clientes where clientes.profile_id = (select auth.uid()) limit 1 )
  );

-- profiles -----------------------------------------------------------------
drop policy if exists "prof_select" on public.profiles;
create policy "prof_select" on public.profiles
  for select to public
  using (
    id = (select auth.uid())
    or (gimnasio_id = current_gimnasio_id() and is_dueno())
  );

drop policy if exists "prof_update_self" on public.profiles;
create policy "prof_update_self" on public.profiles
  for update to public
  using (id = (select auth.uid()));

-- push_subscriptions ---------------------------------------------------------
drop policy if exists "push_own" on public.push_subscriptions;
create policy "push_own" on public.push_subscriptions
  for all to public
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

-- timer_push_pendiente -------------------------------------------------------
drop policy if exists "socio_maneja_su_timer_push" on public.timer_push_pendiente;
create policy "socio_maneja_su_timer_push" on public.timer_push_pendiente
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

-- ============================================================
-- 2) duplicate_index — borrar índices sobrantes en registros_entrada
-- ============================================================

drop index if exists public.registros_entrada_cliente_idx;
drop index if exists public.registros_entrada_gim_creado_idx;
drop index if exists public.registros_entrada_gim_fecha_idx;
