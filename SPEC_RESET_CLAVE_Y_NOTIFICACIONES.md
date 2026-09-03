# SPEC — Reset de contraseña por email real + Notificaciones al superadmin

Para pasarle directo a Claude Code. Contexto general del proyecto en `contex-sysgym.md`.

## Motivación

Hoy el login es gimnasio + DNI + clave, con email interno sintético
(`dni@<slug>.gym.local`) que no existe de verdad — no se puede mandar un link de
recuperación ahí. Se necesita:

1. Un "Olvidé mi contraseña" real para dueño y cliente (ambos con email real
   cargado como dato de contacto, no como login).
2. Que el superadmin (santeee) reciba avisos (push + email) de errores del
   sistema, actividad en `/admin` y mensajes de soporte de dueños.

## Parte 1 — Reset de contraseña con email real

### Modelo de datos

* Migración nueva `0021_email_recuperacion.sql`:
  * `clientes.email` (text, nullable).
  * `profiles.email_recuperacion` (text, nullable) — usado para el dueño (su
    login sigue siendo DNI+clave del gimnasio; este campo es solo para
    recuperación, no reemplaza el email sintético de Auth).

### Alta / edición

* `panel/clientes/alta-form.tsx` + `altaCliente`: campo "Email (opcional)" para
  el cliente.
* `panel/clientes/[id]/editar-datos.tsx` + `editarCliente`: permitir cargar /
  editar el email del cliente después del alta.
* `scripts/seed.mjs` (5º argumento opcional) + una pantalla en `/panel/ajustes`
  para que el dueño cargue o cambie su `email_recuperacion` él mismo.

### Envío de mail — Resend

* Cuenta gratis en Resend (100 mails/día). Env vars: `RESEND_API_KEY`,
  `RESEND_FROM` (ej. `no-reply@<dominio>`).
* `src/lib/email/enviar.ts`: `enviarEmail(to, subject, html)` — wrapper fetch a
  la API de Resend, sin SDK.

### Flujo "Olvidé mi contraseña"

* Link en `/login` (para dueño y cliente, mismo formulario).
* Página nueva `/login/olvide-clave`:
  * Pide: gimnasio (slug), DNI, email.
  * Server action busca el registro (`clientes` o el `profiles` del dueño de ese
    gimnasio) y valida que el email coincida con el cargado. Si no hay email
    cargado o no coincide → mensaje genérico ("si los datos coinciden, te llega
    un mail"), sin revelar si el DNI existe (evitar enumeración).
  * Si coincide: `supabase.auth.admin.generateLink({ type: "recovery", email:
    <email sintético> })` → manda el `action_link` por `enviarEmail` al email
    real cargado.
  * Rate limit simple (1 intento cada 2 min por DNI+gimnasio, en memoria).
* El `action_link` cae en `/reset-clave` con un form de nueva clave.

### Fuera de alcance v1

* Verificación del email.
* SMS / WhatsApp para el reset.

## Parte 2 — Notificaciones al superadmin

### Canal

* Push (`enviarPush`) — reusar tal cual.
* Email de respaldo con `enviarEmail`, a `SUPERADMIN_EMAIL` en env.
* Helper único `src/lib/admin/notificar.ts` → `notificarSuperadmin(titulo,
  detalle, {push, email})`.

### Eventos a enganchar

1. Errores del sistema: `registrarError` (ya envuelve cron/altas/pagos/checkin)
   también llama `notificarSuperadmin`.
2. Actividad en `/admin`: `registrarAccionAdmin` también llama
   `notificarSuperadmin` para acciones relevantes (cambio de estado de gimnasio,
   asignar / renovar plan de plataforma, confirmar pago).
3. Soporte de dueños: botón "Contactar soporte" en `/panel/ajustes` → form
   (asunto + mensaje) → server action que llama `notificarSuperadmin` con el
   texto y el gimnasio de origen.

### Fuera de alcance v1

* WhatsApp real.
* Panel de configuración de qué eventos avisan (v1 = todos prenden).

## Env vars nuevas

* `RESEND_API_KEY`
* `RESEND_FROM`
* `SUPERADMIN_EMAIL`

## Migraciones

* `0021_email_recuperacion.sql`: `clientes.email`, `profiles.email_recuperacion`.
