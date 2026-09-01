-- Sistema de gestión de gimnasios — esquema inicial (multi-tenant con RLS)
-- Aislamiento por gimnasio: cada fila lleva gimnasio_id y las policies lo filtran
-- contra el gimnasio del usuario autenticado.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- Tablas
-- ─────────────────────────────────────────────────────────────

create table gimnasios (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  slug        text not null unique,
  creado_at   timestamptz not null default now()
);

-- Un profile por usuario de auth. rol define qué ve.
create table profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  gimnasio_id        uuid not null references gimnasios (id) on delete cascade,
  rol                text not null check (rol in ('dueno', 'cliente')),
  dni                text not null,
  nombre             text not null,
  telefono           text,
  debe_cambiar_clave boolean not null default true,
  creado_at          timestamptz not null default now(),
  unique (gimnasio_id, dni)
);

create table planes (
  id            uuid primary key default gen_random_uuid(),
  gimnasio_id   uuid not null references gimnasios (id) on delete cascade,
  nombre        text not null,
  precio        numeric(12,2) not null default 0,
  duracion_dias integer not null check (duracion_dias > 0),
  activo        boolean not null default true,
  creado_at     timestamptz not null default now()
);

create table clientes (
  id                uuid primary key default gen_random_uuid(),
  gimnasio_id       uuid not null references gimnasios (id) on delete cascade,
  profile_id        uuid not null references profiles (id) on delete cascade,
  plan_id           uuid references planes (id) on delete set null,
  estado_cuota      text not null default 'vencido'
                      check (estado_cuota in ('al_dia', 'por_vencer', 'vencido')),
  fecha_inicio      date,
  fecha_vencimiento date,
  creado_at         timestamptz not null default now(),
  unique (profile_id)
);

create table pagos (
  id             uuid primary key default gen_random_uuid(),
  gimnasio_id    uuid not null references gimnasios (id) on delete cascade,
  cliente_id     uuid not null references clientes (id) on delete cascade,
  plan_id        uuid references planes (id) on delete set null,
  monto          numeric(12,2) not null,
  fecha_pago     date not null default current_date,
  cubre_hasta    date not null,
  registrado_por uuid references profiles (id) on delete set null,
  creado_at      timestamptz not null default now()
);

-- Ejercicios: gimnasio_id null = ejercicio global (base compartida tipo wger).
create table ejercicios (
  id             uuid primary key default gen_random_uuid(),
  gimnasio_id    uuid references gimnasios (id) on delete cascade,
  nombre         text not null,
  grupo_muscular text,
  nivel          text check (nivel in ('principiante', 'intermedio', 'avanzado')),
  imagen_url     text,
  creado_at      timestamptz not null default now()
);

create table rutinas (
  id             uuid primary key default gen_random_uuid(),
  gimnasio_id    uuid not null references gimnasios (id) on delete cascade,
  cliente_id     uuid not null references clientes (id) on delete cascade,
  objetivo       text,
  dias_por_semana integer,
  generada_por   text not null default 'reglas' check (generada_por in ('reglas', 'ia', 'manual')),
  creado_at      timestamptz not null default now(),
  actualizado_at timestamptz not null default now()
);

create table rutina_items (
  id           uuid primary key default gen_random_uuid(),
  rutina_id    uuid not null references rutinas (id) on delete cascade,
  ejercicio_id uuid references ejercicios (id) on delete set null,
  dia          integer not null,
  orden        integer not null default 0,
  series       integer,
  repeticiones text,
  nota         text
);

create table mensajes (
  id             uuid primary key default gen_random_uuid(),
  gimnasio_id    uuid not null references gimnasios (id) on delete cascade,
  remitente_id   uuid not null references profiles (id) on delete cascade,
  cuerpo         text not null,
  es_masivo      boolean not null default false,
  filtro_plan_id uuid references planes (id) on delete set null,
  respondible    boolean not null default false,
  creado_at      timestamptz not null default now()
);

create table mensaje_destinatarios (
  id          uuid primary key default gen_random_uuid(),
  mensaje_id  uuid not null references mensajes (id) on delete cascade,
  profile_id  uuid not null references profiles (id) on delete cascade,
  leido       boolean not null default false,
  leido_at    timestamptz,
  unique (mensaje_id, profile_id)
);

create table mensaje_respuestas (
  id         uuid primary key default gen_random_uuid(),
  mensaje_id uuid not null references mensajes (id) on delete cascade,
  autor_id   uuid not null references profiles (id) on delete cascade,
  cuerpo     text not null,
  creado_at  timestamptz not null default now()
);

create table push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  creado_at  timestamptz not null default now()
);

create index on profiles (gimnasio_id);
create index on planes (gimnasio_id);
create index on clientes (gimnasio_id);
create index on clientes (fecha_vencimiento);
create index on pagos (cliente_id);
create index on rutinas (cliente_id);
create index on rutina_items (rutina_id);
create index on mensajes (gimnasio_id);
create index on mensaje_destinatarios (profile_id) where leido = false;

-- ─────────────────────────────────────────────────────────────
-- Helpers para RLS
-- ─────────────────────────────────────────────────────────────

create or replace function current_gimnasio_id()
returns uuid language sql stable security definer set search_path = public as $$
  select gimnasio_id from profiles where id = auth.uid()
$$;

create or replace function is_dueno()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and rol = 'dueno')
$$;

create or replace function current_cliente_id()
returns uuid language sql stable security definer set search_path = public as $$
  select c.id from clientes c where c.profile_id = auth.uid()
$$;

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────

alter table gimnasios              enable row level security;
alter table profiles               enable row level security;
alter table planes                 enable row level security;
alter table clientes               enable row level security;
alter table pagos                  enable row level security;
alter table ejercicios             enable row level security;
alter table rutinas                enable row level security;
alter table rutina_items           enable row level security;
alter table mensajes               enable row level security;
alter table mensaje_destinatarios  enable row level security;
alter table mensaje_respuestas     enable row level security;
alter table push_subscriptions     enable row level security;

-- gimnasios: cualquiera del gimnasio lo ve; nadie lo edita desde el cliente
-- (alta de gimnasios se hace con service_role).
create policy gim_select on gimnasios for select
  using (id = current_gimnasio_id());

-- profiles: ves tu propio profile; el dueño ve todos los de su gimnasio.
create policy prof_select on profiles for select
  using (id = auth.uid() or (gimnasio_id = current_gimnasio_id() and is_dueno()));
create policy prof_update_self on profiles for update
  using (id = auth.uid());
create policy prof_dueno_all on profiles for all
  using (gimnasio_id = current_gimnasio_id() and is_dueno())
  with check (gimnasio_id = current_gimnasio_id() and is_dueno());

-- planes: todo el gimnasio los lee; solo el dueño los administra.
create policy planes_select on planes for select
  using (gimnasio_id = current_gimnasio_id());
create policy planes_dueno on planes for all
  using (gimnasio_id = current_gimnasio_id() and is_dueno())
  with check (gimnasio_id = current_gimnasio_id() and is_dueno());

-- clientes: el dueño ve/administra todos; el cliente ve solo su fila.
create policy clientes_select on clientes for select
  using (gimnasio_id = current_gimnasio_id() and (is_dueno() or profile_id = auth.uid()));
create policy clientes_dueno on clientes for all
  using (gimnasio_id = current_gimnasio_id() and is_dueno())
  with check (gimnasio_id = current_gimnasio_id() and is_dueno());

-- pagos: el dueño administra; el cliente ve los propios.
create policy pagos_select on pagos for select
  using (gimnasio_id = current_gimnasio_id()
         and (is_dueno() or cliente_id = current_cliente_id()));
create policy pagos_dueno on pagos for all
  using (gimnasio_id = current_gimnasio_id() and is_dueno())
  with check (gimnasio_id = current_gimnasio_id() and is_dueno());

-- ejercicios: se ven los globales y los del propio gimnasio; edita el dueño.
create policy ejercicios_select on ejercicios for select
  using (gimnasio_id is null or gimnasio_id = current_gimnasio_id());
create policy ejercicios_dueno on ejercicios for all
  using (gimnasio_id = current_gimnasio_id() and is_dueno())
  with check (gimnasio_id = current_gimnasio_id() and is_dueno());

-- rutinas: el dueño todas; el cliente la suya (y la puede editar).
create policy rutinas_select on rutinas for select
  using (gimnasio_id = current_gimnasio_id()
         and (is_dueno() or cliente_id = current_cliente_id()));
create policy rutinas_dueno on rutinas for all
  using (gimnasio_id = current_gimnasio_id() and is_dueno())
  with check (gimnasio_id = current_gimnasio_id() and is_dueno());
create policy rutinas_cliente_update on rutinas for update
  using (cliente_id = current_cliente_id())
  with check (cliente_id = current_cliente_id());

create policy rutina_items_select on rutina_items for select
  using (exists (select 1 from rutinas r where r.id = rutina_id
                 and r.gimnasio_id = current_gimnasio_id()
                 and (is_dueno() or r.cliente_id = current_cliente_id())));
create policy rutina_items_write on rutina_items for all
  using (exists (select 1 from rutinas r where r.id = rutina_id
                 and r.gimnasio_id = current_gimnasio_id()
                 and (is_dueno() or r.cliente_id = current_cliente_id())))
  with check (exists (select 1 from rutinas r where r.id = rutina_id
                 and r.gimnasio_id = current_gimnasio_id()
                 and (is_dueno() or r.cliente_id = current_cliente_id())));

-- mensajes: el dueño los crea; se ven si sos remitente o destinatario.
-- Los chequeos cruzados van por funciones SECURITY DEFINER para no reentrar en
-- la policy de la otra tabla (evita "infinite recursion" 42P17).
create or replace function soy_destinatario(_mensaje_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from mensaje_destinatarios
                 where mensaje_id = _mensaje_id and profile_id = auth.uid())
$$;
create or replace function mensaje_gimnasio(_mensaje_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select gimnasio_id from mensajes where id = _mensaje_id
$$;
create or replace function mensaje_remitente(_mensaje_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select remitente_id from mensajes where id = _mensaje_id
$$;
create or replace function mensaje_respondible(_mensaje_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select respondible from mensajes where id = _mensaje_id
$$;

create policy mensajes_select on mensajes for select
  using (gimnasio_id = current_gimnasio_id()
         and (remitente_id = auth.uid() or soy_destinatario(id)));
create policy mensajes_dueno_insert on mensajes for insert
  with check (gimnasio_id = current_gimnasio_id() and is_dueno()
              and remitente_id = auth.uid());

create policy md_select on mensaje_destinatarios for select
  using (profile_id = auth.uid()
         or (mensaje_gimnasio(mensaje_id) = current_gimnasio_id() and is_dueno()));
create policy md_update_leido on mensaje_destinatarios for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
create policy md_dueno_insert on mensaje_destinatarios for insert
  with check (mensaje_gimnasio(mensaje_id) = current_gimnasio_id() and is_dueno());

create policy resp_select on mensaje_respuestas for select
  using (mensaje_remitente(mensaje_id) = auth.uid() or soy_destinatario(mensaje_id));
create policy resp_insert on mensaje_respuestas for insert
  with check (autor_id = auth.uid()
              and mensaje_respondible(mensaje_id)
              and (mensaje_remitente(mensaje_id) = auth.uid()
                   or soy_destinatario(mensaje_id)));

create policy push_own on push_subscriptions for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- Recalcular estado de cuota
-- ─────────────────────────────────────────────────────────────

create or replace function recalcular_estado_cuota()
returns void language sql as $$
  update clientes set estado_cuota = case
    when fecha_vencimiento is null then 'vencido'
    when fecha_vencimiento < current_date then 'vencido'
    when fecha_vencimiento <= current_date + interval '6 days' then 'por_vencer'
    else 'al_dia'
  end;
$$;
