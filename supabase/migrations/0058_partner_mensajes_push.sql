-- Push + mensajería para partners (antes no tenían profile_id, quedaban
-- afuera de push_subscriptions/mensajes). Reusa el mismo enviarPush() pero
-- por partner_id, y agrega una bandeja simple partner<->admin (no se pisa
-- la tabla `mensajes`, que está atada a gimnasio_id/profile_id not-null).

-- 1) push_subscriptions: permitir suscripción también por partner_id.
alter table public.push_subscriptions
  alter column profile_id drop not null,
  add column if not exists partner_id uuid references public.partners (id) on delete cascade;

alter table public.push_subscriptions
  add constraint push_subscriptions_owner_chk
  check (
    (profile_id is not null and partner_id is null)
    or (profile_id is null and partner_id is not null)
  );

create index if not exists push_subscriptions_partner_idx
  on public.push_subscriptions (partner_id);

-- RLS de push_subscriptions ya existente cubre profile_id; sumamos partner.
drop policy if exists push_subscriptions_partner_own on public.push_subscriptions;
create policy push_subscriptions_partner_own on public.push_subscriptions
  for all
  using (partner_id in (select id from public.partners where user_id = (select auth.uid())))
  with check (partner_id in (select id from public.partners where user_id = (select auth.uid())));

-- 2) Bandeja partner <-> admin (chica, sin destinatarios múltiples).
create table if not exists public.partner_mensajes (
  id         uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  autor      text not null check (autor in ('admin', 'partner')),
  cuerpo     text not null,
  leido      boolean not null default false,
  creado_at  timestamptz not null default now()
);

create index if not exists partner_mensajes_partner_idx
  on public.partner_mensajes (partner_id, creado_at desc);

alter table public.partner_mensajes enable row level security;

drop policy if exists partner_mensajes_select_own on public.partner_mensajes;
create policy partner_mensajes_select_own on public.partner_mensajes
  for select
  using (partner_id in (select id from public.partners where user_id = (select auth.uid())));

drop policy if exists partner_mensajes_insert_own on public.partner_mensajes;
create policy partner_mensajes_insert_own on public.partner_mensajes
  for insert
  with check (
    autor = 'partner'
    and partner_id in (select id from public.partners where user_id = (select auth.uid()))
  );

-- Marcar como leídos los mensajes del admin (autor='admin') que le llegan al partner.
drop policy if exists partner_mensajes_update_own on public.partner_mensajes;
create policy partner_mensajes_update_own on public.partner_mensajes
  for update
  using (partner_id in (select id from public.partners where user_id = (select auth.uid())))
  with check (partner_id in (select id from public.partners where user_id = (select auth.uid())));

comment on table public.partner_mensajes is
  'Bandeja simple admin<->partner. Los mensajes autor=admin los escribe una Server Action con service_role.';
