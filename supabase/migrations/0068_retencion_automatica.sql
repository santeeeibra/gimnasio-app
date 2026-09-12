-- Retención automática (Anti-Churn) vía pg_cron.
-- Corre en la base de datos a las 3am: no consume cuota de Vercel ni tokens de IA.
-- Inserta un aviso "Pulpo Volt te extraña" para socios con +10 días sin check-in,
-- evitando duplicar el mensaje si ya se envió uno en los últimos 15 días.

create extension if not exists pg_cron;

create table notificaciones_pendientes (
  id          uuid primary key default gen_random_uuid(),
  gimnasio_id uuid not null references gimnasios (id) on delete cascade,
  cliente_id  uuid not null references clientes (id) on delete cascade,
  tipo        text not null default 'retencion',
  mensaje     text not null,
  estado      text not null default 'pendiente' check (estado in ('pendiente', 'enviado')),
  creado_en   timestamptz not null default now()
);

create index on notificaciones_pendientes (cliente_id, estado);
create index on notificaciones_pendientes (cliente_id, tipo, creado_en desc);

alter table notificaciones_pendientes enable row level security;

-- El socio lee y actualiza (marcar 'enviado') únicamente sus propios avisos.
create policy notificaciones_pendientes_socio_select on notificaciones_pendientes
  for select
  using (cliente_id = current_cliente_id());

create policy notificaciones_pendientes_socio_update on notificaciones_pendientes
  for update
  using (cliente_id = current_cliente_id())
  with check (cliente_id = current_cliente_id());

-- El dueño ve los avisos generados para su gimnasio (panel de retención a futuro).
create policy notificaciones_pendientes_dueno_select on notificaciones_pendientes
  for select
  using (gimnasio_id = current_gimnasio_id() and is_dueno());

create or replace function generar_notificaciones_retencion()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notificaciones_pendientes (gimnasio_id, cliente_id, tipo, mensaje)
  select
    c.gimnasio_id,
    c.id,
    'retencion',
    '¡Hola! El Pulpo Volt te extraña 🐙. Te armé una rutina express de 20 min para retomar sin estrés. ¿Nos vemos hoy?'
  from clientes c
  left join lateral (
    select max(r.creado_en) as ultimo_checkin
    from registros_entrada r
    where r.cliente_id = c.id
  ) ult on true
  where c.estado_cuota <> 'vencido'
    and coalesce(ult.ultimo_checkin, c.creado_at) < now() - interval '10 days'
    and not exists (
      select 1
      from notificaciones_pendientes n
      where n.cliente_id = c.id
        and n.tipo = 'retencion'
        and n.creado_en > now() - interval '15 days'
    );
end;
$$;

select cron.schedule(
  'job-retencion-diaria',
  '0 3 * * *',
  'select generar_notificaciones_retencion();'
);
