-- Compartir logros (récord de peso + racha de constancia)
-- El récord y la racha se CALCULAN AL VUELO (sin persistir estado). Esta
-- migración sólo agrega:
--   1. reacciones_logro  — Parte 1b del spec (👏 entre alumnos del mismo gym)
--   2. una policy de lectura para que el cliente pueda leer sus propios
--      registros_entrada (0009 sólo dejaba al dueño), necesaria para calcular
--      la racha desde /mi con la sesión del cliente.

-- ─────────────────────────────────────────────────────────────
-- 1. reacciones_logro
-- ─────────────────────────────────────────────────────────────

create table reacciones_logro (
  id           uuid primary key default gen_random_uuid(),
  gimnasio_id  uuid not null references gimnasios (id) on delete cascade,
  autor_id     uuid not null references clientes  (id) on delete cascade, -- dueño del logro
  reactor_id   uuid not null references clientes  (id) on delete cascade, -- quien reacciona
  tipo_logro   text not null check (tipo_logro in ('record', 'racha')),
  -- Identifica el logro puntual para deduplicar la reacción.
  -- record -> "<ejercicio_id>:<pesoKg>" ; racha -> "<dias>"
  clave_logro  text not null,
  tipo         text not null default 'aplauso' check (tipo in ('aplauso')),
  creado_en    timestamptz not null default now(),

  unique (reactor_id, autor_id, tipo_logro, clave_logro)
);

create index on reacciones_logro (gimnasio_id, autor_id, creado_en desc);

alter table reacciones_logro enable row level security;

-- Lectura: cualquier miembro del gimnasio. La UI filtra a las del autor.
create policy reacc_select on reacciones_logro for select
  using (gimnasio_id = current_gimnasio_id());

-- Inserción: el reactor es el cliente logueado, en su gimnasio, y no puede
-- reaccionar a su propio logro.
create policy reacc_insert on reacciones_logro for insert
  with check (
    gimnasio_id = current_gimnasio_id()
    and reactor_id = current_cliente_id()
    and autor_id <> current_cliente_id()
  );

-- Borrado: sólo la propia reacción (toggle).
create policy reacc_delete on reacciones_logro for delete
  using (
    gimnasio_id = current_gimnasio_id()
    and reactor_id = current_cliente_id()
  );

-- ─────────────────────────────────────────────────────────────
-- 2. registros_entrada — lectura del propio cliente
-- ─────────────────────────────────────────────────────────────

create policy registros_entrada_cliente_select on registros_entrada for select
  using (
    gimnasio_id = current_gimnasio_id()
    and cliente_id = current_cliente_id()
  );
