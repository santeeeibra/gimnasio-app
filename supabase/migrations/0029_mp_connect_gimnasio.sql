-- Mercado Pago Connect: cada gimnasio Elite vincula SU cuenta de MP para que
-- el socio le pague directo. Los tokens son credenciales sensibles: sólo se
-- leen con service_role (createAdminClient). Ningún select desde un client
-- component debe pedir estas columnas.

alter table public.gimnasios
  add column if not exists mp_access_token  text,
  add column if not exists mp_refresh_token text,
  add column if not exists mp_collector_id  text,
  add column if not exists mp_vinculado_at  timestamptz;

comment on column public.gimnasios.mp_access_token is
  'OAuth MP Connect. NUNCA exponer a un client component.';
