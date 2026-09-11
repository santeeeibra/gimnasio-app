-- Fix crítico de RLS: la policy "clientes_update_propio" (migración 0024)
-- permite UPDATE de CUALQUIER columna de la fila propia (profile_id = auth.uid()),
-- no solo tema_personalizado. Un socio autenticado podía, con un PATCH directo a
-- PostgREST (sin pasar por las Server Actions), cambiar su propio estado_cuota,
-- acceso_habilitado, en_prueba, plan_id, dni, sexo o incluso gimnasio_id.
--
-- RLS por sí sola no restringe columnas; hay que revocar el UPDATE amplio de
-- Postgres y otorgar solo la columna que el socio realmente necesita editar
-- desde el cliente (tema_personalizado, ver src/app/mi/ajustes/actions.ts).
--
-- El resto de las escrituras sobre `clientes` (alta, editar datos, pagos,
-- estado de cuota, etc.) siguen andando: pasan por Server Actions con
-- `service_role`, que no está sujeto a column-level GRANT/REVOKE.

revoke update on public.clientes from authenticated;
grant update (tema_personalizado) on public.clientes to authenticated;
