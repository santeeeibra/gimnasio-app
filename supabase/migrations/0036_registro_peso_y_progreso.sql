-- Peso corporal y progreso de ejercicios
-- Parte del sistema de seguimiento de evolución del socio.
-- Migración 0036.

-- ─────────────────────────────────────────────────────────────
-- 1. registro_peso — evolución del peso corporal
-- ─────────────────────────────────────────────────────────────

create table registro_peso (
  id          uuid primary key default gen_random_uuid(),
  gimnasio_id uuid not null references gimnasios (id) on delete cascade,
  cliente_id  uuid not null references clientes  (id) on delete cascade,
  fecha       date not null default current_date,
  peso        numeric(5,2) not null check (peso > 0 and peso < 1000),
  nota        text,
  creado_por  text not null check (creado_por in ('cliente', 'dueno')),
  creado_en   timestamptz not null default now(),

  -- Un solo registro por cliente por fecha (el upsert pisa el anterior).
  unique (cliente_id, fecha)
);

create index on registro_peso (cliente_id, fecha desc);
create index on registro_peso (gimnasio_id, fecha desc);

alter table registro_peso enable row level security;

-- El cliente lee/inserta solo sus propios registros.
create policy rp_cliente_select on registro_peso for select
  using (
    gimnasio_id = current_gimnasio_id()
    and cliente_id = current_cliente_id()
  );

create policy rp_cliente_insert on registro_peso for insert
  with check (
    gimnasio_id = current_gimnasio_id()
    and cliente_id = current_cliente_id()
    and creado_por = 'cliente'
  );

create policy rp_cliente_update on registro_peso for update
  using (
    gimnasio_id = current_gimnasio_id()
    and cliente_id = current_cliente_id()
  )
  with check (
    gimnasio_id = current_gimnasio_id()
    and cliente_id = current_cliente_id()
    and creado_por = 'cliente'
  );

-- El dueño lee/escribe los registros de cualquier cliente de su gimnasio.
create policy rp_dueno on registro_peso for all
  using  (gimnasio_id = current_gimnasio_id() and is_dueno())
  with check (gimnasio_id = current_gimnasio_id() and is_dueno());

-- ─────────────────────────────────────────────────────────────
-- 2. registro_progreso — peso levantado por ejercicio
-- ─────────────────────────────────────────────────────────────

create table registro_progreso (
  id           uuid primary key default gen_random_uuid(),
  gimnasio_id  uuid not null references gimnasios  (id) on delete cascade,
  cliente_id   uuid not null references clientes   (id) on delete cascade,
  ejercicio_id uuid not null references ejercicios (id) on delete cascade,
  fecha        date not null default current_date,
  peso         numeric(6,2) not null check (peso >= 0 and peso < 10000),
  reps         int check (reps > 0 and reps < 1000),
  creado_por   text not null check (creado_por in ('cliente', 'dueno')),
  creado_en    timestamptz not null default now(),

  -- Un solo registro por cliente × ejercicio × fecha.
  unique (cliente_id, ejercicio_id, fecha)
);

create index on registro_progreso (cliente_id, ejercicio_id, fecha desc);
create index on registro_progreso (gimnasio_id, fecha desc);
create index on registro_progreso (ejercicio_id);

alter table registro_progreso enable row level security;

-- El cliente lee/inserta solo sus propios registros.
create policy rprog_cliente_select on registro_progreso for select
  using (
    gimnasio_id = current_gimnasio_id()
    and cliente_id = current_cliente_id()
  );

create policy rprog_cliente_insert on registro_progreso for insert
  with check (
    gimnasio_id = current_gimnasio_id()
    and cliente_id = current_cliente_id()
    and creado_por = 'cliente'
  );

create policy rprog_cliente_update on registro_progreso for update
  using (
    gimnasio_id = current_gimnasio_id()
    and cliente_id = current_cliente_id()
  )
  with check (
    gimnasio_id = current_gimnasio_id()
    and cliente_id = current_cliente_id()
    and creado_por = 'cliente'
  );

-- El dueño lee/escribe los registros de cualquier cliente de su gimnasio.
create policy rprog_dueno on registro_progreso for all
  using  (gimnasio_id = current_gimnasio_id() and is_dueno())
  with check (gimnasio_id = current_gimnasio_id() and is_dueno());
