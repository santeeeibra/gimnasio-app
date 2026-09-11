-- Fix RLS: "rutinas_cliente_update" no fijaba gimnasio_id en el WITH CHECK.
-- Un socio podía, en teoría, reescribir el gimnasio_id de su propia rutina a
-- otro valor: no le da acceso a leer datos ajenos, pero contamina la relación
-- tenant/rutina (rompe joins/queries del dueño del otro gimnasio).

drop policy if exists rutinas_cliente_update on public.rutinas;
create policy rutinas_cliente_update on public.rutinas for update
  using (cliente_id = current_cliente_id())
  with check (
    cliente_id = current_cliente_id()
    and gimnasio_id = current_gimnasio_id()
    and gimnasio_permite_escritura()
  );
