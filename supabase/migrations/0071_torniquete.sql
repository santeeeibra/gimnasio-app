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

create index if not exists comandos_torniquete_pendientes_idx
  on comandos_torniquete (gimnasio_id, estado, creado_en);

alter table dispositivos_torniquete enable row level security;
alter table comandos_torniquete enable row level security;

drop policy if exists "dispositivos_torniquete_select" on dispositivos_torniquete;
create policy "dispositivos_torniquete_select" on dispositivos_torniquete
  for select to public
  using (gimnasio_id = current_gimnasio_id() and is_staff_o_dueno());

drop policy if exists "comandos_torniquete_select" on comandos_torniquete;
create policy "comandos_torniquete_select" on comandos_torniquete
  for select to public
  using (gimnasio_id = current_gimnasio_id() and is_staff_o_dueno());

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

-- PostgreSQL concede EXECUTE a PUBLIC por defecto al crear funciones. Revocar
-- PUBLIC no siempre elimina grants explícitos heredados por roles de API, así
-- que endurecemos también anon/authenticated: sólo service_role puede llamarla.
revoke execute on function torniquete_entregar_comando(uuid, uuid) from public;
revoke execute on function torniquete_entregar_comando(uuid, uuid) from anon;
revoke execute on function torniquete_entregar_comando(uuid, uuid) from authenticated;
grant execute on function torniquete_entregar_comando(uuid, uuid) to service_role;
