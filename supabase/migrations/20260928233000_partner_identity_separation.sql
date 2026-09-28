-- PR2: la membresía comercial vive en partners.user_id; profiles conserva
-- exclusivamente identidades de gimnasio. Esta migración no borra historial.

alter table public.partners
  add column if not exists whatsapp text,
  add column if not exists ciudad text,
  add column if not exists provincia text,
  add column if not exists terminos_version text,
  add column if not exists terminos_aceptados_at timestamptz,
  add column if not exists actualizado_at timestamptz not null default now(),
  add column if not exists legacy_profile_disabled_at timestamptz;

-- Borrar/desvincular auth.users no debe borrar la identidad comercial ni su
-- ledger. El partner queda sin login hasta que soporte lo relacione con otra
-- cuenta. No existe DELETE de partners expuesto a cliente.
alter table public.partners alter column user_id drop not null;
alter table public.partners drop constraint if exists partners_user_id_fkey;
alter table public.partners
  add constraint partners_user_id_fkey foreign key (user_id)
  references auth.users (id) on delete set null;

-- El ledger comercial sobrevive también al borrado posterior del gimnasio o
-- del pago que lo originó. Los importes y snapshots permanecen auditables.
alter table public.partner_commissions alter column gimnasio_id drop not null;
alter table public.partner_commissions alter column pago_plataforma_id drop not null;
alter table public.partner_commissions drop constraint if exists partner_commissions_gimnasio_id_fkey;
alter table public.partner_commissions drop constraint if exists partner_commissions_pago_plataforma_id_fkey;
alter table public.partner_commissions
  add constraint partner_commissions_gimnasio_id_fkey foreign key (gimnasio_id)
  references public.gimnasios(id) on delete set null;
alter table public.partner_commissions
  add constraint partner_commissions_pago_plataforma_id_fkey foreign key (pago_plataforma_id)
  references public.pagos_plataforma(id) on delete set null;

-- Rol de archivo: conserva la fila histórica sin convertirla en socio ni
-- conceder permisos de gimnasio. Incluye entrenador, ya aplicado bajo
-- 20260927100012_rol_entrenador.
alter table public.profiles drop constraint if exists profiles_rol_check;
alter table public.profiles add constraint profiles_rol_check check (
  rol in ('dueno', 'cliente', 'staff', 'entrenador', 'partner_legacy_disabled')
);

-- Detección deliberadamente conservadora del scaffold que creó el viejo
-- /registro-partner. Un caso que no cumpla TODO queda para revisión manual.
create temporary table _partner_legacy_profiles on commit drop as
select p.id as partner_id, pr.id as profile_id
from public.partners p
join public.profiles pr on pr.id = p.user_id
join public.gimnasios g on g.id = pr.gimnasio_id
where pr.rol = 'dueno'
  and coalesce(pr.activo, true) = true
  and g.tipo_cuenta = 'individual'
  and g.slug = 'partner-' || left(p.user_id::text, 8)
  and g.nombre = 'Partner: ' || p.nombre
  and g.referred_by_partner_id is null
  and (p.email is null or pr.email_recuperacion = p.email)
  and abs(extract(epoch from (pr.creado_at - g.creado_at))) <= 1800
  and abs(extract(epoch from (p.creado_at - g.creado_at))) <= 1800
  and (select count(*) from public.profiles px where px.gimnasio_id = g.id) = 1
  and (select count(*) from public.clientes cx where cx.gimnasio_id = g.id) = 1
  and exists (
    select 1 from public.clientes c
    where c.gimnasio_id = g.id and c.profile_id = pr.id
  );

update public.profiles pr
set activo = false,
    rol = 'partner_legacy_disabled',
    permisos = '{}'::jsonb
from _partner_legacy_profiles legacy
where pr.id = legacy.profile_id;

update public.partners p
set legacy_profile_disabled_at = now(), actualizado_at = now()
from _partner_legacy_profiles legacy
where p.id = legacy.partner_id;

-- Un perfil inactivo no aporta contexto RLS aunque la sesión Auth siga viva.
create or replace function public.current_gimnasio_id()
returns uuid language sql stable security definer set search_path = public as $$
  select gimnasio_id from profiles
  where id = auth.uid() and activo = true and rol <> 'partner_legacy_disabled'
$$;

create or replace function public.current_cliente_id()
returns uuid language sql stable security definer set search_path = public as $$
  select c.id
  from clientes c
  join profiles p on p.id = c.profile_id
  where c.profile_id = auth.uid()
    and p.activo = true
    and p.rol <> 'partner_legacy_disabled'
$$;

create or replace function public.is_dueno()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and rol = 'dueno' and activo = true
  )
$$;

create or replace function public.is_staff_o_dueno()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and rol in ('dueno', 'staff') and activo = true
  )
$$;

-- El audit administrativo admite como actor una identidad de gimnasio o una
-- identidad Partner, nunca ambas. Así los nuevos partners no necesitan profile.
alter table public.admin_audit_log alter column actor_id drop not null;
alter table public.admin_audit_log
  add column if not exists partner_id uuid references public.partners(id) on delete restrict;
alter table public.admin_audit_log
  drop constraint if exists admin_audit_log_exactly_one_actor_chk;
alter table public.admin_audit_log
  add constraint admin_audit_log_exactly_one_actor_chk check (
    (actor_id is not null) <> (partner_id is not null)
  );

-- La Data API solo expone lecturas propias. Mutaciones sensibles siguen en
-- acciones server-side autenticadas y filtradas por partners.user_id.
revoke insert, update, delete on table public.partners from public, anon, authenticated;
grant select on table public.partners to authenticated;
drop policy if exists "partners_select_own" on public.partners;
create policy "partners_select_own" on public.partners
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke insert, update, delete on table public.partner_commissions from public, anon, authenticated;
revoke insert, update, delete on table public.partner_milestone_awards from public, anon, authenticated;
revoke insert, update, delete on table public.partner_payouts from public, anon, authenticated;
revoke insert, update, delete on table public.partner_tiers from public, anon, authenticated;
grant select on table public.partner_commissions to authenticated;
grant select on table public.partner_milestone_awards to authenticated;
grant select on table public.partner_payouts to authenticated;

drop policy if exists "partner_commissions_select_own" on public.partner_commissions;
create policy "partner_commissions_select_own" on public.partner_commissions
  for select to authenticated using (
    partner_id in (select id from public.partners where user_id = (select auth.uid()))
  );
drop policy if exists "partner_milestones_select_own" on public.partner_milestone_awards;
create policy "partner_milestones_select_own" on public.partner_milestone_awards
  for select to authenticated using (
    partner_id in (select id from public.partners where user_id = (select auth.uid()))
  );
drop policy if exists "partner_payouts_select_own" on public.partner_payouts;
create policy "partner_payouts_select_own" on public.partner_payouts
  for select to authenticated using (
    partner_id in (select id from public.partners where user_id = (select auth.uid()))
  );

-- Notificaciones: el Partner solo puede marcar leido en sus propias filas.
revoke insert, update, delete on table public.partner_notifications from public, anon, authenticated;
grant select, update (leido) on table public.partner_notifications to authenticated;
drop policy if exists "Partners ven sus notificaciones" on public.partner_notifications;
drop policy if exists "Partners pueden marcar como leidas sus notificaciones" on public.partner_notifications;
create policy "partner_notifications_select_own" on public.partner_notifications
  for select to authenticated using (
    partner_id in (select id from public.partners where user_id = (select auth.uid()))
  );
create policy "partner_notifications_update_own" on public.partner_notifications
  for update to authenticated
  using (partner_id in (select id from public.partners where user_id = (select auth.uid()) and estado = 'activo'))
  with check (partner_id in (select id from public.partners where user_id = (select auth.uid()) and estado = 'activo'));

-- Mensajes: puede crear mensajes propios y marcar leídos, sin reescribir
-- autor/cuerpo/partner_id de mensajes existentes.
revoke insert, update, delete on table public.partner_mensajes from public, anon, authenticated;
grant select on table public.partner_mensajes to authenticated;
grant insert (partner_id, autor, cuerpo) on table public.partner_mensajes to authenticated;
grant update (leido) on table public.partner_mensajes to authenticated;
drop policy if exists "partner_mensajes_select_own" on public.partner_mensajes;
drop policy if exists "partner_mensajes_insert_own" on public.partner_mensajes;
drop policy if exists "partner_mensajes_update_own" on public.partner_mensajes;
create policy "partner_mensajes_select_own" on public.partner_mensajes
  for select to authenticated using (
    partner_id in (select id from public.partners where user_id = (select auth.uid()))
  );
create policy "partner_mensajes_insert_own" on public.partner_mensajes
  for insert to authenticated with check (
    autor = 'partner'
    and partner_id in (select id from public.partners where user_id = (select auth.uid()) and estado = 'activo')
  );
create policy "partner_mensajes_update_own" on public.partner_mensajes
  for update to authenticated
  using (partner_id in (select id from public.partners where user_id = (select auth.uid()) and estado = 'activo'))
  with check (partner_id in (select id from public.partners where user_id = (select auth.uid()) and estado = 'activo'));

-- Push Partner: ownership derivado de auth.uid y mutaciones bloqueadas al
-- suspender la membresía. La policy de profiles sigue cubriendo usuarios gym.
drop policy if exists push_subscriptions_partner_own on public.push_subscriptions;
create policy push_subscriptions_partner_own on public.push_subscriptions
  for all to authenticated
  using (partner_id in (
    select id from public.partners where user_id = (select auth.uid()) and estado = 'activo'
  ))
  with check (partner_id in (
    select id from public.partners where user_id = (select auth.uid()) and estado = 'activo'
  ));

grant update on table public.partners to service_role;
