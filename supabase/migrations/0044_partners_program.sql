-- Programa SysGym Partner (referidos B2B) + límite duro de 40 alumnos
-- para gimnasios sin plan de plataforma asignado (free/starter).
-- Confirmar que este es el siguiente número libre en supabase/migrations/
-- antes de aplicar. Idempotente.

-- ═════════════════════════════════════════════════════════════
-- 1) Límite de 40 alumnos para gimnasios "free/starter"
--    (gimnasios.plan_plataforma_id is null — todavía no compraron un plan
--    de planes_plataforma). Un gimnasio CON plan asignado (Básico/Pro/Elite)
--    sigue regido por su propio max_socios via cupoSocios() en TS, sin
--    cambios; esta regla es exclusiva del tramo gratuito.
-- ═════════════════════════════════════════════════════════════

create or replace function public.gimnasio_alumnos_activos(p_gimnasio_id uuid)
returns integer
language sql
stable
as $$
  select count(*)::int
  from public.clientes
  where gimnasio_id = p_gimnasio_id
    and coalesce(acceso_habilitado, true) = true;
$$;

comment on function public.gimnasio_alumnos_activos(uuid) is
  'Alumnos activos (acceso_habilitado = true) de un gimnasio.';

create or replace function public.gimnasio_puede_agregar_alumno(p_gimnasio_id uuid)
returns boolean
language plpgsql
stable
as $$
declare
  v_plan_id uuid;
  v_usados  int;
begin
  select plan_plataforma_id into v_plan_id
  from public.gimnasios
  where id = p_gimnasio_id;

  -- Con plan de plataforma asignado, el cupo lo maneja cupoSocios() en TS
  -- según el max_socios de ese plan (Básico/Pro/Elite/Individual/...).
  if v_plan_id is not null then
    return true;
  end if;

  select public.gimnasio_alumnos_activos(p_gimnasio_id) into v_usados;
  return v_usados < 40;
end;
$$;

comment on function public.gimnasio_puede_agregar_alumno(uuid) is
  'true si el gimnasio free/starter (sin plan) todavía puede sumar un alumno (<40).';

-- Regla dura en backend: nadie puede insertar el alumno #41 de un gimnasio
-- free/starter, ni siquiera pasando por alto la capa de aplicación.
create or replace function public.trg_check_limite_gratuito()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.acceso_habilitado, true) = true then
    if not public.gimnasio_puede_agregar_alumno(new.gimnasio_id) then
      raise exception using
        errcode = 'P0001',
        message = 'LIMIT_EXCEEDED_UPGRADE_REQUIRED',
        detail  = 'El gimnasio alcanzó el límite de 40 alumnos activos del plan gratuito.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists clientes_check_limite_gratuito on public.clientes;
create trigger clientes_check_limite_gratuito
  before insert on public.clientes
  for each row execute function public.trg_check_limite_gratuito();

-- ═════════════════════════════════════════════════════════════
-- 2) Partners (colaboradores / referidores B2B)
-- ═════════════════════════════════════════════════════════════

create table if not exists public.partners (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users (id) on delete cascade,
  nombre        text not null,
  email         text,
  referral_code text not null unique
                  check (referral_code ~ '^[a-z0-9][a-z0-9-]{2,38}[a-z0-9]$'),
  cbu_cvu       text,
  alias_mp      text,
  estado        text not null default 'activo'
                  check (estado in ('activo', 'suspendido')),
  creado_at     timestamptz not null default now()
);

comment on table public.partners is
  'Colaboradores del programa SysGym Partner: referidos B2B con comisión + bonos.';

create index if not exists partners_referral_code_idx
  on public.partners (referral_code);

alter table public.gimnasios
  add column if not exists referred_by_partner_id uuid
    references public.partners (id) on delete set null;

create index if not exists gimnasios_referred_by_idx
  on public.gimnasios (referred_by_partner_id)
  where referred_by_partner_id is not null;

alter table public.partners enable row level security;

-- Cada partner ve (y actualiza sus datos de cobro) solo su propia fila.
-- Las columnas sensibles (referral_code, estado) se protegen en la capa de
-- Server Actions (service_role), que es quien realmente escribe.
drop policy if exists partners_select_own on public.partners;
create policy partners_select_own on public.partners
  for select
  using (user_id = auth.uid());

-- ═════════════════════════════════════════════════════════════
-- 3) Condición de "gimnasio pago activo" para el programa de partners:
--    más de 40 alumnos activos + plan Pro/Elite vigente y activo.
-- ═════════════════════════════════════════════════════════════

create or replace function public.gimnasio_es_pago_activo(p_gimnasio_id uuid)
returns boolean
language plpgsql
stable
as $$
declare
  v_usados      int;
  v_estado      text;
  v_vence       date;
  v_plan_nombre text;
begin
  select public.gimnasio_alumnos_activos(p_gimnasio_id) into v_usados;

  select g.estado, g.plan_plataforma_vence_el, p.nombre
    into v_estado, v_vence, v_plan_nombre
  from public.gimnasios g
  left join public.planes_plataforma p on p.id = g.plan_plataforma_id
  where g.id = p_gimnasio_id;

  return coalesce(v_usados, 0) > 40
     and v_estado = 'activo'
     and v_plan_nombre in ('Pro', 'Elite')
     and (v_vence is null or v_vence >= current_date);
end;
$$;

comment on function public.gimnasio_es_pago_activo(uuid) is
  'true si el gimnasio tiene +40 alumnos activos y un plan Pro/Elite vigente (condición de comisión de partner).';

-- ═════════════════════════════════════════════════════════════
-- 4) Comisiones (10% recurrente) + bonos por hitos (5 / 10 gimnasios pagos)
-- ═════════════════════════════════════════════════════════════

create table if not exists public.partner_commissions (
  id                 uuid primary key default gen_random_uuid(),
  partner_id         uuid not null references public.partners (id) on delete cascade,
  gimnasio_id        uuid not null references public.gimnasios (id) on delete cascade,
  pago_plataforma_id uuid not null references public.pagos_plataforma (id) on delete cascade,
  monto_base_ars     numeric(12,2) not null,
  porcentaje         numeric(5,2) not null default 10,
  monto_comision_ars numeric(12,2) not null,
  periodo            text not null, -- 'YYYY-MM' del pago que generó la comisión
  creado_at          timestamptz not null default now(),
  unique (pago_plataforma_id)
);

comment on table public.partner_commissions is
  'Ledger de comisiones (10% recurrente) generadas por pagos_plataforma aprobados de gimnasios referidos.';

create index if not exists partner_commissions_partner_idx
  on public.partner_commissions (partner_id, creado_at desc);

alter table public.partner_commissions enable row level security;
drop policy if exists partner_commissions_select_own on public.partner_commissions;
create policy partner_commissions_select_own on public.partner_commissions
  for select
  using (partner_id in (select id from public.partners where user_id = auth.uid()));
-- Sin policies de insert/update/delete: solo las escribe el trigger
-- (security definer) o service_role.

create table if not exists public.partner_milestone_awards (
  id                    uuid primary key default gen_random_uuid(),
  partner_id            uuid not null references public.partners (id) on delete cascade,
  milestone             int not null check (milestone in (5, 10)),
  bono_ars              numeric(12,2) not null,
  gyms_pagos_al_momento int not null,
  creado_at             timestamptz not null default now(),
  unique (partner_id, milestone)
);

comment on table public.partner_milestone_awards is
  'Bonos únicos por hito (5 y 10 gimnasios pago-activos referidos). unique(partner_id, milestone) evita duplicados.';

alter table public.partner_milestone_awards enable row level security;
drop policy if exists partner_milestones_select_own on public.partner_milestone_awards;
create policy partner_milestones_select_own on public.partner_milestone_awards
  for select
  using (partner_id in (select id from public.partners where user_id = auth.uid()));

-- Procesa comisión + hitos cuando un pago_plataforma pasa a 'aprobado'.
-- security definer: corre con los permisos del dueño de la función (owner
-- de la migración = service_role), así puede escribir en las tablas de
-- partners aunque quien dispare el UPDATE sea otro rol.
create or replace function public.trg_procesar_comision_partner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner_id uuid;
  v_pct        numeric := 10;
  v_monto      numeric;
  v_gyms_pagos int;
begin
  if new.estado = 'aprobado'
     and old.estado is distinct from 'aprobado'
     and coalesce(new.tipo, 'plan_mensual') = 'plan_mensual' then

    select referred_by_partner_id into v_partner_id
    from public.gimnasios
    where id = new.gimnasio_id;

    if v_partner_id is not null then
      v_monto := round(new.monto_ars * v_pct / 100, 2);

      insert into public.partner_commissions
        (partner_id, gimnasio_id, pago_plataforma_id, monto_base_ars, porcentaje, monto_comision_ars, periodo)
      values
        (v_partner_id, new.gimnasio_id, new.id, new.monto_ars, v_pct, v_monto, to_char(now(), 'YYYY-MM'))
      on conflict (pago_plataforma_id) do nothing;

      select count(*) into v_gyms_pagos
      from public.gimnasios g
      where g.referred_by_partner_id = v_partner_id
        and public.gimnasio_es_pago_activo(g.id);

      if v_gyms_pagos >= 5 then
        insert into public.partner_milestone_awards (partner_id, milestone, bono_ars, gyms_pagos_al_momento)
        values (v_partner_id, 5, 30000, v_gyms_pagos)
        on conflict (partner_id, milestone) do nothing;
      end if;

      if v_gyms_pagos >= 10 then
        insert into public.partner_milestone_awards (partner_id, milestone, bono_ars, gyms_pagos_al_momento)
        values (v_partner_id, 10, 80000, v_gyms_pagos)
        on conflict (partner_id, milestone) do nothing;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists pagos_plataforma_procesar_comision on public.pagos_plataforma;
create trigger pagos_plataforma_procesar_comision
  after update on public.pagos_plataforma
  for each row execute function public.trg_procesar_comision_partner();

-- ═════════════════════════════════════════════════════════════
-- 5) Billetera del partner: balance calculado + retiros
-- ═════════════════════════════════════════════════════════════

-- La tabla va primero: partner_balance() es LANGUAGE SQL y Postgres valida
-- las referencias de su cuerpo en el momento del CREATE FUNCTION, no recién
-- al invocarla (a diferencia de plpgsql). Si partner_payouts no existe
-- todavía, el CREATE FUNCTION de más abajo falla con 42P01.
create table if not exists public.partner_payouts (
  id               uuid primary key default gen_random_uuid(),
  partner_id       uuid not null references public.partners (id) on delete cascade,
  monto_ars        numeric(12,2) not null check (monto_ars >= 10000),
  estado           text not null default 'pendiente'
                     check (estado in ('pendiente', 'pagado', 'rechazado', 'cancelado')),
  destino_snapshot jsonb not null,
  nota             text,
  solicitado_at    timestamptz not null default now(),
  procesado_at     timestamptz
);

comment on table public.partner_payouts is
  'Solicitudes de retiro de saldo del partner. Umbral mínimo $10.000 (constraint).';

create index if not exists partner_payouts_partner_idx
  on public.partner_payouts (partner_id, solicitado_at desc);

alter table public.partner_payouts enable row level security;
drop policy if exists partner_payouts_select_own on public.partner_payouts;
create policy partner_payouts_select_own on public.partner_payouts
  for select
  using (partner_id in (select id from public.partners where user_id = auth.uid()));
-- Sin policy de insert: solicitarRetiroPartner (Server Action, service_role)
-- valida balance >= monto antes de insertar, para no confiar en un check
-- de RLS que no puede leer partner_balance() de forma segura contra carreras.

create or replace function public.partner_balance(p_partner_id uuid)
returns numeric
language sql
stable
as $$
  select
    coalesce((select sum(monto_comision_ars) from public.partner_commissions where partner_id = p_partner_id), 0)
    + coalesce((select sum(bono_ars) from public.partner_milestone_awards where partner_id = p_partner_id), 0)
    - coalesce((select sum(monto_ars) from public.partner_payouts where partner_id = p_partner_id and estado in ('pendiente', 'pagado')), 0);
$$;

comment on function public.partner_balance(uuid) is
  'Balance disponible del partner: comisiones + bonos - retiros pendientes/pagados.';
