-- 0048_fix_gating_y_notificaciones_partner.sql
-- Corrige 3 bugs encontrados en el test E2E del Programa SysGym Partner +
-- Gating de Plan Inicial (ver reporte de la sesión, 2026-09-11).
-- Idempotente.

-- ═════════════════════════════════════════════════════════════
-- BUG 1 (crítico): trg_gimnasios_plan_basico_default (migración 0026) le
-- asigna el plan "Básico" (max_socios=50) a TODO gimnasio nuevo cuyo
-- plan_plataforma_id venga null desde el INSERT. Como registrarGimnasio()
-- (src/app/registro-gimnasio/actions.ts) nunca setea plan_plataforma_id,
-- ningún gimnasio nuevo queda "sin plan" -> gimnasio_puede_agregar_alumno()
-- y cupoSocios() nunca ven el Plan Inicial Gratuito: el cap de 40 alumnos y
-- el banner/CTA de upgrade quedan muertos para siempre.
--
-- Fix: el trigger de auto-asignación deja de correr en INSERT. Los
-- gimnasios nuevos quedan con plan_plataforma_id = null (Plan Inicial
-- Gratuito real, 40 alumnos, ver 0044_partners_program.sql). No se toca
-- ningún gimnasio ya existente (ni su plan_plataforma_id, ni pagos ya
-- hechos, ni el vencimiento) — la corrección es solo para altas nuevas.
-- ═════════════════════════════════════════════════════════════

drop trigger if exists trg_gimnasios_plan_basico_default on public.gimnasios;

comment on function public.asignar_plan_basico_default() is
  'OBSOLETA (2026-09-11): dejó de estar enganchada a un trigger. Asignaba '
  'el plan Básico a todo gimnasio nuevo y anulaba el Plan Inicial Gratuito '
  '(cap de 40 alumnos) del Programa Partner. Se conserva la función por si '
  'algún código la invoca a mano; no reactivar el trigger sin reconciliar '
  'con gimnasio_puede_agregar_alumno() / cupoSocios().';

-- ═════════════════════════════════════════════════════════════
-- BUG 2: los montos de los bonos ($20.000 / $60.000 / $100.000) se
-- corrompieron en las notificaciones de partner_notificar_pago_o_hito()
-- (migración 0047): el "$" seguido de dígitos desapareció de los mensajes
-- ("Alcanzado: +.000 ARS!" en vez de "Alcanzado: $20.000 ARS!"). Se
-- re-escribe la función completa con el texto correcto, usando un tag de
-- dollar-quoting con nombre ($body$) para no depender de que no haya
-- ningún "$" literal dentro del cuerpo.
--
-- BUG 3 (edge case menor): la función no filtraba por
-- tipo = 'plan_mensual' como sí hace trg_procesar_comision_partner
-- (0045), así que un cargo único (setup/premium) aprobado generaba la
-- notificación "¡Comisión acreditada!" aunque nunca se creó ninguna fila
-- en partner_commissions. Además, un pago recurrente (mes 2+, 100% para
-- SysGym) también disparaba ese mismo texto de "comisión acreditada"
-- pese a que trg_procesar_comision_partner ya no genera comisión desde el
-- 2do pago (solo comisiona el primero, 0045). Fix: solo se manda "¡Comisión
-- acreditada!" cuando efectivamente existe una fila en partner_commissions
-- para ese pago_plataforma_id (que ya corrió antes en la misma transacción,
-- porque el trigger de comisión se llama alfabéticamente antes que este).
-- Si el pago es válido pero no generó comisión (recurrente o cargo único),
-- se manda un aviso neutro sin prometer una comisión que no existe.
-- ═════════════════════════════════════════════════════════════

create or replace function public.partner_notificar_pago_o_hito()
returns trigger
language plpgsql
security definer
as $body$
declare
  v_partner_id   uuid;
  v_gym_nombre   text;
  v_gyms_pagos   int;
  v_comision     public.partner_commissions;
begin
  if new.estado = 'aprobado'
     and (old is null or old.estado is distinct from 'aprobado')
     and coalesce(new.tipo, 'plan_mensual') = 'plan_mensual' then

    select referred_by_partner_id, nombre into v_partner_id, v_gym_nombre
    from public.gimnasios
    where id = new.gimnasio_id;

    if v_partner_id is not null then
      -- trg_procesar_comision_partner (0045) corre antes en la misma
      -- transacción (orden alfabético de triggers: "pagos_plataforma_..."
      -- antes que "tr_partner_..."), así que si generó una comisión para
      -- este pago, ya está insertada acá.
      select * into v_comision
      from public.partner_commissions
      where pago_plataforma_id = new.id;

      if v_comision.id is not null then
        insert into public.partner_notifications (
          partner_id, tipo, titulo, mensaje, metadata
        ) values (
          v_partner_id,
          'gimnasio_pago',
          '¡Comisión acreditada!',
          'El gimnasio "' || coalesce(v_gym_nombre, 'Referido') ||
            '" realizó su primer pago. Se acreditó tu comisión de $' ||
            replace(to_char(round(v_comision.monto_comision_ars)::bigint, 'FM999,999,999'), ',', '.') ||
            ' ARS (' || v_comision.porcentaje || '%) en tu balance.',
          jsonb_build_object(
            'gimnasio_id', new.gimnasio_id,
            'monto_ars', new.monto_ars,
            'monto_comision_ars', v_comision.monto_comision_ars,
            'porcentaje', v_comision.porcentaje
          )
        );
      else
        -- Pago válido (renovación mensual desde el 2do mes: retención 100%
        -- para SysGym, sin comisión de partner) — se avisa igual, sin
        -- prometer un monto que no se acreditó.
        insert into public.partner_notifications (
          partner_id, tipo, titulo, mensaje, metadata
        ) values (
          v_partner_id,
          'gimnasio_pago',
          'Tu gimnasio referido renovó su plan',
          'El gimnasio "' || coalesce(v_gym_nombre, 'Referido') ||
            '" renovó su suscripción. A partir del 2do mes la cuota es '
            '100% para SysGym, sin comisión adicional para vos.',
          jsonb_build_object('gimnasio_id', new.gimnasio_id, 'monto_ars', new.monto_ars)
        );
      end if;

      -- Notificaciones de hitos (5 / 10 / 15 gimnasios con pago activo).
      select count(*) into v_gyms_pagos
      from public.gimnasios g
      where g.referred_by_partner_id = v_partner_id
        and public.gimnasio_es_pago_activo(g.id);

      if v_gyms_pagos = 5 then
        insert into public.partner_notifications (partner_id, tipo, titulo, mensaje, metadata)
        values (
          v_partner_id,
          'bono_alcanzado',
          '🏆 ¡Hito 1 Alcanzado: $20.000 ARS!',
          '¡Felicitaciones! Alcanzaste 5 gimnasios con pago activo. Se acreditó tu bono de $20.000 ARS.',
          jsonb_build_object('milestone', 5, 'bono_ars', 20000)
        );
      elsif v_gyms_pagos = 10 then
        insert into public.partner_notifications (partner_id, tipo, titulo, mensaje, metadata)
        values (
          v_partner_id,
          'bono_alcanzado',
          '🏆 ¡Hito 2 Alcanzado: $60.000 ARS!',
          '¡Imparable! Llegaste a 10 gimnasios activos. Tu bono de $60.000 ARS ya está en tu saldo disponible.',
          jsonb_build_object('milestone', 10, 'bono_ars', 60000)
        );
      elsif v_gyms_pagos = 15 then
        insert into public.partner_notifications (partner_id, tipo, titulo, mensaje, metadata)
        values (
          v_partner_id,
          'bono_alcanzado',
          '💎 ¡NIVEL MÁXIMO: Embajador Black $100.000 ARS!',
          '¡Histórico! Consolidaste 15 gimnasios. Acreditamos tu premio de $100.000 ARS. ¡Completaste todos los hitos!',
          jsonb_build_object('milestone', 15, 'bono_ars', 100000)
        );
      end if;
    end if;
  end if;

  return new;
end;
$body$;

drop trigger if exists tr_partner_notificar_pago on public.pagos_plataforma;
create trigger tr_partner_notificar_pago
  after insert or update of estado on public.pagos_plataforma
  for each row
  execute function public.partner_notificar_pago_o_hito();
