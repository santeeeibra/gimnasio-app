-- 0056_fix_unindexed_foreign_keys.sql
-- Fix advisor "unindexed_foreign_keys" (INFO, 22 hallazgos): FKs sin índice
-- que cubra la columna. Sin esto, cada UPDATE/DELETE en la tabla referenciada
-- (o cada JOIN por esa FK) hace un seq scan sobre la tabla hija. Con más gyms
-- vía partners, tablas como pagos/rutinas/mensajes van a crecer bastante.

create index if not exists admin_audit_log_actor_id_idx
  on public.admin_audit_log (actor_id);

create index if not exists admin_audit_log_gimnasio_id_idx
  on public.admin_audit_log (gimnasio_id);

create index if not exists buzon_comentarios_cliente_id_idx
  on public.buzon_comentarios (cliente_id);

create index if not exists clientes_origen_plantilla_idx
  on public.clientes (origen_plantilla);

create index if not exists clientes_plan_id_idx
  on public.clientes (plan_id);

create index if not exists ejercicios_gimnasio_id_idx
  on public.ejercicios (gimnasio_id);

create index if not exists gimnasios_plan_plataforma_id_idx
  on public.gimnasios (plan_plataforma_id);

create index if not exists mensaje_respuestas_autor_id_idx
  on public.mensaje_respuestas (autor_id);

create index if not exists mensaje_respuestas_mensaje_id_idx
  on public.mensaje_respuestas (mensaje_id);

create index if not exists mensajes_filtro_plan_id_idx
  on public.mensajes (filtro_plan_id);

create index if not exists mensajes_remitente_id_idx
  on public.mensajes (remitente_id);

create index if not exists pagos_gimnasio_id_idx
  on public.pagos (gimnasio_id);

create index if not exists pagos_plan_id_idx
  on public.pagos (plan_id);

create index if not exists pagos_registrado_por_idx
  on public.pagos (registrado_por);

create index if not exists pagos_plataforma_plan_plataforma_id_idx
  on public.pagos_plataforma (plan_plataforma_id);

create index if not exists partner_commissions_gimnasio_id_idx
  on public.partner_commissions (gimnasio_id);

create index if not exists pedidos_asistencia_ejercicio_id_idx
  on public.pedidos_asistencia (ejercicio_id);

create index if not exists push_subscriptions_profile_id_idx
  on public.push_subscriptions (profile_id);

create index if not exists reacciones_logro_autor_id_idx
  on public.reacciones_logro (autor_id);

create index if not exists rutina_items_ejercicio_id_idx
  on public.rutina_items (ejercicio_id);

create index if not exists rutina_plantillas_creada_por_idx
  on public.rutina_plantillas (creada_por);

create index if not exists rutinas_gimnasio_id_idx
  on public.rutinas (gimnasio_id);
