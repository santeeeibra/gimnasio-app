-- Logo del gimnasio: columna + bucket de Storage.
-- El dueño sube el logo desde /panel/ajustes (comprimido en el navegador a
-- WebP <= 512px y < 300 KB). null => la app usa el nombre en texto / ícono
-- genérico, sin romper nada para gimnasios sin logo.

alter table gimnasios add column if not exists logo_url text;

comment on column gimnasios.logo_url is
  'URL pública del logo del gimnasio en el bucket `logos`. null = sin logo.';

-- ─────────────────────────────────────────────────────────────
-- Bucket `logos`: lectura pública, escritura sólo del dueño.
-- Path por archivo: <gimnasio_id>.webp (un solo archivo, se sobreescribe al
-- subir uno nuevo — no se versiona).
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do update set public = true;

-- Lectura pública (el logo se muestra a clientes sin sesión de dueño).
drop policy if exists "logos lectura publica" on storage.objects;
create policy "logos lectura publica" on storage.objects for select
  using (bucket_id = 'logos');

-- Escritura / reemplazo / borrado: sólo el dueño, sólo sobre su propio path
-- (<gimnasio_id>.webp). Mismo patrón que las policies de `mensajes`.
drop policy if exists "logos escribe dueno" on storage.objects;
create policy "logos escribe dueno" on storage.objects for insert
  with check (
    bucket_id = 'logos'
    and is_dueno()
    and name = current_gimnasio_id()::text || '.webp'
  );

drop policy if exists "logos actualiza dueno" on storage.objects;
create policy "logos actualiza dueno" on storage.objects for update
  using (
    bucket_id = 'logos'
    and is_dueno()
    and name = current_gimnasio_id()::text || '.webp'
  )
  with check (
    bucket_id = 'logos'
    and is_dueno()
    and name = current_gimnasio_id()::text || '.webp'
  );

drop policy if exists "logos borra dueno" on storage.objects;
create policy "logos borra dueno" on storage.objects for delete
  using (
    bucket_id = 'logos'
    and is_dueno()
    and name = current_gimnasio_id()::text || '.webp'
  );
