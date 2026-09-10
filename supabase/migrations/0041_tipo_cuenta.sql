-- Agrega tipo_cuenta para diferenciar gimnasios completos de cuentas individuales y negocios livianos.
alter table public.gimnasios 
  add column if not exists tipo_cuenta text not null default 'gym'
  check (tipo_cuenta in ('gym', 'individual', 'negocio_liviano'));

-- Planes nuevos (separados de los planes de gym Básico/Pro/Elite)
do $$
begin
  if not exists (select 1 from public.planes_plataforma where nombre = 'Individual') then
    insert into public.planes_plataforma (nombre, max_socios, precio_mensual, orden, activo)
    values ('Individual', 1, 5000, 10, true);
  end if;

  if not exists (select 1 from public.planes_plataforma where nombre = 'Negocio liviano') then
    insert into public.planes_plataforma (nombre, max_socios, precio_mensual, orden, activo)
    values ('Negocio liviano', 15, 12000, 11, true);
  end if;
end $$;

-- No hay que tocar RLS ni nada porque el acceso sigue siendo por gimnasio_id
-- y las cuentas individuales/livianas funcionan como gimnasios en sí mismas.
