-- 0025_tour_pago_dueno.sql
-- Flag para registrar si el dueño del gimnasio ya vio o cerró la guía/tour inicial del flujo de pagos.

alter table public.gimnasios
  add column if not exists tour_pago_visto boolean not null default false;

comment on column public.gimnasios.tour_pago_visto is
  'Indica si el dueño del gimnasio ya vio o cerró la guía/tour inicial del flujo de pago de planes.';
