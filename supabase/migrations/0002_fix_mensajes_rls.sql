-- Fix: "infinite recursion detected in policy for relation mensajes" (42P17).
-- Las policies de mensajes ↔ mensaje_destinatarios ↔ mensaje_respuestas se
-- referenciaban entre sí, así que cada SELECT reentraba en la otra policy.
-- Solución: mover los chequeos cruzados a funciones SECURITY DEFINER (saltean
-- RLS) y reescribir las policies para que no toquen otra tabla con RLS.

-- ── Helpers (SECURITY DEFINER: no disparan RLS al leer las tablas) ──
create or replace function soy_destinatario(_mensaje_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from mensaje_destinatarios
    where mensaje_id = _mensaje_id and profile_id = auth.uid()
  )
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

-- ── mensajes ──
drop policy if exists mensajes_select on mensajes;
create policy mensajes_select on mensajes for select
  using (gimnasio_id = current_gimnasio_id()
         and (remitente_id = auth.uid() or soy_destinatario(id)));

drop policy if exists mensajes_dueno_insert on mensajes;
create policy mensajes_dueno_insert on mensajes for insert
  with check (gimnasio_id = current_gimnasio_id() and is_dueno()
              and remitente_id = auth.uid());

-- ── mensaje_destinatarios ──
drop policy if exists md_select on mensaje_destinatarios;
create policy md_select on mensaje_destinatarios for select
  using (profile_id = auth.uid()
         or (mensaje_gimnasio(mensaje_id) = current_gimnasio_id() and is_dueno()));

drop policy if exists md_update_leido on mensaje_destinatarios;
create policy md_update_leido on mensaje_destinatarios for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists md_dueno_insert on mensaje_destinatarios;
create policy md_dueno_insert on mensaje_destinatarios for insert
  with check (mensaje_gimnasio(mensaje_id) = current_gimnasio_id() and is_dueno());

-- ── mensaje_respuestas ──
drop policy if exists resp_select on mensaje_respuestas;
create policy resp_select on mensaje_respuestas for select
  using (mensaje_remitente(mensaje_id) = auth.uid()
         or soy_destinatario(mensaje_id));

drop policy if exists resp_insert on mensaje_respuestas;
create policy resp_insert on mensaje_respuestas for insert
  with check (autor_id = auth.uid()
              and mensaje_respondible(mensaje_id)
              and (mensaje_remitente(mensaje_id) = auth.uid()
                   or soy_destinatario(mensaje_id)));
