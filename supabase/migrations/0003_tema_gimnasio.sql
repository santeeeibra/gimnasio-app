-- Agregar columnas de tema personalizable a gimnasios
-- Cada gimnasio puede definir su paleta de colores (branding).

alter table gimnasios add column color_primario text;
alter table gimnasios add column color_acento text;
alter table gimnasios add column color_fondo text;

comment on column gimnasios.color_primario is 'Color principal del gimnasio (hex), mapea a --ink';
comment on column gimnasios.color_acento is 'Color de acento (hex), mapea a --volt';
comment on column gimnasios.color_fondo is 'Color de fondo (hex), mapea a --paper';

-- RLS: la tabla gimnasios ya tiene policy gim_select (lectura para todo el gimnasio)
-- y gim_update solo para dueño. Verificamos que exista la de UPDATE.

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'gimnasios' 
    and policyname = 'gim_update'
  ) then
    create policy gim_update on gimnasios for update
      using (id = current_gimnasio_id() and is_dueno())
      with check (id = current_gimnasio_id() and is_dueno());
  end if;
end $$;
