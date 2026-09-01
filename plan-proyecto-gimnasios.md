# Sistema de gestión de gimnasios — plan maestro

## Resumen
SaaS multi-tenant para vender a varios gimnasios. Cada gimnasio tiene sus datos
aislados. Presupuesto: solo dominio pago, resto gratis (free tiers).

## Stack
- Next.js (frontend + backend en un proyecto)
- Supabase (Postgres + auth + Row Level Security para aislar datos por gimnasio)
- Vercel (hosting, plan gratis)
- Notificaciones push: Web Push nativo (gratis, sin servicio de terceros)

## Decisiones tomadas

### Cuentas y acceso
- El dueño da de alta al cliente manualmente: plan, teléfono, DNI, estado de cuota.
- Recién ahí el cliente puede loguearse. No hay auto-registro.
- Usuario = DNI. Contraseña inicial autogenerada (ej: últimos 4 del DNI).
- Flag `debe_cambiar_clave`: obliga a cambiarla en el primer login.
- Cada gimnasio = cuenta independiente por cliente (sin arrastre entre gimnasios).

### Planes y cuotas
- Planes definidos por cada dueño (nombre, precio, duración).
- Pago se hace por fuera del sistema (transferencia).
- El dueño registra manualmente cuando confirma el pago.
- El sistema calcula días restantes automáticamente.
- Alerta visual en rojo cuando quedan 5-6 días o menos + notificación push,
  tanto para el cliente como para el dueño.

### Rutinas
- V1: motor de **reglas fijas** (gratis, sin IA). Variables: objetivo, peso,
  edad, días de entrenamiento, gustos/preferencias.
- Cliente puede editar su rutina: cambiar series/repeticiones, sustituir
  ejercicios que no conoce.
- Base de ejercicios con imagen/GIF (usar fuente abierta y gratuita, ej. wger).
- Posible fase 2 (futuro, no ahora): capa de IA solo para ajustes finos.

### Mensajería
- El dueño envía mensajes individuales o masivos (a todos o filtrado por plan).
- Cada mensaje tiene flag "respondible" (chat) o "solo aviso".
- Llega por dentro de la app (bandeja) + notificación push.

### Diseño
- Evitar UI genérica. Usar la skill `frontend-design-SKILL.md` (adjunta) en
  Claude Code / Cline para dirección estética, tipografía, etc.
- Prioridad UX: que ni el dueño ni el cliente pierdan tiempo buscando cosas.
  Navegación mínima, todo a máximo 2 clicks del panel principal.

## Modelo de datos (tablas base)
- `gimnasios`
- `planes` (gimnasio_id, nombre, precio, duración)
- `clientes` (gimnasio_id, dni, teléfono, plan_id, estado_cuota, fecha_vencimiento, debe_cambiar_clave)
- `ejercicios` (nombre, imagen_url, grupo_muscular, nivel)
- `rutinas` (cliente_id, ejercicios[], series, repeticiones, generada_por=reglas)
- `mensajes` (gimnasio_id, remitente, destinatario o masivo, respondible, leído)

## Pendientes a definir más adelante (no bloquean el arranque)
- Cómo se comunican las credenciales iniciales al cliente (a mano, sin costo).
- Reportes/métricas para el dueño.

---

## Estado del código (actualizado)

Repo: https://github.com/santeeeibra/gimnasio-app · Stack real: Next.js 16 (App
Router, `src/`), React 19, Tailwind v4, Supabase (`@supabase/ssr`).

### Entregable 1 — HECHO (commit `Entregable 1` + push a main)
- `supabase/migrations/0001_init.sql`: todas las tablas del plan + RLS multi-tenant.
  Helpers SQL: `current_gimnasio_id()`, `is_dueno()`, `current_cliente_id()`,
  `recalcular_estado_cuota()`.
- Auth por **gimnasio (slug o nombre) + DNI + clave**. Internamente email sintético
  `dni@<slug>.gym.local`. Clave inicial `gym`+últimos 4 del DNI. `debe_cambiar_clave`
  fuerza cambio en primer login. Ver `src/lib/auth.ts`, `src/app/login/`,
  `src/app/cambiar-clave/`.
- Middleware (`src/middleware.ts`) protege todo salvo `/login`.
- Panel dueño (`src/app/panel/`): layout con nav lateral; `page.tsx` resumen con
  stats y alertas rojas; `clientes/` lista + alta (usa `service_role` en Server
  Action tras `requireDueno()`); `clientes/[id]/` detalle + registrar pago
  (recalcula `fecha_vencimiento`, suma sobre saldo si aún tiene días); `planes/`
  alta + activar/desactivar.
- Vista cliente (`src/app/mi/`): estado de cuota con días restantes.
- `scripts/seed.mjs "Nombre" slug DNI "Dueño"` crea gimnasio + dueño.
- UI: Bricolage Grotesque + Inter, paleta papel/tinta/volt en `globals.css`,
  estado de cuota como borde izquierdo de color. Sin card-kit genérico.
- `.env.local` necesita: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`. `npm run build` pasa.

### Pendiente de infra (lo hace el humano)
- Crear proyecto Supabase, correr la migración, cargar `.env.local`, correr el seed.

### Entregable 2 — Mensajería — HECHO
- Panel dueño (`src/app/panel/mensajes/`): compositor con modo Todos / Por plan /
  Un cliente, textarea, flag "permitir respuestas". `actions.ts` resuelve
  destinatarios (query `clientes` por `gimnasio_id` + `plan_id`) e inserta
  `mensajes` + `mensaje_destinatarios` con el client normal (RLS, sin service_role).
  Lista de enviados con contador leído N/total. `[id]/` = hilo: destinatarios con
  estado de lectura + conversación (si `respondible`) + responder.
- Vista cliente (`src/app/mi/mensajes/`): bandeja ordenada por fecha, borde volt +
  "nuevo" para no leídos. `[id]/` marca leído en `useEffect` (`marcarLeido`) y
  muestra hilo + responder si `respondible`. `/mi` tiene tarjeta con badge
  "N sin leer" (`count` head en `mensaje_destinatarios`).
- Pendiente: disparo de push al enviar (queda para Entregable 3 — Push). Marcado
  con `// TODO (Entregable 2 — Push)` en `panel/mensajes/actions.ts`.
- Probado end-to-end en browser (dueño→cliente→respuesta→dueño). Bug RLS `42P17`
  (recursión entre policies) resuelto en `0002_fix_mensajes_rls.sql` (aplicado) y
  en `0001` para instalaciones nuevas: chequeos cruzados ahora via funciones
  SECURITY DEFINER (`soy_destinatario`, `mensaje_gimnasio`, `mensaje_remitente`,
  `mensaje_respondible`).
- Infra ya corriendo: proyecto Supabase `adrkdortznimrlungwoy`, `.env.local`
  cargado, seed hecho. Dueño: gimnasio `migym` / DNI `30111222`. Cliente de
  prueba: Lucía Fernández, DNI `40123456`, plan Mensual.
- `.claude/launch.json` con server `dev` (`npm run dev`, puerto 3000).
- Detalle conocido: para el cliente el remitente figura "Gimnasio" (la policy
  `prof_select` no deja al cliente leer el perfil del dueño). Sin resolver.

### EN CURSO (sesión Cline) — Rediseño UI + colores personalizables
Objetivo: que la UI no se lea genérica y que el dueño pueda personalizar la
paleta desde su panel (branding por gimnasio).
- **Dirección estética**: usar la skill `frontend-design` (ya instalada) antes de
  tocar cualquier pantalla. Base actual: Bricolage Grotesque + Inter, tokens
  papel/tinta/volt en `src/app/globals.css` (`--paper`, `--ink`, `--volt`,
  `--danger`, `--warn`, `--ok`, etc.), componentes en `src/components/ui.tsx`.
- **Colores personalizables**:
  - Migración nueva (`0003_*`): agregar a `gimnasios` columnas de tema, p.ej.
    `color_primario text`, `color_acento text`, `color_fondo text` (hex) — o un
    `tema jsonb` único. RLS: lectura para todo el gimnasio, escrito solo dueño
    (ya hay policy `gim_*`; revisar que haya UPDATE para dueño).
  - Panel dueño: pantalla `src/app/panel/ajustes/` (o `marca/`) con color pickers
    + preview en vivo. Server Action que actualiza `gimnasios`.
  - Aplicar tema: el `PanelLayout` y el layout de `/mi` ya cargan el gimnasio;
    inyectar los hex como CSS custom properties inline en un `<div style>` o en
    `:root` vía `<style>` server-rendered, mapeando a los tokens existentes
    (`--volt` → color de acento, etc.). Definir defaults si las columnas son null.
  - Pantallas a repasar con el rediseño: login, `/panel` (resumen), `/panel/clientes`,
    `/panel/mensajes`, `/mi`, `/mi/mensajes`.

### Próximos entregables (sin empezar)
3. **Push web nativo**: tabla `push_subscriptions` ya existe. Falta VAPID keys,
   service worker, endpoint de envío, disparo en cuota por vencer.
4. **Rutinas**: tablas `ejercicios` / `rutinas` / `rutina_items` ya existen. Falta
   motor de reglas fijas + editor del cliente + seed de ejercicios (wger).
5. **Cron** `recalcular_estado_cuota()` diario (pg_cron o Vercel cron).

---

## Cómo vamos a trabajar (para ahorrar tokens)

| Tipo de tarea | Herramienta |
|---|---|
| Feature completa, varios archivos, refactor grande | **Claude Code** — pegarle este archivo como contexto |
| Fix puntual, ajuste chico en una pantalla | **Cline** |
| Cambio trivial en un archivo (renombrar, texto, un valor) | Comando **PowerShell** o script corto de **Python** que te paso yo directamente |
| Dudas conceptuales, decisiones de diseño, dudas generales | **Gemini** |

Regla general: siempre que arranques una sesión nueva en Claude Code o Cline,
pegá este archivo primero como contexto — así no hay que reexplicar el
proyecto desde cero cada vez.
