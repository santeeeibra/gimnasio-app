# Planes de plataforma — cupo de socios por gimnasio

> Pendiente #3 de `PENDIENTES_VISTA_DEV.md`. Subsistema nuevo: la plataforma le
> asigna a cada gimnasio un plan con un tope de socios y un precio. Se aplica al
> dar de alta clientes. Dividido en fases chicas y shippables, estilo
> `PLAN_FASE_5_7.md`. Correr `npx tsc --noEmit` al cierre de cada fase.

## Modelo

- `planes_plataforma`: catálogo global (no por gimnasio). `max_socios` null =
  ilimitado. `precio_mensual` informativo por ahora (no hay cobro real).
- `gimnasios.plan_plataforma_id` + `gimnasios.plan_plataforma_vence_el`.
- **"Socio" = fila en `clientes`** del gimnasio (incluye los `en_prueba`). Un
  profile = un asiento.
- Sigue existiendo `gimnasios.estado ∈ {prueba, activo, solo_lectura}` para el
  ciclo de trial / bloqueo. El plan es ortogonal: define el cupo y el precio.

---

## FASE 1 — Migración + modelo + display en la consola  ✅ (este commit)

### 1.1 `supabase/migrations/0015_planes_plataforma.sql`
Tabla `planes_plataforma`, columnas nuevas en `gimnasios`, seed de 4 tiers
(Free 30 / Base 150 / Pro 400 / Ilimitado ∞), RLS solo `service_role`.
Idempotente. **Aplicar en el SQL Editor de Supabase.**

### 1.2 `src/lib/plataforma/planes.ts`
Tipo `PlanPlataforma` + helpers `cupoTexto()` y `cupoExcedido()`.

### 1.3 `src/app/admin/gimnasios/[id]/page.tsx`
Card "Plan de plataforma": nombre del plan, `N / max socios`, fecha de
vencimiento y aviso si el cupo está alcanzado. Sin acción de asignar todavía.

---

## FASE 2 — CRUD de planes + asignar plan al gym  ✅

### 2.1 `src/app/admin/planes/page.tsx` + `form.tsx` + acciones
Lista + alta/edición/baja de `planes_plataforma` (superadmin, service_role,
auditado). Link en `src/app/admin/layout.tsx`.

### 2.2 Asignar desde el detalle del gym
`<select>` de plan + fecha de vencimiento en
`src/app/admin/gimnasios/[id]/page.tsx`, acción
`asignarPlanPlataforma(gimnasioId, planId, venceEl)` en `admin/actions.ts`.
Auditar con nueva `AccionAdmin` `asignar_plan_plataforma` en
`src/lib/admin/audit.ts`.

---

## FASE 3 — Enforcement en el alta de clientes  ✅

### 3.1 `src/lib/plataforma/cupo.ts`
`async puedeAgregarSocio(admin, gimnasioId): Promise<{ ok: boolean; usados: number; max: number | null }>`
— lee el plan del gym, cuenta `clientes` y compara.

### 3.2 `src/app/panel/clientes/actions.ts` → `altaCliente`
Antes de `admin.auth.admin.createUser`, si `!puedeAgregarSocio(...)` devolver
`{ error: "Alcanzaste el límite de socios de tu plan (N). Contactá a soporte para ampliarlo." }`.
Sin plan asignado ⇒ se permite (no romper gimnasios viejos).

### 3.3 Mostrar el cupo en `/panel/clientes`
Línea "Socios: N / max" arriba de la lista; deshabilitar el form de alta si
está lleno.

---

## FASE 4 — Vista del dueño: "activá / ampliá tu plan"

- Banner en `/panel` cuando el cupo está al 90%+ o `estado = 'prueba'`.
- `/panel/plan`: plan actual, cupo, y botón "Solicitar activación / upgrade"
  que manda email al `ADMIN_EMAIL` (vía `src/lib/mail/enviar.ts`) con el gym y
  el plan pedido. No hay checkout real todavía.

---

## FASE 5 — Vencimiento del plan → solo_lectura automático

- Extender `chequear_trial_vencido()` (migración 0013) o sumar
  `chequear_plan_vencido()`: `estado = 'solo_lectura'` donde
  `plan_plataforma_vence_el < now()`.
- Llamarla desde el cron diario (`src/app/api/cron/cuotas/route.ts` o uno
  nuevo).
- Registrar pago del gym ⇒ empujar `plan_plataforma_vence_el` +30 días y
  `estado = 'activo'`.
