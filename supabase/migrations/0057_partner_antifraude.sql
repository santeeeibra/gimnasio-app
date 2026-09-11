-- Anti-fraude del programa Partner (sección 5 de PLAN_PARTNERS_Y_GATING.md).
-- Reglas duras que faltaban en el esquema:
--   B1. Comisión nace 'pendiente' con hold de 10 días antes de ser pagable
--       (partner_balance() solo suma 'aprobada'). Se revierte sola si el
--       pago_plataforma que la originó deja de estar 'aprobado'.
--   B2. Cambio de alias/CBU de cobro exige cooldown de 48h antes de poder
--       usarse en un retiro (partners.datos_cobro_actualizados_at).
--   B3. Todo cambio de estado de comisión/payout queda en admin_audit_log
--       (mismo patrón que cambiar_estado_gym).
-- Idempotente.

-- ═════════════════════════════════════════════════════════════
-- 1) Hold de comisiones: estado + fecha de liberación
-- ═════════════════════════════════════════════════════════════

alter table public.partner_commissions
  add column if not exists estado text not null default 'pendiente'
    check (estado in ('pendiente', 'aprobada', 'revertida'));

alter table public.partner_commissions
  add column if not exists disponible_desde timestamptz not null default (now() + interval '10 days');

alter table public.partner_commissions
  add column if not exists revertida_at timestamptz;

comment on column public.partner_commissions.estado is
  'pendiente = dentro del hold de 10 días; aprobada = ya computa para partner_balance(); revertida = el pago original dejó de estar aprobado.';

-- Recalcular balance: solo comisiones 'aprobada' + bonos - retiros.
create or replace function public.partner_balance(p_partner_id uuid)
returns numeric
language sql
stable
as $$
  select
    coalesce((select sum(monto_comision_ars) from public.partner_commissions where partner_id = p_partner_id and estado = 'aprobada'), 0)
    + coalesce((select sum(bono_ars) from public.partner_milestone_awards where partner_id = p_partner_id), 0)
    - coalesce((select sum(monto_ars) from public.partner_payouts where partner_id = p_partner_id and estado in ('pendiente', 'pagado')), 0);
$$;

-- Libera comisiones cuyo hold ya venció. Pensado para correr desde un cron
-- diario (junto con /api/cron/cuotas) o manualmente. security definer porque
-- las policies de partner_commissions no tienen update para nadie.
create or replace function public.partner_liberar_comisiones_vencidas()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  update public.partner_commissions
  set estado = 'aprobada'
  where estado = 'pendiente'
    and disponible_desde <= now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function public.partner_liberar_comisiones_vencidas() is
  'Pasa a aprobada toda comisión pendiente cuyo hold de 10 días ya venció. Llamar desde un cron diario.';

-- Si el pago_plataforma que originó una comisión deja de estar 'aprobado'
-- (corrección del admin, ej. rechazar_pago_plataforma sobre un pago ya
-- aprobado por error), la comisión se revierte automáticamente y deja de
-- contar en el balance. No se borra el registro: queda trazabilidad.
create or replace function public.trg_revertir_comision_si_pago_deja_de_estar_aprobado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.estado = 'aprobado' and new.estado is distinct from 'aprobado' then
    update public.partner_commissions
    set estado = 'revertida',
        revertida_at = now()
    where pago_plataforma_id = new.id
      and estado in ('pendiente', 'aprobada');
  end if;
  return new;
end;
$$;

drop trigger if exists pagos_plataforma_revertir_comision on public.pagos_plataforma;
create trigger pagos_plataforma_revertir_comision
  after update on public.pagos_plataforma
  for each row execute function public.trg_revertir_comision_si_pago_deja_de_estar_aprobado();

-- ═════════════════════════════════════════════════════════════
-- 2) Cooldown de 48h para cambio de alias/CBU de cobro
-- ═════════════════════════════════════════════════════════════

alter table public.partners
  add column if not exists datos_cobro_actualizados_at timestamptz;

comment on column public.partners.datos_cobro_actualizados_at is
  'Última vez que cambió cbu_cvu/alias_mp. Un retiro no puede pedirse hasta 48h después (previene robo de sesión → redirección de payout).';
