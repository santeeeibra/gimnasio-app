-- ==============================================================================
-- 0046_partner_notifications.sql
-- Sistema de Notificaciones Internas para Partners SysGym
-- ==============================================================================

create table if not exists public.partner_notifications (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  tipo text not null check (tipo in ('nuevo_registro', 'gimnasio_pago', 'bono_alcanzado', 'retiro_pagado')),
  titulo text not null,
  mensaje text not null,
  leido boolean not null default false,
  metadata jsonb default '{}'::jsonb,
  creado_at timestamptz not null default now()
);

comment on table public.partner_notifications is
  'Notificaciones internas en la app para colaboradores/partners cuando un gimnasio se registra, paga o cobra un hito.';

create index if not exists partner_notifs_partner_idx
  on public.partner_notifications (partner_id, creado_at desc);

-- RLS
alter table public.partner_notifications enable row level security;

create policy "Partners ven sus notificaciones"
  on public.partner_notifications
  for select
  using (partner_id in (select id from public.partners where user_id = auth.uid()));

create policy "Partners pueden marcar como leidas sus notificaciones"
  on public.partner_notifications
  for update
  using (partner_id in (select id from public.partners where user_id = auth.uid()))
  with check (partner_id in (select id from public.partners where user_id = auth.uid()));
