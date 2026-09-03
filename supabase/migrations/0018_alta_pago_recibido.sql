-- Alta de socio con "Pago recibido":
--   * Si el dueño da de alta SIN marcar "Pago recibido", el socio queda creado
--     pero BLOQUEADO (acceso_habilitado = false): no puede usar la app hasta
--     que el dueño registre el primer pago.
--   * registrarPago() (y la conversión de día de prueba) pone
--     acceso_habilitado = true.
-- Idempotente.

alter table public.clientes
  add column if not exists acceso_habilitado boolean not null default true;

comment on column public.clientes.acceso_habilitado is
  'false = alta sin pago; el socio no puede entrar a la app hasta que el dueño registre el primer pago.';

-- Los socios ya existentes quedan habilitados (default true). Nada más que hacer.
