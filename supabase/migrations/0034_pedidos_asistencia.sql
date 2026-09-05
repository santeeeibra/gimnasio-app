-- Migración: Sistema de Asistencia en Sala (socio pide ayuda con un ejercicio al dueño/profe)

create table if not exists pedidos_asistencia (
  id uuid primary key default gen_random_uuid(),
  gimnasio_id uuid not null references gimnasios(id) on delete cascade,
  cliente_id uuid not null references clientes(id) on delete cascade,
  ejercicio_id uuid references ejercicios(id) on delete set null,
  ejercicio_nombre text not null,
  sector text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'en_camino', 'atendido', 'cancelado')),
  creado_at timestamptz not null default now(),
  atendido_at timestamptz
);

-- Índices para búsqueda rápida en panel y rate limit de socio
create index if not exists pedidos_asistencia_gym_estado_idx
  on pedidos_asistencia (gimnasio_id, estado, creado_at desc);

create index if not exists pedidos_asistencia_cliente_idx
  on pedidos_asistencia (cliente_id, estado, creado_at desc);

-- RLS
alter table pedidos_asistencia enable row level security;

-- Socio: puede insertar pedido en su gimnasio
create policy "socio_insert_asistencia" on pedidos_asistencia
  for insert
  to authenticated
  with check (
    gimnasio_id = (
      select gimnasio_id from profiles where id = auth.uid()
    )
    and cliente_id = (
      select id from clientes where profile_id = auth.uid() limit 1
    )
  );

-- Socio: puede ver sus propios pedidos (para conocer el estado en vivo)
create policy "socio_select_asistencia_propia" on pedidos_asistencia
  for select
  to authenticated
  using (
    cliente_id = (
      select id from clientes where profile_id = auth.uid() limit 1
    )
  );

-- Socio: puede cancelar su propio pedido si está pendiente
create policy "socio_update_asistencia_propia" on pedidos_asistencia
  for update
  to authenticated
  using (
    cliente_id = (
      select id from clientes where profile_id = auth.uid() limit 1
    )
  );

-- Dueño: puede ver todos los pedidos de su gimnasio
create policy "dueno_select_asistencia_gym" on pedidos_asistencia
  for select
  to authenticated
  using (
    gimnasio_id = (
      select gimnasio_id from profiles where id = auth.uid()
    )
    and (
      select rol from profiles where id = auth.uid()
    ) = 'dueno'
  );

-- Dueño: puede actualizar (marcar en camino, atendido) pedidos de su gimnasio
create policy "dueno_update_asistencia_gym" on pedidos_asistencia
  for update
  to authenticated
  using (
    gimnasio_id = (
      select gimnasio_id from profiles where id = auth.uid()
    )
    and (
      select rol from profiles where id = auth.uid()
    ) = 'dueno'
  );

-- Habilitar Realtime para pedidos_asistencia
alter publication supabase_realtime add table pedidos_asistencia;
