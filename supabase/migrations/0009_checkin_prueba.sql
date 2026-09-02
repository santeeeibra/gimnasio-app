-- Check-in por DNI (modo kiosko) + día de prueba
-- 1) clientes: flag de prueba + fecha del primer ingreso en prueba
-- 2) registros_entrada: presencia puntual (fila liviana; alimenta también
--    "racha de constancia" a futuro — NO confundir con registro_progreso).

alter table clientes
  add column en_prueba boolean not null default false,
  add column prueba_iniciada_en date;

create table registros_entrada (
  id          uuid primary key default gen_random_uuid(),
  gimnasio_id uuid not null references gimnasios (id) on delete cascade,
  cliente_id  uuid not null references clientes (id) on delete cascade,
  creado_en   timestamptz not null default now()
);

create index on registros_entrada (gimnasio_id, creado_en desc);
create index on registros_entrada (cliente_id);

alter table registros_entrada enable row level security;

-- El dueño inserta/lee registros de su gimnasio. El dispositivo en modo kiosko
-- corre dentro de la sesión autenticada del dueño, así que esta policy alcanza.
create policy registros_entrada_dueno on registros_entrada for all
  using (gimnasio_id = current_gimnasio_id() and is_dueno())
  with check (gimnasio_id = current_gimnasio_id() and is_dueno());
