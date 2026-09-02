-- Entregable 4 — Rutinas
-- Amplía ejercicios/rutinas para el motor de reglas y habilita que el cliente
-- genere y edite su propia rutina bajo RLS.

-- ─────────────────────────────────────────────────────────────
-- ejercicios: metadatos que usa el motor de selección
-- ─────────────────────────────────────────────────────────────
alter table ejercicios add column if not exists slug        text;
alter table ejercicios add column if not exists patron      text;
alter table ejercicios add column if not exists equipo      text;
alter table ejercicios add column if not exists descripcion text;

-- slug único dentro de la base global (gimnasio_id null). El seed hace upsert por slug.
create unique index if not exists ejercicios_slug_global
  on ejercicios (slug) where gimnasio_id is null;

-- ─────────────────────────────────────────────────────────────
-- rutinas: parámetros con los que se generó
-- ─────────────────────────────────────────────────────────────
alter table rutinas add column if not exists nivel        text
  check (nivel in ('principiante', 'intermedio', 'avanzado'));
alter table rutinas add column if not exists preferencias jsonb;

-- Una rutina activa por cliente (regenerar = upsert sobre esta fila).
alter table rutinas drop constraint if exists rutinas_cliente_unico;
alter table rutinas add constraint rutinas_cliente_unico unique (cliente_id);

-- ─────────────────────────────────────────────────────────────
-- RLS: el cliente puede crear su rutina (antes solo podía update)
-- ─────────────────────────────────────────────────────────────
drop policy if exists rutinas_cliente_insert on rutinas;
create policy rutinas_cliente_insert on rutinas for insert
  with check (gimnasio_id = current_gimnasio_id()
              and cliente_id = current_cliente_id());

drop policy if exists rutinas_cliente_delete on rutinas;
create policy rutinas_cliente_delete on rutinas for delete
  using (cliente_id = current_cliente_id());
