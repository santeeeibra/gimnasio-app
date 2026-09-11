-- Fix #5 (real): el REVOKE de la 0052 no alcanzó porque Postgres otorga
-- EXECUTE a PUBLIC por default al crear una función, y anon/authenticated
-- heredan ese grant aunque se les revoque puntualmente. Hay que revocar de
-- PUBLIC y volver a otorgar explícito solo donde hace falta.
--
-- Verificado en el código (2026-09-11): ningún query anónimo (rol `anon`,
-- cliente browser sin sesión) toca tablas gateadas por estas funciones.
-- Todo lo público usa createAdminClient() (service_role, bypassea RLS) o
-- corre después de signInWithPassword (ya autenticado). Las funciones
-- helper de RLS solo las necesita el rol `authenticated`.

-- Helpers de RLS: se siguen usando dentro de policies para usuarios logueados.
revoke execute on function public.current_cliente_id() from public;
revoke execute on function public.current_gimnasio_id() from public;
revoke execute on function public.is_dueno() from public;
revoke execute on function public.gimnasio_permite_escritura() from public;
revoke execute on function public.mensaje_gimnasio(uuid) from public;
revoke execute on function public.mensaje_remitente(uuid) from public;
revoke execute on function public.mensaje_respondible(uuid) from public;
revoke execute on function public.soy_destinatario(uuid) from public;

grant execute on function public.current_cliente_id() to authenticated;
grant execute on function public.current_gimnasio_id() to authenticated;
grant execute on function public.is_dueno() to authenticated;
grant execute on function public.gimnasio_permite_escritura() to authenticated;
grant execute on function public.mensaje_gimnasio(uuid) to authenticated;
grant execute on function public.mensaje_remitente(uuid) to authenticated;
grant execute on function public.mensaje_respondible(uuid) to authenticated;
grant execute on function public.soy_destinatario(uuid) to authenticated;

-- Estas 3 son solo de trigger/uso interno (confirmado: ningún .rpc() en el
-- código las llama) → sin grant para anon NI authenticated.
revoke execute on function public.asignar_plan_basico_default() from public;
revoke execute on function public.partner_notificar_pago_o_hito() from public;
revoke execute on function public.trg_procesar_comision_partner() from public;
