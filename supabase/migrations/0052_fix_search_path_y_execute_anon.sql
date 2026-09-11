-- #4: funciones SECURITY DEFINER sin search_path fijo (advisor
-- function_search_path_mutable). ALTER FUNCTION no toca el body, solo fija
-- el search_path — mismo patrón que ya usan is_dueno()/current_gimnasio_id().

alter function public.recalcular_estado_cuota() set search_path = public;
alter function public.chequear_trial_vencido() set search_path = public;
alter function public.chequear_plan_vencido() set search_path = public;
alter function public.asignar_plan_basico_default() set search_path = public;
alter function public.gimnasio_alumnos_activos(uuid) set search_path = public;
alter function public.gimnasio_puede_agregar_alumno(uuid) set search_path = public;
alter function public.trg_check_limite_gratuito() set search_path = public;
alter function public.gimnasio_es_pago_activo(uuid) set search_path = public;
alter function public.partner_balance(uuid) set search_path = public;
alter function public.partner_notificar_pago_o_hito() set search_path = public;

-- #5: funciones SECURITY DEFINER de solo lectura/RLS-helper expuestas como
-- RPC público a `anon` sin necesidad (se usan solo dentro de policies para
-- usuarios logueados, nunca deberían llamarse desde el browser sin sesión).
-- Se revoca SOLO de `anon`; `authenticated` se deja intacto porque las
-- policies RLS evalúan estas funciones con el rol del usuario logueado y
-- perderían el permiso de ejecución si se revocara ahí también.

revoke execute on function public.current_cliente_id() from anon;
revoke execute on function public.current_gimnasio_id() from anon;
revoke execute on function public.is_dueno() from anon;
revoke execute on function public.gimnasio_permite_escritura() from anon;
revoke execute on function public.mensaje_gimnasio(uuid) from anon;
revoke execute on function public.mensaje_remitente(uuid) from anon;
revoke execute on function public.mensaje_respondible(uuid) from anon;
revoke execute on function public.soy_destinatario(uuid) from anon;

-- asignar_plan_basico_default y trg_procesar_comision_partner son
-- disparadas por triggers/altas de gimnasio, no las llama el cliente en
-- ningún flujo: se revocan de anon y authenticated.
revoke execute on function public.asignar_plan_basico_default() from anon, authenticated;
revoke execute on function public.partner_notificar_pago_o_hito() from anon, authenticated;
revoke execute on function public.trg_procesar_comision_partner() from anon, authenticated;
