-- Nueva estructura de planes de plataforma + cargos únicos + early-bird.
-- Reemplaza a 0022 (que solo tocaba precios de los planes viejos Free/Base/
-- Pro/Ilimitado). Deja 3 planes: Básico / Pro / Elite.
-- Idempotente: se puede correr más de una vez.

-- ─────────────────────────────────────────────────────────────
-- 1) Planes: Básico (30 socios, $25.000) · Pro (45, $38.000) ·
--    Elite (300, $55.000). Se reusan las filas existentes para no
--    romper las FKs (gimnasios.plan_plataforma_id, pagos_plataforma).
-- ─────────────────────────────────────────────────────────────
do $$
begin
  -- Renombres desde el catálogo viejo (solo si todavía existen).
  -- Orden importante: 'Pro' viejo -> 'Elite' antes de crear el 'Pro' nuevo.
  update public.planes_plataforma
    set nombre = 'Elite', max_socios = 300, precio_mensual = 55000,
        orden = 3, activo = true
    where nombre = 'Pro' and coalesce(max_socios, 0) >= 300;

  update public.planes_plataforma
    set nombre = 'Pro', max_socios = 45, precio_mensual = 38000,
        orden = 2, activo = true
    where nombre = 'Base';

  update public.planes_plataforma
    set nombre = 'Básico', max_socios = 30, precio_mensual = 25000,
        orden = 1, activo = true
    where nombre = 'Free';

  -- Legacy 'Ilimitado': se retira del catálogo (no se borra por si hay
  -- gimnasios apuntándolo).
  update public.planes_plataforma
    set activo = false, orden = 99
    where nombre = 'Ilimitado';

  -- Asegurar los 3 planes (DB nueva, o ya migrada a mano): upsert por nombre.
  if exists (select 1 from public.planes_plataforma where nombre = 'Básico') then
    update public.planes_plataforma
      set max_socios = 30, precio_mensual = 25000, orden = 1, activo = true
      where nombre = 'Básico';
  else
    insert into public.planes_plataforma (nombre, max_socios, precio_mensual, orden, activo)
      values ('Básico', 30, 25000, 1, true);
  end if;

  if exists (select 1 from public.planes_plataforma where nombre = 'Pro') then
    update public.planes_plataforma
      set max_socios = 45, precio_mensual = 38000, orden = 2, activo = true
      where nombre = 'Pro';
  else
    insert into public.planes_plataforma (nombre, max_socios, precio_mensual, orden, activo)
      values ('Pro', 45, 38000, 2, true);
  end if;

  if exists (select 1 from public.planes_plataforma where nombre = 'Elite') then
    update public.planes_plataforma
      set max_socios = 300, precio_mensual = 55000, orden = 3, activo = true
      where nombre = 'Elite';
  else
    insert into public.planes_plataforma (nombre, max_socios, precio_mensual, orden, activo)
      values ('Elite', 300, 55000, 3, true);
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 2) pagos_plataforma: tipo de cargo + descuento early-bird.
--    'plan_mensual' renueva el plan (empuja el vencimiento). 'setup' y
--    'premium' son cargos únicos: se aprueban con el mismo flujo pero NO
--    tocan gimnasios.plan_plataforma_vence_el ni gimnasios.estado.
-- ─────────────────────────────────────────────────────────────
alter table public.pagos_plataforma
  add column if not exists tipo text not null default 'plan_mensual',
  add column if not exists descuento_pct numeric(5,2) not null default 0,
  add column if not exists monto_original_ars numeric(12,2);

comment on column public.pagos_plataforma.tipo is
  'plan_mensual (renueva el plan) | setup (cargo único) | premium (cargo único)';
comment on column public.pagos_plataforma.descuento_pct is
  'Descuento aplicado sobre monto_original_ars (early-bird = 15). 0 si no hubo.';
comment on column public.pagos_plataforma.monto_original_ars is
  'Monto antes del descuento. null si descuento_pct = 0 (monto_ars ya es el final).';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pagos_plataforma_tipo_chk'
  ) then
    alter table public.pagos_plataforma
      add constraint pagos_plataforma_tipo_chk
      check (tipo in ('plan_mensual', 'setup', 'premium'));
  end if;
end $$;

-- Permitir dias = 0 para los cargos únicos (no extienden el período pago).
alter table public.pagos_plataforma
  drop constraint if exists pagos_plataforma_dias_check;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pagos_plataforma_dias_chk'
  ) then
    alter table public.pagos_plataforma
      add constraint pagos_plataforma_dias_chk check (dias between 0 and 366);
  end if;
end $$;

create index if not exists pagos_plataforma_gym_tipo_idx
  on public.pagos_plataforma (gimnasio_id, tipo, estado);

-- ─────────────────────────────────────────────────────────────
-- 3) Prueba gratis de 14 días: ya vive en gimnasios.estado = 'prueba'
--    (default) + chequear_trial_vencido() (0013), que pasa a 'solo_lectura'
--    a los 14 días de gimnasios.creado_at. No se agrega nada acá: el
--    early-bird (primeros 3 días) se calcula en el código desde creado_at.
-- ─────────────────────────────────────────────────────────────
