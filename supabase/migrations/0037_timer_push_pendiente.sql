-- Migración: push diferido del timer de descanso entre series.
-- El cliente registra "mandame un push dentro de N segundos"; un cron drena la
-- tabla y dispara enviarPush(). Una fila por socio (se pisa al reiniciar el
-- descanso), se borra al cancelar / pausar / completar en pantalla.

create table if not exists timer_push_pendiente (
  profile_id uuid primary key references profiles(id) on delete cascade,
  disparar_en timestamptz not null,
  segundos int not null,
  creado_en timestamptz not null default now()
);

create index if not exists timer_push_pendiente_disparar_idx
  on timer_push_pendiente (disparar_en);

alter table timer_push_pendiente enable row level security;

-- El socio maneja únicamente su propia fila. El cron usa service_role (salta RLS).
create policy "socio_maneja_su_timer_push" on timer_push_pendiente
  for all
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
