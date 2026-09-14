-- Permite que el propio socio elija su foto de perfil (subida o preset Volt),
-- sin abrir el resto de la fila `clientes` a escritura desde el cliente.
-- Se usa una función security definer en vez de una policy de UPDATE amplia.

create or replace function public.actualizar_foto_propia(p_foto_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update clientes
  set foto_url = p_foto_url
  where profile_id = auth.uid()
    and gimnasio_id = current_gimnasio_id();
end;
$$;

revoke all on function public.actualizar_foto_propia(text) from public;
grant execute on function public.actualizar_foto_propia(text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Bucket `fotos-socios`: el cliente también puede subir/reemplazar
-- su propia foto, sólo en <gimnasio_id>/<su_cliente_id>.<ext>.
-- ─────────────────────────────────────────────────────────────
drop policy if exists "fotos-socios escribe cliente propio" on storage.objects;
create policy "fotos-socios escribe cliente propio" on storage.objects for insert
  with check (
    bucket_id = 'fotos-socios'
    and (storage.foldername(name))[1] = current_gimnasio_id()::text
    and split_part(name, '/', 2) like current_cliente_id()::text || '.%'
  );

drop policy if exists "fotos-socios actualiza cliente propio" on storage.objects;
create policy "fotos-socios actualiza cliente propio" on storage.objects for update
  using (
    bucket_id = 'fotos-socios'
    and (storage.foldername(name))[1] = current_gimnasio_id()::text
    and split_part(name, '/', 2) like current_cliente_id()::text || '.%'
  )
  with check (
    bucket_id = 'fotos-socios'
    and (storage.foldername(name))[1] = current_gimnasio_id()::text
    and split_part(name, '/', 2) like current_cliente_id()::text || '.%'
  );
