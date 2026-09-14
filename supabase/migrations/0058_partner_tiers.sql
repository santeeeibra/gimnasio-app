-- Des-hardcodea comisión y bonos de hitos del trigger de partners a una
-- tabla configurable (partner_tiers) + override por partner individual.
-- Ver conversación de estrategia comercial (Gemini) — reemplaza los % y
-- montos fijos que vivían en trg_procesar_comision_partner (0045).

create table if not exists public.partner_tiers (
  id                      serial primary key,
  name                    varchar(50) not null,
  min_active_gyms         int not null unique,
  commission_pct          numeric(5,2) not null,
  milestone_bonus_amount  numeric(10,2) not null default 0.00,
  created_at              timestamptz not null default now()
);

comment on table public.partner_tiers is
  'Rangos de partner (Starter/Pro/Elite/Black): a partir de qué cantidad de gimnasios pago-activos se aplica cada % de comisión y bono de hito. Editable sin tocar código.';

insert into public.partner_tiers (name, min_active_gyms, commission_pct, milestone_bonus_amount)
values
  ('Starter', 0, 20.00, 0.00),
  ('Pro', 5, 15.00, 20000.00),
  ('Elite', 10, 15.00, 60000.00),
  ('Black', 15, 15.00, 100000.00)
on conflict (min_active_gyms) do nothing;

-- Lectura pública (solo lectura): cualquier usuario autenticado puede ver
-- los tiers para mostrarlos en el dashboard del partner.
alter table public.partner_tiers enable row level security;
drop policy if exists partner_tiers_select_all on public.partner_tiers;
create policy partner_tiers_select_all on public.partner_tiers
  for select
  using (true);

-- Excepción por partner (ej. un influencer con % fijo negociado aparte).
-- NULL = usa el % de partner_tiers según su rango actual.
alter table public.partners
  add column if not exists override_commission_pct numeric(5,2);

comment on column public.partners.override_commission_pct is
  'Comisión fija para este partner, ignora partner_tiers si no es null (ej. acuerdos VIP).';

-- ═════════════════════════════════════════════════════════════
-- Trigger actualizado: lee % y bonos de partner_tiers en vez de valores
-- fijos. Mantiene la misma regla de negocio: comisión única en el primer
-- pago del gimnasio (no recurrente); bonos acumulativos por cada tier
-- alcanzado (no solo el tier actual).
-- ═════════════════════════════════════════════════════════════

create or replace function public.trg_procesar_comision_partner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner_id        uuid;
  v_override_pct      numeric;
  v_pct                numeric;
  v_monto              numeric;
  v_gyms_pagos          int;
  v_ya_comisiono_gym   boolean;
  v_cant_comisiones    int;
  v_tier               record;
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
        -- Cuántos gimnasios ya activó este partner, para saber en qué tier está.
        select count(*) into v_cant_comisiones
        from public.partner_commissions
        where partner_id = v_partner_id;

        select override_commission_pct into v_override_pct
        from public.partners
        where id = v_partner_id;

        if v_override_pct is not null then
          v_pct := v_override_pct;
        else
          select commission_pct into v_pct
          from public.partner_tiers
          where min_active_gyms <= v_cant_comisiones
          order by min_active_gyms desc
          limit 1;
        end if;

        v_monto := round(new.monto_ars * v_pct / 100, 2);

        insert into public.partner_commissions
          (partner_id, gimnasio_id, pago_plataforma_id, monto_base_ars, porcentaje, monto_comision_ars, periodo)
        values
          (v_partner_id, new.gimnasio_id, new.id, new.monto_ars, v_pct, v_monto, to_char(now(), 'YYYY-MM'))
        on conflict (pago_plataforma_id) do nothing;
      end if;

      -- Evaluar hitos alcanzados: un award ACUMULATIVO por cada tier cuyo
      -- umbral ya se cruzó (no solo el tier actual del partner).
      select count(*) into v_gyms_pagos
      from public.gimnasios g
      where g.referred_by_partner_id = v_partner_id
        and public.gimnasio_es_pago_activo(g.id);

      for v_tier in
        select min_active_gyms, milestone_bonus_amount
        from public.partner_tiers
        where min_active_gyms > 0
          and min_active_gyms <= v_gyms_pagos
          and milestone_bonus_amount > 0
      loop
        insert into public.partner_milestone_awards
          (partner_id, milestone, bono_ars, gyms_pagos_al_momento)
        values
          (v_partner_id, v_tier.min_active_gyms, v_tier.milestone_bonus_amount, v_gyms_pagos)
        on conflict (partner_id, milestone) do nothing;
      end loop;
    end if;
  end if;

  return new;
end;
$$;
