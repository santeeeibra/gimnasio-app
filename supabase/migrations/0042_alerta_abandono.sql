-- Fase 2 — Métricas de uso y retención.
-- Alerta de abandono: socio con cuota al día que dejó de registrar
-- entrenamientos hace más de 10 días. El cron diario avisa al dueño.
-- Migración 0042.

alter table public.clientes
  add column if not exists ultimo_aviso_abandono_enviado_en date;

comment on column public.clientes.ultimo_aviso_abandono_enviado_en is
  'Última fecha en que el cron avisó al dueño que este socio está inactivo. Dedupe: no se reenvía si el último aviso fue hace menos de 7 días.';
