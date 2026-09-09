-- Gestión de gimnasios desde la consola de soporte (/admin).
-- Suma:
--   1. Estado 'suspendido' para gimnasios.estado (además de prueba|activo|solo_lectura)
--   2. gimnasios.nota_interna       — nota privada del superadmin (nunca la ve el dueño)
--   3. gimnasios.pin_ingresos_desactivado — el dueño apagó el PIN de /panel/ingresos a propósito
-- Idempotente: se puede correr más de una vez. NO la aplica el agente.

-- ─────────────────────────────────────────────────────────────
-- 1) gimnasios.estado: sumar 'suspendido'
--
--    'solo_lectura' = trial vencido: bloquea la ESCRITURA del dueño y los
--                     socios, pero deja LEER (ver la app, la cuota, etc.).
--    'suspendido'   = corta el LOGIN completo del dueño Y de los socios antes
--                     de generar sesión. Ven la pantalla "contactá a soporte"
--                     (/suspendido). Lo setea el superadmin a mano desde
--                     /admin/gimnasios/[id]; el dueño NO puede revertirlo.
-- ─────────────────────────────────────────────────────────────
alter table public.gimnasios
  drop constraint if exists gimnasios_estado_check;

alter table public.gimnasios
  add constraint gimnasios_estado_check
  check (estado in ('prueba', 'activo', 'solo_lectura', 'suspendido'));

comment on column public.gimnasios.estado is
  'prueba (trial inicial) | activo (plan pago) | solo_lectura (trial vencido sin pago: bloquea escritura, deja leer) | suspendido (corta el login de dueño y socios antes de generar sesión: pantalla "contactá a soporte")';

-- ─────────────────────────────────────────────────────────────
-- 2) gimnasios.nota_interna — solo la ve el superadmin en /admin.
--    Nunca se expone al dueño: no hay policy que la deje leer desde el
--    panel; se lee siempre vía service_role (createAdminClient) en la
--    consola de soporte.
-- ─────────────────────────────────────────────────────────────
alter table public.gimnasios
  add column if not exists nota_interna text;

comment on column public.gimnasios.nota_interna is
  'Nota privada del superadmin sobre el gimnasio (motivo de suspensión, contacto del dueño, recordatorios). NUNCA visible para el dueño.';

-- ─────────────────────────────────────────────────────────────
-- 3) gimnasios.pin_ingresos_desactivado — distingue "nunca configuró PIN"
--    (false + pin_ingresos null  => /panel/ingresos obliga a configurar uno)
--    de "lo desactivó a propósito"
--    (true  + pin_ingresos null  => entra directo a /panel/ingresos).
-- ─────────────────────────────────────────────────────────────
alter table public.gimnasios
  add column if not exists pin_ingresos_desactivado boolean not null default false;

comment on column public.gimnasios.pin_ingresos_desactivado is
  'true = el dueño apagó el PIN de /panel/ingresos a propósito. Con pin_ingresos null y esto en false, la sección obliga a configurar un PIN antes de entrar.';

-- ─────────────────────────────────────────────────────────────
-- 4) Gate de escritura RLS: 'suspendido' también bloquea escrituras
--    (defensa en profundidad; el login ya lo corta antes en la app).
--    Reemplaza la versión de 0013 que solo excluía 'solo_lectura'.
-- ─────────────────────────────────────────────────────────────
create or replace function gimnasio_permite_escritura()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select estado not in ('solo_lectura', 'suspendido')
       from public.gimnasios where id = current_gimnasio_id()),
    true
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- Para suspender / reactivar a mano (lo normal es hacerlo desde /admin):
--   UPDATE gimnasios SET estado = 'suspendido' WHERE id = '<uuid>';
--   UPDATE gimnasios SET estado = 'activo'     WHERE id = '<uuid>';
-- ─────────────────────────────────────────────────────────────
