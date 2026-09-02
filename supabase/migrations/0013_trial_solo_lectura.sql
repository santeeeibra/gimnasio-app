-- Sistema de solo lectura para trial vencido (14 días sin activar plan pago)
-- Bloquea escritura del dueño y clientes cuando el gimnasio está en modo solo_lectura.

-- ─────────────────────────────────────────────────────────────
-- 1) Columna estado en gimnasios
-- ─────────────────────────────────────────────────────────────
alter table public.gimnasios
  add column if not exists estado text not null default 'prueba'
  check (estado in ('prueba', 'activo', 'solo_lectura'));

comment on column gimnasios.estado is 
  'Estado del gimnasio: prueba (trial inicial), activo (plan pago activado), solo_lectura (trial vencido sin pago)';

-- ─────────────────────────────────────────────────────────────
-- 2) Función para chequear trials vencidos (corre en el cron diario)
-- ─────────────────────────────────────────────────────────────
create or replace function chequear_trial_vencido()
returns void language sql as $$
  update gimnasios
  set estado = 'solo_lectura'
  where estado = 'prueba'
    and (now() - creado_at) > interval '14 days';
$$;

comment on function chequear_trial_vencido is 
  'Marca como solo_lectura los gimnasios en prueba con más de 14 días desde creado_at';

-- ─────────────────────────────────────────────────────────────
-- 3) Helpers para RLS: chequear si el gimnasio permite escritura
-- ─────────────────────────────────────────────────────────────
create or replace function gimnasio_permite_escritura()
returns boolean language sql stable security definer set search_path = public as $$
  select estado != 'solo_lectura'
  from gimnasios
  where id = current_gimnasio_id();
$$;

comment on function gimnasio_permite_escritura is
  'Retorna true si el gimnasio actual NO está en solo_lectura (usado en policies)';

-- ─────────────────────────────────────────────────────────────
-- 4) Actualizar policies RLS para bloquear escritura en solo_lectura
-- ─────────────────────────────────────────────────────────────

-- clientes: dueño puede insertar/actualizar solo si no está en solo_lectura
drop policy if exists clientes_dueno on clientes;
create policy clientes_dueno on clientes for all
  using (gimnasio_id = current_gimnasio_id() and is_dueno())
  with check (gimnasio_id = current_gimnasio_id() and is_dueno() and gimnasio_permite_escritura());

-- planes: dueño puede modificar solo si no está en solo_lectura
drop policy if exists planes_dueno on planes;
create policy planes_dueno on planes for all
  using (gimnasio_id = current_gimnasio_id() and is_dueno())
  with check (gimnasio_id = current_gimnasio_id() and is_dueno() and gimnasio_permite_escritura());

-- pagos: dueño puede registrar solo si no está en solo_lectura
drop policy if exists pagos_dueno on pagos;
create policy pagos_dueno on pagos for all
  using (gimnasio_id = current_gimnasio_id() and is_dueno())
  with check (gimnasio_id = current_gimnasio_id() and is_dueno() and gimnasio_permite_escritura());

-- rutinas: dueño puede crear/modificar solo si no está en solo_lectura
drop policy if exists rutinas_dueno on rutinas;
create policy rutinas_dueno on rutinas for all
  using (gimnasio_id = current_gimnasio_id() and is_dueno())
  with check (gimnasio_id = current_gimnasio_id() and is_dueno() and gimnasio_permite_escritura());

-- rutinas: cliente puede insertar solo si no está en solo_lectura
drop policy if exists rutinas_cliente_insert on rutinas;
create policy rutinas_cliente_insert on rutinas for insert
  with check (gimnasio_id = current_gimnasio_id()
              and cliente_id = current_cliente_id()
              and gimnasio_permite_escritura());

-- rutinas: cliente puede actualizar solo si no está en solo_lectura
drop policy if exists rutinas_cliente_update on rutinas;
create policy rutinas_cliente_update on rutinas for update
  using (cliente_id = current_cliente_id())
  with check (cliente_id = current_cliente_id() and gimnasio_permite_escritura());

-- rutinas: cliente puede eliminar solo si no está en solo_lectura
drop policy if exists rutinas_cliente_delete on rutinas;
create policy rutinas_cliente_delete on rutinas for delete
  using (cliente_id = current_cliente_id() and gimnasio_permite_escritura());

-- rutina_items: bloquear escritura en solo_lectura
drop policy if exists rutina_items_write on rutina_items;
create policy rutina_items_write on rutina_items for all
  using (exists (select 1 from rutinas r where r.id = rutina_id
                 and r.gimnasio_id = current_gimnasio_id()
                 and (is_dueno() or r.cliente_id = current_cliente_id())))
  with check (exists (select 1 from rutinas r where r.id = rutina_id
                 and r.gimnasio_id = current_gimnasio_id()
                 and (is_dueno() or r.cliente_id = current_cliente_id()))
              and gimnasio_permite_escritura());

-- mensajes: dueño puede enviar solo si no está en solo_lectura
drop policy if exists mensajes_dueno_insert on mensajes;
create policy mensajes_dueno_insert on mensajes for insert
  with check (gimnasio_id = current_gimnasio_id() and is_dueno()
              and remitente_id = auth.uid()
              and gimnasio_permite_escritura());

-- mensaje_destinatarios: dueño puede crear solo si no está en solo_lectura
drop policy if exists md_dueno_insert on mensaje_destinatarios;
create policy md_dueno_insert on mensaje_destinatarios for insert
  with check (mensaje_gimnasio(mensaje_id) = current_gimnasio_id() and is_dueno()
              and gimnasio_permite_escritura());

-- mensaje_respuestas: bloquear respuestas en solo_lectura (dueño y cliente)
drop policy if exists mr_dueno_insert on mensaje_respuestas;
create policy mr_dueno_insert on mensaje_respuestas for insert
  with check (mensaje_gimnasio(mensaje_id) = current_gimnasio_id()
              and is_dueno()
              and remitente_id = auth.uid()
              and gimnasio_permite_escritura());

drop policy if exists mr_cliente_insert on mensaje_respuestas;
create policy mr_cliente_insert on mensaje_respuestas for insert
  with check (mensaje_remitente(mensaje_id) = auth.uid()
              and mensaje_respondible(mensaje_id)
              and remitente_id = auth.uid()
              and gimnasio_permite_escritura());

-- registros_entrada: dueño puede registrar check-in solo si no está en solo_lectura
drop policy if exists registros_entrada_dueno on registros_entrada;
create policy registros_entrada_dueno on registros_entrada for all
  using (gimnasio_id = current_gimnasio_id() and is_dueno())
  with check (gimnasio_id = current_gimnasio_id() and is_dueno() and gimnasio_permite_escritura());

-- ejercicios: dueño puede crear ejercicios propios solo si no está en solo_lectura
drop policy if exists ejercicios_dueno on ejercicios;
create policy ejercicios_dueno on ejercicios for all
  using (gimnasio_id = current_gimnasio_id() and is_dueno())
  with check (gimnasio_id = current_gimnasio_id() and is_dueno() and gimnasio_permite_escritura());

-- profiles: dueño puede crear/modificar profiles solo si no está en solo_lectura
drop policy if exists prof_dueno_all on profiles;
create policy prof_dueno_all on profiles for all
  using (gimnasio_id = current_gimnasio_id() and is_dueno())
  with check (gimnasio_id = current_gimnasio_id() and is_dueno() and gimnasio_permite_escritura());

-- push_subscriptions: bloquear suscripciones en solo_lectura
drop policy if exists push_cliente_insert on push_subscriptions;
create policy push_cliente_insert on push_subscriptions for insert
  with check (profile_id = auth.uid() and gimnasio_permite_escritura());

drop policy if exists push_cliente_delete on push_subscriptions;
create policy push_cliente_delete on push_subscriptions for delete
  using (profile_id = auth.uid() and gimnasio_permite_escritura());

-- ─────────────────────────────────────────────────────────────
-- 5) Nota: para activar un plan manualmente (ejecutar en Supabase SQL Editor)
-- ─────────────────────────────────────────────────────────────
-- UPDATE gimnasios SET estado = 'activo' WHERE id = '<uuid_del_gimnasio>';
