-- Modo solo-lectura para trial vencido (14 días sin activar plan pago).
-- Cuando gimnasios.estado = 'solo_lectura', se bloquea toda escritura del dueño
-- y de los clientes. Las lecturas siguen intactas.
--
-- Reescrito para coincidir con el esquema real (0001 + 0005 + 0009):
--   * mensaje_respuestas usa autor_id (no remitente_id); policy real: resp_insert
--   * push: policy real push_own (no push_cliente_*)
-- Idempotente: se puede correr más de una vez.

-- ─────────────────────────────────────────────────────────────
-- 1) Columna estado en gimnasios
-- ─────────────────────────────────────────────────────────────
alter table public.gimnasios
  add column if not exists estado text not null default 'prueba'
  check (estado in ('prueba', 'activo', 'solo_lectura'));

comment on column public.gimnasios.estado is
  'prueba (trial inicial) | activo (plan pago) | solo_lectura (trial vencido sin pago)';

-- ─────────────────────────────────────────────────────────────
-- 2) Función: marcar trials vencidos (la llama el cron diario)
--    Nota: la columna de fecha de alta es creado_at (ver 0001).
-- ─────────────────────────────────────────────────────────────
create or replace function chequear_trial_vencido()
returns void language sql as $$
  update public.gimnasios
  set estado = 'solo_lectura'
  where estado = 'prueba'
    and (now() - creado_at) > interval '14 days';
$$;

-- ─────────────────────────────────────────────────────────────
-- 3) Helper RLS: ¿el gimnasio actual permite escribir?
-- ─────────────────────────────────────────────────────────────
create or replace function gimnasio_permite_escritura()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select estado <> 'solo_lectura' from public.gimnasios where id = current_gimnasio_id()),
    true
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- 4) Recrear las policies de escritura reales + gate de escritura.
--    Cada policy queda igual que en 0001/0005/0009, sumando
--    gimnasio_permite_escritura() al WITH CHECK (o al USING en DELETE).
-- ─────────────────────────────────────────────────────────────

-- profiles: alta/edición de clientes por el dueño
drop policy if exists prof_dueno_all on public.profiles;
create policy prof_dueno_all on public.profiles for all
  using (gimnasio_id = current_gimnasio_id() and is_dueno())
  with check (gimnasio_id = current_gimnasio_id() and is_dueno()
              and gimnasio_permite_escritura());

-- planes
drop policy if exists planes_dueno on public.planes;
create policy planes_dueno on public.planes for all
  using (gimnasio_id = current_gimnasio_id() and is_dueno())
  with check (gimnasio_id = current_gimnasio_id() and is_dueno()
              and gimnasio_permite_escritura());

-- clientes
drop policy if exists clientes_dueno on public.clientes;
create policy clientes_dueno on public.clientes for all
  using (gimnasio_id = current_gimnasio_id() and is_dueno())
  with check (gimnasio_id = current_gimnasio_id() and is_dueno()
              and gimnasio_permite_escritura());

-- pagos
drop policy if exists pagos_dueno on public.pagos;
create policy pagos_dueno on public.pagos for all
  using (gimnasio_id = current_gimnasio_id() and is_dueno())
  with check (gimnasio_id = current_gimnasio_id() and is_dueno()
              and gimnasio_permite_escritura());

-- ejercicios propios del gimnasio
drop policy if exists ejercicios_dueno on public.ejercicios;
create policy ejercicios_dueno on public.ejercicios for all
  using (gimnasio_id = current_gimnasio_id() and is_dueno())
  with check (gimnasio_id = current_gimnasio_id() and is_dueno()
              and gimnasio_permite_escritura());

-- rutinas: dueño
drop policy if exists rutinas_dueno on public.rutinas;
create policy rutinas_dueno on public.rutinas for all
  using (gimnasio_id = current_gimnasio_id() and is_dueno())
  with check (gimnasio_id = current_gimnasio_id() and is_dueno()
              and gimnasio_permite_escritura());

-- rutinas: cliente (insert / update / delete)
drop policy if exists rutinas_cliente_insert on public.rutinas;
create policy rutinas_cliente_insert on public.rutinas for insert
  with check (gimnasio_id = current_gimnasio_id()
              and cliente_id = current_cliente_id()
              and gimnasio_permite_escritura());

drop policy if exists rutinas_cliente_update on public.rutinas;
create policy rutinas_cliente_update on public.rutinas for update
  using (cliente_id = current_cliente_id())
  with check (cliente_id = current_cliente_id()
              and gimnasio_permite_escritura());

drop policy if exists rutinas_cliente_delete on public.rutinas;
create policy rutinas_cliente_delete on public.rutinas for delete
  using (cliente_id = current_cliente_id() and gimnasio_permite_escritura());

-- rutina_items
drop policy if exists rutina_items_write on public.rutina_items;
create policy rutina_items_write on public.rutina_items for all
  using (exists (select 1 from public.rutinas r where r.id = rutina_id
                 and r.gimnasio_id = current_gimnasio_id()
                 and (is_dueno() or r.cliente_id = current_cliente_id())))
  with check (exists (select 1 from public.rutinas r where r.id = rutina_id
                 and r.gimnasio_id = current_gimnasio_id()
                 and (is_dueno() or r.cliente_id = current_cliente_id()))
              and gimnasio_permite_escritura());

-- mensajes: el dueño envía
drop policy if exists mensajes_dueno_insert on public.mensajes;
create policy mensajes_dueno_insert on public.mensajes for insert
  with check (gimnasio_id = current_gimnasio_id() and is_dueno()
              and remitente_id = auth.uid()
              and gimnasio_permite_escritura());

-- mensaje_destinatarios: el dueño arma la lista
drop policy if exists md_dueno_insert on public.mensaje_destinatarios;
create policy md_dueno_insert on public.mensaje_destinatarios for insert
  with check (mensaje_gimnasio(mensaje_id) = current_gimnasio_id() and is_dueno()
              and gimnasio_permite_escritura());

-- mensaje_respuestas: responder un hilo (columna real: autor_id)
drop policy if exists resp_insert on public.mensaje_respuestas;
create policy resp_insert on public.mensaje_respuestas for insert
  with check (autor_id = auth.uid()
              and mensaje_respondible(mensaje_id)
              and (mensaje_remitente(mensaje_id) = auth.uid()
                   or soy_destinatario(mensaje_id))
              and gimnasio_permite_escritura());

-- registros_entrada: check-in del dueño (0009)
drop policy if exists registros_entrada_dueno on public.registros_entrada;
create policy registros_entrada_dueno on public.registros_entrada for all
  using (gimnasio_id = current_gimnasio_id() and is_dueno())
  with check (gimnasio_id = current_gimnasio_id() and is_dueno()
              and gimnasio_permite_escritura());

-- Nota: push_subscriptions (policy push_own) queda escribible aunque el
-- gimnasio esté en solo_lectura: suscribirse a notificaciones no es una
-- operación de negocio que el trial deba bloquear.

-- ─────────────────────────────────────────────────────────────
-- 5) Para activar un plan a mano:
--    UPDATE gimnasios SET estado = 'activo' WHERE id = '<uuid>';
-- ─────────────────────────────────────────────────────────────
