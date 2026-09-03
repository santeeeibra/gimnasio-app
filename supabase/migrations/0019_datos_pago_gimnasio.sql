-- Datos para que el socio transfiera la cuota: alias / CBU / titular por
-- gimnasio (antes eran globales por env PAGO_ALIAS / PAGO_TITULAR).
-- El dueño los carga en /panel/ajustes y el socio los ve (con botón de copiar)
-- en la app. Todos nullable: sin cargar, no se muestra la tarjeta.
-- Idempotente.

alter table public.gimnasios
  add column if not exists pago_alias   text,
  add column if not exists pago_cbu     text,
  add column if not exists pago_titular text;

comment on column public.gimnasios.pago_alias is
  'Alias de transferencia que ve el socio en la app.';
comment on column public.gimnasios.pago_cbu is
  'CBU/CVU de transferencia que ve el socio en la app.';
comment on column public.gimnasios.pago_titular is
  'Nombre del titular de la cuenta, para que el socio confirme a quién transfiere.';
