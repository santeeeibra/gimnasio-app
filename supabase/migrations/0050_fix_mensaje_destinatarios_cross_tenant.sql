-- Fix RLS: "md_dueno_insert" validaba que el mensaje perteneciera al gimnasio
-- del dueño, pero no que el profile_id insertado como destinatario también
-- perteneciera a ese mismo gimnasio. Un dueño que conociera (o filtrara) el
-- UUID de un profile de OTRO gimnasio podía insertarlo como destinatario, y
-- "md_select" deja leer por profile_id = auth.uid() sin filtrar gimnasio ->
-- fuga de mensajes entre tenants.

drop policy if exists md_dueno_insert on public.mensaje_destinatarios;
create policy md_dueno_insert on public.mensaje_destinatarios for insert
  with check (
    mensaje_gimnasio(mensaje_id) = current_gimnasio_id()
    and is_dueno()
    and gimnasio_permite_escritura()
    and profile_id in (
      select id from public.profiles where gimnasio_id = current_gimnasio_id()
    )
  );
