-- Fondo personalizado de la pantalla de check-in (kiosko).
-- Config vive en gimnasios.tema.checkinFondo (jsonb, sin columna nueva) —
-- mismo patrón que tema.reposoCheckin. Solo hace falta el bucket para las
-- imágenes que el dueño suba (las precargadas por SysGym van en /public).

-- ─────────────────────────────────────────────────────────────
-- Bucket `checkin-fondos`: lectura pública, escritura sólo del dueño.
-- Path por archivo: <gimnasio_id>.webp (se sobreescribe al subir uno nuevo).
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('checkin-fondos', 'checkin-fondos', true)
on conflict (id) do update set public = true;

drop policy if exists "checkin-fondos lectura publica" on storage.objects;
create policy "checkin-fondos lectura publica" on storage.objects for select
  using (bucket_id = 'checkin-fondos');

drop policy if exists "checkin-fondos escribe dueno" on storage.objects;
create policy "checkin-fondos escribe dueno" on storage.objects for insert
  with check (
    bucket_id = 'checkin-fondos'
    and is_dueno()
    and name = current_gimnasio_id()::text || '.webp'
  );

drop policy if exists "checkin-fondos actualiza dueno" on storage.objects;
create policy "checkin-fondos actualiza dueno" on storage.objects for update
  using (
    bucket_id = 'checkin-fondos'
    and is_dueno()
    and name = current_gimnasio_id()::text || '.webp'
  )
  with check (
    bucket_id = 'checkin-fondos'
    and is_dueno()
    and name = current_gimnasio_id()::text || '.webp'
  );

drop policy if exists "checkin-fondos borra dueno" on storage.objects;
create policy "checkin-fondos borra dueno" on storage.objects for delete
  using (
    bucket_id = 'checkin-fondos'
    and is_dueno()
    and name = current_gimnasio_id()::text || '.webp'
  );
