-- Registra cuándo el dueño acepta los Términos y Condiciones al registrarse.
alter table public.profiles
  add column if not exists tyc_aceptado_en timestamptz;

comment on column public.profiles.tyc_aceptado_en is
  'Fecha/hora en que el usuario aceptó los Términos y Condiciones al registrarse.';
