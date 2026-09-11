-- ==============================================================================
-- 0047_partner_notifications_trigger.sql
-- Disparar notificaciones automáticas al Partner cuando un gimnasio paga o logra hitos
-- ==============================================================================

create or replace function public.partner_notificar_pago_o_hito()
returns trigger
language plpgsql
security definer
as $
declare
  v_partner_id uuid;
  v_gym_nombre text;
  v_gyms_pagos int;
begin
  if new.estado = 'aprobado' and (old is null or old.estado <> 'aprobado') then
    select referred_by_partner_id, nombre into v_partner_id, v_gym_nombre
    from public.gimnasios
    where id = new.gimnasio_id;

    if v_partner_id is not null then
      -- 1. Notificación de pago y comisión acreditada
      insert into public.partner_notifications (
        partner_id,
        tipo,
        titulo,
        mensaje,
        metadata
      ) values (
        v_partner_id,
        'gimnasio_pago',
        '¡Comisión acreditada!',
        'El gimnasio "' || coalesce(v_gym_nombre, 'Referido') || '" realizó un pago. Tu comisión ya está acreditada en tu balance.',
        jsonb_build_object('gimnasio_id', new.gimnasio_id, 'monto_ars', new.monto_ars)
      );

      -- 2. Notificaciones de hitos si aplica
      select count(*) into v_gyms_pagos
      from public.gimnasios g
      where g.referred_by_partner_id = v_partner_id
        and public.gimnasio_es_pago_activo(g.id);

      if v_gyms_pagos = 5 then
        insert into public.partner_notifications (partner_id, tipo, titulo, mensaje, metadata)
        values (
          v_partner_id,
          'bono_alcanzado',
          '🏆 ¡Hito 1 Alcanzado: +.000 ARS!',
          '¡Felicitaciones! Alcanzaste 5 gimnasios con pago activo. Se acreditó tu bono de .000 ARS.',
          jsonb_build_object('milestone', 5, 'bono_ars', 20000)
        );
      elsif v_gyms_pagos = 10 then
        insert into public.partner_notifications (partner_id, tipo, titulo, mensaje, metadata)
        values (
          v_partner_id,
          'bono_alcanzado',
          '🏆 ¡Hito 2 Alcanzado: +.000 ARS!',
          '¡Imparable! Llegaste a 10 gimnasios activos. Tu bono de .000 ARS ya está en tu saldo disponible.',
          jsonb_build_object('milestone', 10, 'bono_ars', 60000)
        );
      elsif v_gyms_pagos = 15 then
        insert into public.partner_notifications (partner_id, tipo, titulo, mensaje, metadata)
        values (
          v_partner_id,
          'bono_alcanzado',
          '💎 ¡NIVEL MÁXIMO: Embajador Black +.000 ARS!',
          '¡Histórico! Consolidaste 15 gimnasios. Acreditamos tu premio de .000 ARS. ¡Completaste todos los hitos!',
          jsonb_build_object('milestone', 15, 'bono_ars', 100000)
        );
      end if;
    end if;
  end if;

  return new;
end;
$;

drop trigger if exists tr_partner_notificar_pago on public.pagos_plataforma;
create trigger tr_partner_notificar_pago
  after insert or update of estado on public.pagos_plataforma
  for each row
  execute function public.partner_notificar_pago_o_hito();
