-- Backend del torniquete (ESP32/Wokwi) para feat/turnstile-backend.
--
-- Dos tablas nuevas, desacopladas del check-in normal:
--   - dispositivos_torniquete: un dispositivo por molinete, autenticado con un
--     token que sólo se guarda hasheado (sha256, calculado en la app) y que
--     se puede revocar sin borrar el historial.
--   - comandos_torniquete: la cola de OPEN_ENTRY/DENY que deja el check-in.
--     El check-in siempre escribe acá "a ciegas" (best-effort desde la app);
--     si no hay dispositivo o nadie los consume, los comandos vencen solos.
--
-- El check-in (checkin/actions.ts) sigue funcionando igual si estas tablas
-- fallan o no existe un dispositivo: la escritura es best-effort y nunca
-- condiciona la decisión de acceso (decidirAcceso en src/lib/acceso).

create table if not exists dispositivos_torniquete (
  id uuid primary key default gen_random_uuid(),
  gimnasio_id uuid not null references gimnasios(id) on delete cascade,
  nombre text not null,
  token_hash text not null unique,
  creado_en timestamptz not null default now(),
  revocado_en timestamptz,
  ultimo_visto_en timestamptz
);

create index if not exists dispositivos_torniquete_gimnasio_idx
  on dispositivos_torniquete (gimnasio_id);

create table if not exists comandos_torniquete (
  id uuid primary key default gen_random_uuid(),
  gimnasio_id uuid not null references gimnasios(id) on delete cascade,
  comando text not null check (comando in ('OPEN_ENTRY', 'DENY')),
  motivo text,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'entregado', 'confirmado', 'expirado')),
  creado_en timestamptz not null default now(),
  -- Vencimiento fijo de 20s: un comando que nadie retiró a tiempo no debe
  -- poder abrir el molinete minutos después de un check-in ya resuelto.
  vence_en timestamptz not null default (now() + interval '20 seconds'),
  entregado_en timestamptz,
  entregado_a uuid references dispositivos_torniquete(id),
  confirmado_en timestamptz,
  giro_detectado boolean,
  cerrado boolean
);

-- Índice que soporta la selección atómica: "el pendiente más viejo, no
-- vencido, de este gimnasio".
create index if not exists comandos_torniquete_pendientes_idx
  on comandos_torniquete (gimnasio_id, estado, creado_en);

alter table dispositivos_torniquete enable row level security;
alter table comandos_torniquete enable row level security;

-- Sólo lectura desde el panel (dueño/staff del gimnasio). El endpoint del
-- ESP32 y el check-in escriben con el cliente admin (service_role), que
-- ignora RLS: la autenticación del dispositivo se valida en código de app
-- contra token_hash, no con una policy de RLS basada en su token.
drop policy if exists "dispositivos_torniquete_select" on dispositivos_torniquete;
create policy "dispositivos_torniquete_select" on dispositivos_torniquete
  for select to public
  using (gimnasio_id = current_gimnasio_id() and is_staff_o_dueno());

drop policy if exists "comandos_torniquete_select" on comandos_torniquete;
create policy "comandos_torniquete_select" on comandos_torniquete
  for select to public
  using (gimnasio_id = current_gimnasio_id() and is_staff_o_dueno());

-- Entrega atómica de un comando: un mismo comando no puede ser recogido por
-- dos polls concurrentes. El UPDATE con subquery + FOR UPDATE SKIP LOCKED es
-- una única sentencia: sólo un llamador gana la fila, el resto no ve nada
-- (SKIP LOCKED) o ya la encuentra en estado != 'pendiente'.
--
-- Es security definer y sólo la puede ejecutar service_role (ver revoke/grant
-- al final): p_dispositivo_id y p_gimnasio_id no se toman como verdad porque
-- vengan de un caller de confianza, se validan acá adentro contra la tabla
-- de dispositivos (existe, pertenece a ese gimnasio, no está revocado) antes
-- de tocar un solo comando — así una llamada con un par
-- dispositivo/gimnasio que no matchean, o un dispositivo ya revocado, no
-- entrega nada, aunque alguien logre invocar la función directamente.
create or replace function torniquete_entregar_comando(
  p_dispositivo_id uuid,
  p_gimnasio_id uuid
)
returns setof comandos_torniquete
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from dispositivos_torniquete
    where id = p_dispositivo_id
      and gimnasio_id = p_gimnasio_id
      and revocado_en is null
  ) then
    return;
  end if;

  -- Housekeeping oportunista: marcar vencidos antes de elegir, para que no
  -- queden eternamente en 'pendiente' en un dashboard futuro.
  update comandos_torniquete
  set estado = 'expirado'
  where gimnasio_id = p_gimnasio_id
    and estado = 'pendiente'
    and vence_en <= now();

  return query
  update comandos_torniquete c
  set estado = 'entregado',
      entregado_en = now(),
      entregado_a = p_dispositivo_id
  where c.id = (
    select id
    from comandos_torniquete
    where gimnasio_id = p_gimnasio_id
      and estado = 'pendiente'
      and vence_en > now()
    order by creado_en asc
    for update skip locked
    limit 1
  )
  returning c.*;
end;
$$;

revoke execute on function torniquete_entregar_comando(uuid, uuid) from public;
grant execute on function torniquete_entregar_comando(uuid, uuid) to service_role;
