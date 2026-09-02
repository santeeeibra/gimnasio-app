-- SPEC_GESTOR_MOROSIDAD.md — aviso push automático al socio X días antes de que
-- venza su cuota. X configurable por gimnasio; dedupe por ciclo en el cliente.

-- Días antes del vencimiento en que se avisa al socio (rango razonable 1-15).
alter table public.gimnasios
  add column if not exists dias_aviso_morosidad int not null default 5
  check (dias_aviso_morosidad between 1 and 15);

-- Fecha del último aviso de morosidad enviado a este cliente. Se resetea a null
-- al registrar un pago / renovación para habilitar el aviso del próximo ciclo.
alter table public.clientes
  add column if not exists ultimo_aviso_morosidad_enviado_en date;
