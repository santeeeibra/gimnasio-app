# Prompt para Antigravity: Multi-usuario staff con roles

Copiá y pegá esto tal cual en Antigravity.

---

Necesito agregar soporte multi-usuario para el staff de cada gimnasio en SysGym
(Next.js + Supabase, `D:\SISTEMA GYM`). Hoy solo existe un login por gimnasio
con rol `dueno` (dueño único) o `cliente` (socio) — ver `src/lib/auth.ts`
(`Profile.rol: "dueno" | "cliente"`, `requireDueno()`, `requireProfile()`).

## Objetivo
El dueño de un gimnasio tiene que poder crear cuentas de "recepción" (staff)
con acceso limitado: pueden dar de alta socios, cobrar cuotas, hacer check-in,
pero NO pueden ver `/panel/ajustes` (config del gym), ni `/panel/plan`
(facturación de la plataforma), ni `/panel/partner`, ni cambiar datos fiscales
AFIP (`src/app/panel/ajustes/afip-form.tsx`), ni borrar/dar de baja socios.

## Alcance

1. **Migración SQL** (`supabase/migrations/0062_staff_roles.sql`):
   - Extender el enum/check de `profiles.rol` para permitir `"staff"` además
     de `"dueno"` y `"cliente"` (revisar cómo está definida la columna hoy,
     probablemente `text` con `check` o sin constraint — ajustar sin romper
     datos existentes).
   - Agregar columna `profiles.permisos jsonb default '{}'::jsonb` (o una
     tabla `staff_permisos` si preferís normalizado) para permisos granulares
     futuros — por ahora alcanza con un rol fijo "staff" con los permisos
     hardcodeados en el punto 3, no hace falta UI granular todavía.

2. **Alta de staff**: en `/panel/ajustes` (seguir el patrón de
   `src/app/panel/clientes/alta-form.tsx` y `actions.ts` para creación de
   usuarios con DNI → email sintético, ver `dniAEmail()` y `claveInicial()`
   en `src/lib/auth.ts`), agregar una sección nueva "Empleados" donde el
   dueño:
   - Da de alta un empleado (nombre + DNI, clave inicial autogenerada igual
     que los socios).
   - Ve la lista de empleados activos del gym con opción de desactivar
     (no borrar — usar un flag `activo boolean` en `profiles` si no existe,
     o reusar el patrón de suspensión que ya haya en el proyecto).
   - Cada empleado creado tiene `profiles.rol = 'staff'` y el mismo
     `gimnasio_id` que el dueño.

3. **Permisos en `src/lib/auth.ts`**:
   - Nuevo helper `requireStaffODueno()` (o similar) que permite pasar tanto
     a `dueno` como a `staff`, para las rutas que ambos pueden usar:
     `/panel/clientes`, `/panel/clientes/[id]` (cobro, alta), `/panel/asistencia`.
   - Las rutas sensibles (`/panel/ajustes`, `/panel/plan`, `/panel/partner`,
     `/panel/mensajes` si aplica) siguen usando `requireDueno()` sin cambios,
     así que un `staff` que entre ahí es redirigido igual que un `cliente`.
   - El dashboard `/panel` (page.tsx) debe renderizar una versión reducida
     para `rol === 'staff'` (ocultar métricas financieras/plan, dejar accesos
     directos a Clientes/Asistencia/Check-in).

4. **Login**: el login por DNI (`src/app/login/`) ya es agnóstico al rol
   (autentica por `gimnasio_id` + DNI), verificar que el redirect post-login
   mande a `staff` a `/panel` igual que a `dueno` (hoy el `redirect()` en
   `requireProfile()` puede depender de `rol === "dueno"`, revisar
   `debe_cambiar_clave` flow también para el alta de staff).

5. **Nav**: `src/app/panel/panel-nav.tsx` (o donde esté el nav del panel) —
   ocultar los ítems de menú que el staff no puede ver, según el mismo check
   de rol.

## Restricciones del proyecto (importante, leer antes de tocar código)
- Este repo usa **Next.js con breaking changes respecto al Next.js estándar**:
  antes de escribir código server actions / routing, leer
  `node_modules/next/dist/docs/` para confirmar convenciones actuales.
- UI/UX: seguir las skills en `.agents/skills/` — especialmente
  `sysgym-ux-patterns` y `apple-design-skill`. Toda interacción nueva
  (alta de empleado, toggle activar/desactivar) necesita feedback táctil vía
  `src/lib/ui/hapticos.ts` y debe verse consistente con el resto de
  `/panel/ajustes` (mismo patrón que `AjustesSeccionModal` +
  `DatosPagoForm`/`AfipForm` como referencia de forms).
- Mascota oficial (Pulpo Volt verde `#10e7a0`) si corresponde en algún estado
  vacío ("Todavía no diste de alta empleados").
- No hardcodear credenciales ni secrets — si hace falta un secret nuevo,
  documentarlo en `credenciales-locales.md` (gitignored), no en un .md
  versionado.
- Al terminar, agregar 1 línea a `MEMORIA.md` (no leer el archivo entero,
  solo appendear).

## No hacer en este pase
- No tocar el toggle AFIP (`src/app/panel/ajustes/afip-form.tsx`) ni el
  comprobante PDF (`src/components/pdf/descargar-comprobante-pdf.tsx`) —
  son de otra tarea ya commiteada.
- No implementar permisos granulares por checkbox todavía, solo el rol fijo
  "staff" con el set de accesos de arriba.
- No tocar `/admin` (superadmin) ni `/panel/partner`.

Empezá inspeccionando `src/lib/auth.ts`, `src/app/panel/clientes/actions.ts`
(patrón de alta de usuario) y el schema real de `profiles` en Supabase antes
de escribir la migración.
