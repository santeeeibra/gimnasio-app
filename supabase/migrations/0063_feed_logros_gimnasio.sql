-- Feed de logros del gimnasio (Parte 2 de "compartir logros" — reacciones
-- necesitan algo que listar). Hasta ahora el récord/racha se detectaban al
-- vuelo y se descartaban; acá se persiste el EVENTO para poder armar un feed
-- en /mi donde los socios ven (y reaccionan a) los logros de sus compañeros.
--
-- No reemplaza la detección al vuelo (evaluarRecordCliente/calcularRacha
-- siguen siendo la fuente de verdad para el cartel del propio socio) — esto
-- es solo el log de "esto pasó" para mostrarlo a los demás.

create table logros_gimnasio (
  id           uuid primary key default gen_random_uuid(),
  gimnasio_id  uuid not null references gimnasios (id) on delete cascade,
  cliente_id   uuid not null references clientes  (id) on delete cascade,
  tipo_logro   text not null check (tipo_logro in ('record', 'racha')),
  -- Misma convención que reacciones_logro.clave_logro:
  -- record -> "<ejercicio_id>:<pesoKg>" ; racha -> "<dias>"
  clave_logro  text not null,
  titulo       text not null, -- texto ya armado para mostrar en el feed
  creado_en    timestamptz not null default now(),

  unique (cliente_id, tipo_logro, clave_logro)
);

create index on logros_gimnasio (gimnasio_id, creado_en desc);

alter table logros_gimnasio enable row level security;

-- Lectura: cualquier miembro del gimnasio (es el feed compartido).
create policy logros_gimnasio_select on logros_gimnasio for select
  using (gimnasio_id = current_gimnasio_id());

-- Inserción: el cliente logueado solo puede loguear su propio logro.
create policy logros_gimnasio_insert on logros_gimnasio for insert
  with check (
    gimnasio_id = current_gimnasio_id()
    and cliente_id = current_cliente_id()
  );
