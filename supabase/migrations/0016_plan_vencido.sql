-- Fase 5 de PLAN_PLANES_PLATAFORMA.md: cuando el período pago de un gimnasio
-- vence (plan_plataforma_vence_el en el pasado), pasa a solo_lectura, igual
-- que un trial vencido. Solo toca gimnasios en 'activo' (los 'prueba' los
-- maneja chequear_trial_vencido; los 'solo_lectura' ya están bloqueados).
-- La llama el cron diario (src/app/api/cron/cuotas/route.ts) vía rpc.
-- Idempotente.

create or replace function chequear_plan_vencido()
returns void language sql as $$
  update public.gimnasios
  set estado = 'solo_lectura'
  where estado = 'activo'
    and plan_plataforma_vence_el is not null
    and plan_plataforma_vence_el < current_date;
$$;
