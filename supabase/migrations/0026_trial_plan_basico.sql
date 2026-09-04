-- 0026_trial_plan_basico.sql
-- El free tier de 14 días activa el plan 'Básico' (hasta 30 socios), no Pro ni Elite.
-- Asigna por defecto el plan Básico a nuevos gimnasios y regulariza gimnasios en prueba.

do $$
declare
  v_plan_basico_id uuid;
begin
  -- 1) Obtener el ID del plan Básico activo
  select id into v_plan_basico_id
  from public.planes_plataforma
  where nombre = 'Básico' and activo = true
  order by orden asc
  limit 1;

  if v_plan_basico_id is not null then
    -- 2) Actualizar gimnasios en estado 'prueba' para que tengan asignado el plan Básico
    update public.gimnasios
    set plan_plataforma_id = v_plan_basico_id
    where estado = 'prueba';

    -- También cualquier gimnasio sin plan asignado
    update public.gimnasios
    set plan_plataforma_id = v_plan_basico_id
    where plan_plataforma_id is null;
  end if;
end $$;

-- 3) Función y trigger para asignar automáticamente el plan Básico al crear un gimnasio si viene null
create or replace function public.asignar_plan_basico_default()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.plan_plataforma_id is null then
    select id into new.plan_plataforma_id
    from public.planes_plataforma
    where nombre = 'Básico' and activo = true
    order by orden asc
    limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_gimnasios_plan_basico_default on public.gimnasios;
create trigger trg_gimnasios_plan_basico_default
before insert on public.gimnasios
for each row
execute function public.asignar_plan_basico_default();
