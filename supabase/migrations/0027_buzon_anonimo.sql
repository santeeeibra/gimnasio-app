-- Migración: Buzón anónimo de comentarios (socio → dueño)
-- Confirmar que este es el siguiente número libre en supabase/migrations/ antes de aplicar.

create table buzon_comentarios (
  id uuid primary key default gen_random_uuid(),
  gimnasio_id uuid not null references gimnasios(id) on delete cascade,
  cliente_id uuid not null references clientes(id) on delete cascade,
  categoria text not null default 'otro', -- 'equipo' | 'limpieza' | 'sugerencia' | 'otro'
  texto text not null,
  estado text not null default 'pendiente', -- 'pendiente' | 'resuelto'
  respuesta text,
  respondido_at timestamptz,
  creado_at timestamptz not null default now()
);

-- Índice para el listado del panel (más nuevos primero, filtrado por estado)
create index buzon_comentarios_gym_estado_idx
  on buzon_comentarios (gimnasio_id, estado, creado_at desc);

-- RLS
alter table buzon_comentarios enable row level security;

-- Socio: puede insertar comentarios en su gimnasio (cliente_id se extrae del perfil autenticado)
create policy "socio_insert" on buzon_comentarios
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

-- Socio: puede ver solo sus propios comentarios (para ver la respuesta si la hay)
create policy "socio_select_propio" on buzon_comentarios
  for select
  to authenticated
  using (
    cliente_id = (
      select id from clientes where profile_id = auth.uid() limit 1
    )
  );

-- Dueño: puede ver todos los comentarios de su gimnasio (sin exponer nombres en la UI)
create policy "dueno_select_gimnasio" on buzon_comentarios
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

-- Dueño: puede actualizar (responder, marcar resuelto) comentarios de su gimnasio
create policy "dueno_update_gimnasio" on buzon_comentarios
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

-- Dueño: puede borrar comentarios de su gimnasio
create policy "dueno_delete_gimnasio" on buzon_comentarios
  for delete
  to authenticated
  using (
    gimnasio_id = (
      select gimnasio_id from profiles where id = auth.uid()
    )
    and (
      select rol from profiles where id = auth.uid()
    ) = 'dueno'
  );
