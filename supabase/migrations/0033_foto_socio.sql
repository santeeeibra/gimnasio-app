-- Foto de perfil del socio: columna + bucket de Storage.
-- El dueño sube la foto desde la ficha del socio o el alta (comprimida en el navegador).
-- null => la app usa el avatar con las iniciales del socio.

alter table clientes add column if not exists foto_url text;

comment on column clientes.foto_url is
  'URL pública de la foto de perfil del socio en el bucket `fotos-socios`. null = sin foto.';

-- ─────────────────────────────────────────────────────────────
-- Bucket `fotos-socios`: lectura pública, escritura sólo del dueño.
-- Path por archivo: <gimnasio_id>/<nombre_archivo>
-- Se aísla por gimnasio en la primera carpeta: (storage.foldername(name))[1].
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('fotos-socios', 'fotos-socios', true)
on conflict (id) do update set public = true;

-- Lectura pública (la foto se muestra a clientes y dueños).
drop policy if exists "fotos-socios lectura publica" on storage.objects;
create policy "fotos-socios lectura publica" on storage.objects for select
  using (bucket_id = 'fotos-socios');

-- Escritura / reemplazo / borrado: sólo el dueño, sólo dentro de la carpeta de su gimnasio.
drop policy if exists "fotos-socios escribe dueno" on storage.objects;
create policy "fotos-socios escribe dueno" on storage.objects for insert
  with check (
    bucket_id = 'fotos-socios'
    and is_dueno()
    and (storage.foldername(name))[1] = current_gimnasio_id()::text
  );

drop policy if exists "fotos-socios actualiza dueno" on storage.objects;
create policy "fotos-socios actualiza dueno" on storage.objects for update
  using (
    bucket_id = 'fotos-socios'
    and is_dueno()
    and (storage.foldername(name))[1] = current_gimnasio_id()::text
  )
  with check (
    bucket_id = 'fotos-socios'
    and is_dueno()
    and (storage.foldername(name))[1] = current_gimnasio_id()::text
  );

drop policy if exists "fotos-socios borra dueno" on storage.objects;
create policy "fotos-socios borra dueno" on storage.objects for delete
  using (
    bucket_id = 'fotos-socios'
    and is_dueno()
    and (storage.foldername(name))[1] = current_gimnasio_id()::text
  );
