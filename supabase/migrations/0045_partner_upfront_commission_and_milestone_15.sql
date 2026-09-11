-- Migración 0045: Fast-Start Bonus (20% primeros 5 gyms, 15% siguientes)
-- + Bonos reajustados por hitos: 5 ($20k), 10 ($60k), 15 ($100k).
-- Solo comisiona el primer pago de cada gimnasio. Del mes 2 en adelante 100% SysGym.

-- 1. Ampliar constraint de hitos para permitir hito 15
alter table public.partner_milestone_awards
  drop constraint if exists partner_milestone_awards_milestone_check;

alter table public.partner_milestone_awards
  add constraint partner_milestone_awards_milestone_check
  check (milestone in (5, 10, 15));

-- 2. Actualizar trigger para comisionar SOLO en el primer pago de cada gimnasio
--    con escala 20% (primeros 5 gyms) y 15% (resto).
create or replace function public.trg_procesar_comision_partner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner_id        uuid;
  v_pct               numeric := 15;
  v_monto             numeric;
  v_gyms_pagos        int;
  v_ya_comisiono_gym  boolean;
  v_cant_comisiones   int;
begin
  if new.estado = 'aprobado'
     and old.estado is distinct from 'aprobado'
     and coalesce(new.tipo, 'plan_mensual') = 'plan_mensual' then

    select referred_by_partner_id into v_partner_id
    from public.gimnasios
    where id = new.gimnasio_id;

    if v_partner_id is not null then
      -- Verificar si este gimnasio ya generó comisión previa
      select exists (
        select 1
        from public.partner_commissions
        where gimnasio_id = new.gimnasio_id
      ) into v_ya_comisiono_gym;

      -- Solo comisiona en el PRIMER pago de activación. Del mes 2 en adelante 100% SysGym.
      if not v_ya_comisiono_gym then
        -- Contar cuántos gimnasios ya activó este partner para aplicar bono de arranque (20% a los primeros 5)
        select count(*) into v_cant_comisiones
        from public.partner_commissions
        where partner_id = v_partner_id;

        if v_cant_comisiones < 5 then
          v_pct := 20; -- Bono de Arranque (Fast-Start)
        else
          v_pct := 15; -- Estándar
        end if;

        v_monto := round(new.monto_ars * v_pct / 100, 2);

        insert into public.partner_commissions
          (partner_id, gimnasio_id, pago_plataforma_id, monto_base_ars, porcentaje, monto_comision_ars, periodo)
        values
          (v_partner_id, new.gimnasio_id, new.id, new.monto_ars, v_pct, v_monto, to_char(now(), 'YYYY-MM'))
        on conflict (pago_plataforma_id) do nothing;
      end if;

      -- Evaluar hitos alcanzados (5, 10 y 15 gimnasios con pago activo)
      select count(*) into v_gyms_pagos
      from public.gimnasios g
      where g.referred_by_partner_id = v_partner_id
        and public.gimnasio_es_pago_activo(g.id);

      if v_gyms_pagos >= 5 then
        insert into public.partner_milestone_awards (partner_id, milestone, bono_ars, gyms_pagos_al_momento)
        values (v_partner_id, 5, 20000, v_gyms_pagos)
        on conflict (partner_id, milestone) do nothing;
      end if;

      if v_gyms_pagos >= 10 then
        insert into public.partner_milestone_awards (partner_id, milestone, bono_ars, gyms_pagos_al_momento)
        values (v_partner_id, 10, 60000, v_gyms_pagos)
        on conflict (partner_id, milestone) do nothing;
      end if;

      if v_gyms_pagos >= 15 then
        insert into public.partner_milestone_awards (partner_id, milestone, bono_ars, gyms_pagos_al_momento)
        values (v_partner_id, 15, 100000, v_gyms_pagos)
        on conflict (partner_id, milestone) do nothing;
      end if;
    end if;
  end if;

  return new;
end;
$$;
