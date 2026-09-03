# contex-sysgym — Contexto del proyecto (pegar al arrancar cada sesión)

> Documento vivo. Consolida el contexto de la app y las decisiones/ideas tomadas.
> Fuente detallada: `plan-proyecto-gimnasios.md`. Aquí va lo esencial + estado.

## Qué es

SaaS multi-tenant para vender a varios gimnasios. Cada gimnasio tiene sus datos
aislados por Row Level Security. Presupuesto: solo el dominio es pago, el resto
sobre free tiers.

**Enfoque principal: dispositivos móviles.** La app la usan dueños y clientes
casi siempre desde el celular. El diseño y la UI se trabajan **mobile-first**:
layouts de una columna, targets táctiles grandes, navegación inferior o de
pocos niveles, nada que dependa de hover. Desktop es secundario (el dueño puede
usarlo para altas masivas).

- **UI**: usar la skill **`emil-design-eng`** (Emil Kowalski) para el pulido de
  componentes, animaciones y detalles de interacción. Para dirección estética
  general sigue disponible `frontend-design`. Regla: pasar por la skill antes de
  tocar cualquier pantalla. Evitar UI genérica / card-kit de template.
- **UX**: todo a máximo 2 taps del panel principal. Que ni dueño ni cliente
  pierdan tiempo buscando.

## Stack real

- Next.js 16 (App Router, `src/`), React 19, Tailwind v4
- Supabase (Postgres + Auth + RLS), `@supabase/ssr`
- Vercel (hosting, plan gratis)
- Push: Web Push nativo (VAPID), sin terceros
- Repo: https://github.com/santeeeibra/gimnasio-app
- Proyecto Supabase: `adrkdortznimrlungwoy`
- `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`
- Server dev: `.claude/launch.json` → `dev` (`npm run dev`, puerto 3000)

## Decisiones de producto

### Cuentas y acceso
- El dueño da de alta al cliente a mano (plan, teléfono, DNI, estado de cuota).
  No hay auto-registro.
- Login = gimnasio (slug o nombre) + DNI + clave. Email sintético interno
  `dni@<slug>.gym.local`. Clave inicial `gym` + últimos 4 del DNI.
- Flag `debe_cambiar_clave` fuerza cambio en el primer login.
- Cada gimnasio = cuenta independiente (sin arrastre entre gimnasios).

### Recuperación de contraseña — flujo asistido (2026-09-03)

Como el email de login es sintético (`dni@<slug>.gym.local`, no existe), no se
puede mandar un link de recuperación ahí. Solución: email real **opcional** como
dato de contacto + un flujo asistido que funciona sin infraestructura de mail.

- **Migración `0021_email_recuperacion.sql`** (aplicada): `clientes.email` (text
  nullable) y `profiles.email_recuperacion` (text nullable). No son login: solo
  contacto para recuperación. El dueño carga el email del socio en el alta
  (`alta-form.tsx`) o al editar la ficha (`editar-datos.tsx`); el suyo propio en
  `/panel/ajustes` → card "Email para recuperar tu contraseña"
  (`email-recuperacion-form.tsx` + `actualizarEmailRecuperacion`). `seed.mjs`
  acepta un 5º argumento opcional para el `email_recuperacion` del dueño.
- **Link en `/login`** → página `/login/olvide-clave` (form: gimnasio + DNI +
  email opcional). Server action `solicitarReset` en
  `src/app/login/olvide-clave/actions.ts`, rate limit en memoria (1 pedido cada
  2 min por gimnasio+DNI), mensajes de éxito genéricos (no revelan si el DNI
  existe).
- **Camino A — link por email**: sólo si `dominioEmailActivo()` (env
  `RESEND_FROM` seteado y **no** termina en `@resend.dev`) **y** el email
  ingresado coincide con el cargado. Usa
  `supabase.auth.admin.generateLink({ type: "recovery", ... , redirectTo:
  <origin>/reset-clave })` y manda el `action_link` con `enviarEmail`. La
  pantalla `/reset-clave` (client) levanta la sesión del link y pide clave nueva
  (`supabase.auth.updateUser`), apaga `debe_cambiar_clave`. `/reset-clave` está
  en `PUBLIC_PATHS` del middleware. Pendiente manual para activarlo: dominio
  verificado en Resend + `RESEND_FROM=no-reply@<dominio>` + agregar
  `<origin>/reset-clave` a Redirect URLs de Supabase Auth.
- **Camino B — asistido (default hoy, sin dominio)**:
  - **Socio** → `enviarPush` a los dueños del gimnasio: "Fulano (DNI …) pidió
    recuperar su contraseña. Entrá a su ficha → Acceso → Regenerar contraseña"
    (ese botón, `regenerarClave`, ya existía). Mensaje al socio: `OK_SOCIO`
    ("le avisamos a tu gimnasio…").
  - **Dueño** → `notificarSuperadmin` (push + mail): restablecer con
    `scripts/reset-clave.mjs` o desde `/admin`. Mensaje: `OK_DUENO`
    ("avisamos a soporte…").
  - Si el camino A intenta enviar pero `enviarEmail` devuelve `{ ok: false }`
    (Resend rechazó por dominio no verificado), **no** se muestra el falso
    "te llega un mail": cae igual al camino B.
- Sin migración extra para el flujo. Commits `a24de7d` + `b8e9531`.

### Planes y cuotas
- Planes los define cada dueño (nombre, precio, duración).
- El pago se hace por fuera del sistema (transferencia); el dueño lo registra a
  mano. El sistema calcula días restantes.
- Alerta en rojo cuando quedan ≤5-6 días + push, para cliente y dueño.
- **El alta NO registra el pago** (2026-09-03). `altaCliente` da de alta con el
  plan asignado (si se eligió), `estado_cuota = "vencido"`, sin fechas y sin fila
  en `pagos`; `acceso_habilitado = true` siempre (el socio entra a la app, ve la
  cuota vencida). El dueño registra el primer pago desde la ficha del socio
  (`/panel/clientes/[id]` → "Registrar un pago"). Se sacó el checkbox
  "Pago recibido" del alta (confuso). `registrarPago` sigue igual.

### Gestor de morosidad (aviso automático de vencimiento) — SPEC `SPEC_GESTOR_MOROSIDAD.md`
- Push automático al socio **N días antes** del vencimiento, con **N configurable
  por gimnasio** (`gimnasios.dias_aviso_morosidad`, int default 5, rango 1-15).
- Dedupe por ciclo: `clientes.ultimo_aviso_morosidad_enviado_en` (date nullable).
  El cron no reenvía si ya avisó hoy; `registrarPago` lo resetea a `null` al
  renovar la cuota, habilitando el aviso del próximo ciclo.
- **Config**: `/panel/ajustes` → card "Aviso de vencimiento" (separada de la de
  tema), input numérico 1-15. Server action propia
  `actualizarDiasAvisoMorosidad` (`panel/ajustes/actions.ts`), componente
  `panel/ajustes/aviso-morosidad-form.tsx`.
- **Cron**: `src/app/api/cron/cuotas/route.ts` suma una 3ª vía a los avisos
  fijos de 6/1 días (que quedan igual, para cliente + dueño). Por cada cliente
  con `diasRestantes === dias_aviso_morosidad` de su gimnasio y sin aviso hoy →
  `enviarPush` con texto fijo "Tu cuota vence en {X} días. Recordá renovarla
  para seguir entrenando." + set de la fecha. Respuesta JSON incluye
  `avisosMorosidad`.
- Fuera de scope v1: WhatsApp, múltiples avisos por ciclo, texto personalizable.
- Migración `0012_gestor_morosidad.sql` — ✅ aplicada (2026-09-03).

### Rutinas (motor + generación + editor hechos; seed de imágenes OK)
- V1: motor de **reglas fijas** (sin IA). Variables: objetivo, nivel, días de
  entrenamiento, preferencia de equipo, **sexo** y **zonas a enfocar** (énfasis).
- **`src/lib/rutina/tipos.ts`**: tipos y constantes principales
  - `SEXOS` / `SEXO_LABEL`: `mujer`, `hombre`, `sin_especificar`
  - `ENFASIS` / `ENFASIS_LABEL`: 7 zonas (Glúteos, Piernas, Pecho, Espalda,
    Hombros, Brazos, Abdomen). Cada una mapea a grupos musculares reales en
    `ENFASIS_GRUPOS` (columna `grupo_muscular` de tabla `ejercicios`).
  - `MAX_ENFASIS = 2`: el cliente puede elegir hasta 2 zonas a priorizar.
  - `SERIES_OPCIONES` / `REPS_OPCIONES`: valores fijos para menús desplegables
    del editor (series: 1-5; reps: 5, 6, 6-8, 8-10, 8-12, 10-12, 12-15, 15,
    15-20, 20).
  - `EntradaMotor` ahora incluye `sexo: Sexo` y `enfasis: Enfasis[]`.
- **`src/lib/rutina/motor.ts`**: lógica de generación
  - `ajustarPorSexo()`: si `sexo === "mujer"` baja 1 serie en compuestos
    (mín. 3) y aislamientos (mín. 2), sin tocar rangos de reps. Genera planes
    más livianos y manejables.
  - `aplicarEnfasis()`: agrega hasta 3 ranuras extra por día para las zonas
    elegidas (máx. 8 ejercicios/día total). Usa `PATRON_ENFASIS` (patrones
    reales: hip thrust, sentadilla búlgara, press inclinado, dominadas, press
    militar, curl con barra, crunch). Si el cliente es mujer y no eligió
    ninguna zona → énfasis en glúteos por defecto.
- **`src/lib/rutina/generar.ts`**: persiste `sexo` y `enfasis` en
  `rutinas.preferencias` (jsonb), sin migración SQL (columna ya existía).
- **Formulario de generación** (`generar-form.tsx`):
  - Select "Sexo" **condicional**: solo se renderiza si el cliente tiene
    `clientes.sexo` cargado (prop `clienteSexo`, viene de `/mi/rutina/page.tsx`
    y del panel del dueño). Si es null → no se muestra y va
    `sexo: "sin_especificar"` al motor. Se carga en el alta del dueño
    (`alta-form.tsx` + `altaCliente` en `panel/clientes/actions.ts`).
  - Fieldset "Zona a enfocar" con chips controlados (máx. 2 seleccionados a la
    vez). Estado local con `toggleEnfasis()`.
  - Defaults: se releen de `rutinas.preferencias` en `mi/rutina/page.tsx`,
    `panel/clientes/[id]/page.tsx` y `rutina-panel.tsx`.
- **Actions** (`mi/rutina/actions.ts`, `panel/clientes/actions.ts`):
  - `parseSexo()` y `parseEnfasis()` validan y parsean los campos del form.
  - `generarMiRutina` y la generación para clientes pasan `sexo` y `enfasis` a
    `generarYGuardar()`.
- **Editor de rutina** (`rutina-editor.tsx`):
  - Series y reps ahora son `<select>` en lugar de `<input type="number">`.
  - Valores de `SERIES_OPCIONES` / `REPS_OPCIONES`.
  - Si el valor guardado no está en la lista, se agrega como primera opción
    para no perderlo (compatibilidad hacia atrás).
  - Sin escritura libre → menos errores, más rápido en móvil.
- Cliente genera y edita su rutina en `/mi/rutina`. Puede cambiar series/reps
  (menús) y sustituir ejercicios ("No lo conozco" → alternativas del mismo
  grupo con `ejerciciosSimilares()`).
- El dueño ve la rutina del cliente en `/panel/clientes/[id]/rutina-panel.tsx`.
- Base de ejercicios con imágenes de free-exercise-db (seed corrido, columna
  `imagen_url` poblada). Fase 2 futura: capa de IA solo para ajustes finos.

### Mensajería
- El dueño manda mensajes individuales o masivos (todos / filtrado por plan).
- Cada mensaje tiene flag "respondible" (chat) o "solo aviso".
- Llega a la bandeja dentro de la app + push.

### Branding por gimnasio
- **Logo del gimnasio** (2026-09-02). El dueño sube el logo desde
  `/panel/ajustes`. Se comprime **en el navegador** (canvas → resize ≤512² →
  WebP q0.8, baja calidad en escalones hasta <300 KB o rechaza) — sin librerías
  ni Edge Functions. Se sube al bucket `logos` (`<gimnasio_id>.webp`, un archivo,
  se sobreescribe, no se versiona; lectura pública, escritura del dueño vía
  `is_dueno()` + `current_gimnasio_id()`). La URL pública queda en
  `gimnasios.logo_url` (nullable; null → nombre en texto / ícono genérico, no
  rompe nada). Migración `0006_logo_gimnasio.sql` (columna + bucket + RLS).
  - **Paletas desde el logo**: `src/lib/logo/paleta.ts` extrae el color
    dominante del canvas (histograma + descarte de grises/casi blanco-negro/
    transparencia, sin `colorthief`) y genera 2-3 variantes (claro / suave /
    oscuro) con pares fondo/texto ya validados + `derivarPaleta()` + filtro
    `chequearBloqueos()`. Se muestran como chips ("Sugeridas por tu logo") con
    el mismo componente y flujo de guardado que `PRESETS_TEMA`. No se tocó
    `derivarPaleta()` / `chequearBloqueos()`, sólo se consumen.
  - **Dónde se muestra**: sidebar + topbar de `/panel` (`panel-nav.tsx`),
    franja de header en `/mi` (`mi/layout.tsx`), avatar "Gimnasio" en la
    bandeja y el hilo de `/mi/mensajes`. Pendiente / fuera de scope: íconos PWA
    desde el logo; `/login` (no sabe el gimnasio hasta enviar el form).
  - **Archivos**: `src/lib/logo/comprimir.ts` (compresión + `ImageData`),
    `src/lib/logo/paleta.ts` (`colorDominante`, `paletasDesdeColor`),
    `src/app/panel/ajustes/logo-uploader.tsx`, acción `guardarLogo` en
    `panel/ajustes/actions.ts`.
- El dueño personaliza el tema desde `/panel/ajustes`. Ejes:
  - **Colores (7)**: fondo, fondo tarjetas, texto, texto suave, bordes, acento,
    texto sobre acento. Sin tinte automático.
    - **Base vs derivados**: el dueño elige 3 (fondo, texto, acento); botón
      **"Calcular desde la base"** deriva los otros 4 (fondo tarjetas, texto
      suave, bordes, texto sobre acento) con `derivarPaleta()` en
      `src/lib/contraste.ts` — mezcla HSL manteniendo tono/saturación y fuerza
      contraste ≥ 4.5 en los pares de texto. Editables a mano después.
  - **Tipografía**: 9 presets (Moderno/Técnico/Neutro/Editorial/Humanista/
    Redondeado/Condensado/Contemporáneo/Amigable) + tamaño base
    (0.875 / 1 / 1.125 / 1.25).
  - **Bordes y espaciado**: redondeo (tight/normal/soft), escala de espaciado
    (compact/normal/spacious).
  - **Navegación**: móvil (bottom/top/sidebar), desktop (sidebar/top).
  - **Densidad de información**.
- **Validación de contraste WCAG 2.1**: 6 pares críticos (umbrales 3.0 y 4.5).
  Sugerencias automáticas ajustando luminosidad HSL. Checkbox obligatorio para
  guardar con fallos (`src/lib/contraste.ts`).
- **10 fuentes Google Fonts**: Bricolage Grotesque, Inter, Space Grotesk, Geist,
  Fraunces, DM Sans, Manrope, Archivo, Sora, Plus Jakarta Sans (~2-2.5MB).
- Se guarda en `gimnasios.tema` (jsonb). `null` → defaults.
- `src/lib/tema.ts` centraliza tipo, defaults, validación y `temaToVars()`.
  Inyectado en `panel/layout.tsx` y `mi/layout.tsx`. Preview en vivo en Ajustes.
- Componentes del editor: `ajustes-form.tsx` (form + estado), `radios.tsx`
  (grupos de opciones), `tema-preview-completo.tsx` (preview), `Seccion`
  (agrupador colapsable dentro de `ajustes-form.tsx`), tabs Editor/Preview en
  móvil.

### Check-in por DNI (modo kiosko) + día de prueba (SPEC `SPEC_CHECKIN_PRUEBA.md`)

- **Día de prueba**: en el alta (`panel/clientes/alta-form.tsx`) hay 2 submits —
  "Dar de alta" (flujo completo) y "1 día de prueba" (`name="modo" value="prueba"`).
  El de prueba crea el cliente con `en_prueba = true`,
  `prueba_iniciada_en = hoy`, sin plan ni pago. `altaCliente` en
  `panel/clientes/actions.ts` ramifica por `modo`.
- **Modo kiosko** (`/checkin`, **fuera de `/panel`** para no heredar el chrome
  del panel): `src/app/checkin/` con su propio `layout.tsx` (`requireDueno()` +
  tema del gym, header mínimo). Un solo input DNI grande + "Marcar ingreso".
  Corre dentro de la sesión autenticada del dueño (cliente RLS, no ruta
  pública). Para volver al panel: `SalirModoCheckin` abre modal que revalida la
  clave del dueño con `signInWithPassword` (no un botón "volver" pelado).
- **Lógica** (`src/app/checkin/actions.ts` → `marcarIngreso`): busca el cliente
  por DNI en el gimnasio, cuenta `registros_entrada` previos, **inserta siempre**
  (queda constancia). Si `en_prueba` y NO es el primer ingreso → estado
  `prueba_vencida` en la pantalla + `enviarPush([dueno.id], …)`. DNI inexistente
  → "DNI no encontrado, avisá al encargado" (sin más detalle).
- **Conversión**: `registrarPago` (mismo `actions.ts`) ahora setea
  `en_prueba = false` al registrar el plan/pago.
- **Badge**: `cliente-row.tsx` muestra pill "En prueba" (neutra) / "Prueba
  vencida" (roja, mismo criterio visual que cuota vencida). La lista
  (`panel/clientes/page.tsx`) trae `registros_entrada` del gym y marca vencida
  si `en_prueba` y hay ≥1 registro. `panel/clientes/[id]/page.tsx` muestra el
  estado "Día de prueba" + nota para convertir.
- **Entrada al modo**: link "Modo check-in" en el sidebar desktop
  (`panel-nav.tsx`) + tarjeta en `/panel` (resumen, `md:hidden`).
- **Migración `0009_checkin_prueba.sql`** (✅ aplicada 2026-09-03): `clientes` +
  `en_prueba boolean not null default false` + `prueba_iniciada_en date`; tabla
  nueva `registros_entrada` (`id`, `gimnasio_id` FK, `cliente_id` FK,
  `creado_en timestamptz`) con RLS `is_dueno()` + `current_gimnasio_id()`. Fila
  liviana a propósito (alimenta "racha de constancia" a futuro; NO confundir con
  `registro_progreso` = series/pesos).

### Check-in — pantalla de reposo / screensaver (2026-09-03)

Tras X segundos sin toques, `/checkin` se cubre con un fondo ambiental oscuro
(identidad "Futurista": acento `--volt`, hora en `--font-hero` / Orbitron,
anillo decorativo, haze + scanline que sólo animan `transform`/`opacity`).
Cualquier `pointerdown` / `keydown` / `touchstart` / `wheel` /
`visibilitychange` la cierra y vuelve a enfocar el input de DNI.

- **Config del dueño** en `/panel/ajustes` → card "Pantalla de reposo del
  check-in": activar/desactivar, segundos de inactividad (15–600), mensaje
  (≤60), mostrar reloj, mostrar logo, intensidad (`sutil` / `normal` /
  `estatico`). `estatico` y `prefers-reduced-motion` → sin capas en movimiento.
- **Sin migración**: se anida en `gimnasios.tema.reposoCheckin` (jsonb).
  `parseTema()` le pone defaults si falta; `actualizarTema` la preserva al
  guardar colores/tipografía; `actualizarReposoCheckin`
  (`panel/ajustes/actions.ts`) hace merge sobre el resto del tema.
- **Archivos**: `src/lib/tema.ts` (`ReposoCheckin`, `DEFAULT_REPOSO_CHECKIN`,
  parseo), `src/components/checkin/pantalla-reposo.tsx` (detector de
  inactividad + overlay), `.reposo-*` en `src/app/globals.css`,
  `src/app/panel/ajustes/reposo-checkin-form.tsx`, wiring en
  `src/app/checkin/layout.tsx`.
- La card en `/panel/ajustes` sólo aparece cuando el `select` de la página
  trae `gym` (hoy bloqueado por migraciones `0012`/`0019`, igual que "Aviso de
  vencimiento" y "Datos para transferir"). El screensaver en sí funciona con
  defaults aunque el dueño no lo haya configurado.

### Ingresos — sección de pagos protegida por PIN (Cline, 2026-09-02)

- `/panel/ingresos` (link en `NAV` de `panel-nav.tsx`): lista los pagos del
  gimnasio agrupados por mes con totales. Los datos los sirve
  `src/app/api/panel/ingresos/route.ts` (GET) y los consume
  `listado-ingresos.tsx` client-side.
- **PIN de 4-6 dígitos** en `gimnasios.pin_ingresos` (text nullable, migración
  `0008_pin_ingresos.sql` — ✅ aplicada 2026-09-03).
  `src/lib/pin.ts`: hash SHA-256 + salt (`PIN_SALT` env, default fijo).
- `configurar-pin/` (page + actions + `configurar-pin-form.tsx`): crear/cambiar
  PIN. `verificar-pin-modal.tsx`: modal que pide el PIN y guarda
  `sessionStorage.pin_ingresos_verificado`. `recuperar-pin-form.tsx` +
  `resetearPinConContrasena`: resetear el PIN validando la contraseña de la
  cuenta del dueño (`supabase.auth.updateUser({ password })` como verificación).
- Los server actions de `configurar-pin/actions.ts` ahora devuelven el mensaje
  real de Postgres si la lectura del gimnasio falla (antes decía siempre "No se
  encontró el gimnasio" y tapaba el "column pin_ingresos does not exist").

### Consola de soporte (`/admin`) — superadmin de la plataforma

- Segmento `src/app/admin/**`, fuera de `/panel` y `/mi`, sin ningún link desde
  el flujo normal de un gimnasio. **Gate único** en `admin/layout.tsx`:
  `requireSuperadmin()` → `notFound()` (no `redirect`, para no revelar la ruta)
  salvo que la sesión sea la cuenta cuyo `profile.id === SUPERADMIN_ID`.
- **Cuenta superadmin**: gimnasio dedicado y vacío slug `sante`, login usuario
  (DNI) `admin`, clave `43553838`. La crea `scripts/seed-superadmin.mjs`
  (idempotente), que imprime el `SUPERADMIN_ID` a copiar en `.env.local` y
  Vercel. `SUPERADMIN_ID` vive en env, no hay columna en DB.
- **Monitor** (`/admin`): uso de Supabase, ya existía.
- **Gimnasios** (`/admin/gimnasios` + `[id]`): lista de todos los gimnasios
  reales y detalle **solo lectura** (socios, estado de cuota, últimos pagos) vía
  `createAdminClient()` (service_role, saltea RLS). Sin cambio de sesión / sin
  impersonación real (queda como follow-up con cookie `act_as` firmada si hace
  falta reproducir bugs logueado como el dueño).
- **Push de prueba** (`/admin/push-prueba`): `enviarPush([SUPERADMIN_ID], …)`,
  solo a los dispositivos del superadmin. Nunca a clientes/dueños.
- **Estado del gimnasio** (en `/admin/gimnasios/[id]`): selector
  prueba/activo/solo_lectura → `cambiarEstadoGimnasio` (service_role, auditado
  `cambiar_estado_gym`) para probar el modo solo-lectura sin abrir el SQL Editor.
- **Auditoría**: tabla `admin_audit_log` (migración `0014_admin_audit_log.sql`,
  RLS on y sin policies → solo service_role). Helper
  `src/lib/admin/audit.ts` → `registrarAccionAdmin(actorId, action, gimnasioId?,
  meta?)`. Se registra `listar_gyms`, `ver_gym`, `push_prueba`.
- **Pendiente manual**: aplicar `0014_admin_audit_log.sql`; correr
  `node scripts/seed-superadmin.mjs` y poner el `SUPERADMIN_ID` que imprime en
  `.env.local` y en Vercel (redeploy).

### Fallback offline ante caída de Supabase (SPEC `SPEC_OFFLINE_FALLBACK.md`, 2026-09-03)

Supabase ya tuvo caídas confirmadas. El dueño necesita seguir operando lo
crítico desde el celu aunque el server no responda. **Capa 100% cliente**: no
toca RLS, `motor.ts`, `generar.ts` ni el esquema — **sin migración**. El log de
conflictos vive en `localStorage`.

- **Decisión de arquitectura**: los 3 flujos son Server Actions con
  `service_role`, no se pueden mover al navegador. La cola offline **no habla con
  Supabase directo**: guarda el `payload` en `localStorage` y **reinvoca la misma
  Server Action** al reconectar. El conflicto de DNI se detecta con el error que
  `altaCliente` ya devuelve. Prioridad: no perder ítems — sólo salen de la cola
  ante `ok` confirmado.
- **`src/lib/offline/conexion.tsx`**: `ConexionProvider` + `useConexionSupabase()`.
  Ping a `${SUPABASE_URL}/auth/v1/health` cada 20 s (timeout 7 s); 2 fallos
  seguidos → `desconectado`; escucha `online`/`offline`/`visibilitychange`.
- **`src/lib/offline/cola.ts`**: cola genérica en `localStorage` key
  `gym.cola.v1` (`ItemCola = {id, tipo, payload, timestamp, intentos, estado}`).
  `encolar` / `leerCola` / `quitar` / `marcarConflicto` / `descartar` /
  `suscribir` / `procesarCola`. Backoff exponencial `30 s · 2^intentos` (techo
  5 min). `procesarCola` corta el barrido al primer `reintentar` (no bombardea).
- **`src/lib/offline/handlers.ts`**: `HANDLERS` por `tipo` (`checkin`,
  `alta_cliente`). Envuelven la Server Action en timeout de 8 s. `alta_cliente`
  con error "Ya existe un cliente con ese DNI" → `conflicto` (no se pisa nada).
- **`src/lib/offline/cache.ts`**: `guardarCache` / `leerCache` / `haceCuanto`
  para la última copia de estado de cuota (key `gym.cache.v1.<clave>`).
- **`src/components/offline/`**: `provider.tsx` (`OfflineProvider` = detector +
  banner + `AutoFlush` que drena la cola al reconectar), `banner.tsx` (barra
  fija arriba no bloqueante, chip "N pendientes" + "Sincronizar ahora",
  "Conexión restablecida" se autodescarta a 4 s, respeta
  `prefers-reduced-motion`), `conflictos.tsx` (card de altas en conflicto con
  "Descartar", sin automerge), `cache-al-vuelo.tsx` (persiste la data ya servida
  por el RSC).
- **`error.tsx`** en `src/app/mi/` y `src/app/panel/clientes/`: si el RSC falla
  por Supabase caído, muestran la copia cacheada + "actualizado hace X" +
  Reintentar, en vez de la pantalla de error de Next.
- **Wiring**: `<OfflineProvider />` en `checkin/layout.tsx`, `panel/layout.tsx`,
  `mi/layout.tsx`. `checkin-form.tsx` y `alta-form.tsx` pasaron a submit manual
  con timeout: si la action no responde → `encolar(...)` + estado optimista.
  `mi/page.tsx` y `panel/clientes/page.tsx` montan `<CacheAlVuelo>`.
- **Fuera de alcance**: realtime multi-dispositivo, automerge de conflictos,
  mensajería/rutinas offline.

## Modelo de datos

Migraciones `0001`–`0019` ✅ aplicadas (2026-09-03). `tema` jsonb también
guarda `reposoCheckin` (pantalla de reposo del check-in; sin migración).

`gimnasios` (+ `tema` jsonb, `logo_url`, `pin_ingresos`, `dias_aviso_morosidad`,
`pago_alias` / `pago_cbu` / `pago_titular`), `planes`,
`clientes` (+ `sexo` text nullable: `mujer`/`hombre`/`sin_especificar`;
+ `en_prueba` bool + `prueba_iniciada_en` date;
+ `ultimo_aviso_morosidad_enviado_en` date nullable; + `acceso_habilitado` bool),
`ejercicios`, `rutinas` / `rutina_items`, `mensajes` / `mensaje_destinatarios`,
`push_subscriptions`, `registros_entrada` (presencia puntual),
`monitor_db_estado` (monitor de uso de la base).

Helpers SQL: `current_gimnasio_id()`, `is_dueno()`, `current_cliente_id()`,
`recalcular_estado_cuota()`. Chequeos cruzados de mensajería vía funciones
SECURITY DEFINER (`soy_destinatario`, `mensaje_gimnasio`, `mensaje_remitente`,
`mensaje_respondible`) para evitar recursión RLS (`42P17`).

## Estado

| Entregable | Estado |
|---|---|
| 1 — Scaffold, auth, panel dueño, vista cliente, seed | ✅ HECHO |
| 2 — Mensajería (compositor, bandeja, hilos) | ✅ HECHO, probado end-to-end |
| Branding / tema personalizable | ✅ **COMPLETO y ampliado** — 7 colores (con base/derivados + "Calcular desde la base") + 9 presets tipográficos (10 fuentes) + tamaño base + redondeo + espaciado + estilo de navegación + densidad + validación contraste WCAG 2.1 (avisos salteables + **bloqueos duros no salteables**: `ink`/`paper`, `ink`/`paper-2` ≥ 4.5 y separación `paper`/`paper-2` ≥ 1.05, vía `chequearBloqueos()`) + preview en vivo. Ver `VALIDACION_CONTRASTE.md` y `FUENTES_PERSONALIZABLES.md`. Migración `0004_tema_jsonb.sql` ✅ aplicada (2026-09-01). **Rediseño guiado ✅ (2026-09-02)**: 6 paletas prearmadas validadas (`PRESETS_TEMA` en `src/lib/tema.ts`: Papel/Arena/Océano/Bosque/Noche/Carbón) — un tap y guardar; los controles finos quedan bajo "Personalizar a mano" (plegado); mini-preview sticky pegado a los controles en móvil + preview completo en columna en desktop. Umbral del par `rule`/`paper` bajado a 1.35 (hairline decorativo, no control WCAG 1.4.11). Prueba end-to-end ✅ y paleta del gimnasio de prueba re-guardada como **Océano** (reemplaza la vieja `#05fffb` cian que rompía la UI). **Logo del gimnasio ✅ (2026-09-02)**: subida con compresión client-side a WebP <300 KB (bucket `logos`, `gimnasios.logo_url`), paletas sugeridas desde el color dominante del logo (mismo flujo que `PRESETS_TEMA`), logo mostrado en `/panel` (nav), `/mi` (header) y avatar de mensajes. Migración `0006_logo_gimnasio.sql` (pendiente de aplicar). Ver sección "Branding por gimnasio → Logo". |
| Rediseño UI mobile-first con `emil-design-eng` | 🔄 EN CURSO — `/login` ✅. `/panel/ajustes` ✅ (rediseño guiado hecho 2026-09-02: paletas prearmadas + "Personalizar a mano" plegado + preview sticky). `/mi/rutina` editor ✅ (miniaturas + visor + táctil). **`/mi` home + form de generar/regenerar rutina ✅ (SPEC `SPEC_UI_HOME_RUTINA.md`, 2026-09-02)**: componente `Select` reusable en `src/components/ui.tsx` (`appearance-none` + chevron SVG, `bg-paper`, `text-[16px]`) → aplicado en `generar-form.tsx` y `alta-form.tsx`; variante `volt` de `Button` (`bg-volt`/`text-volt-ink`) para "Regenerar rutina" + chips "Zona a enfocar" seleccionados en `--volt`; token `--color-volt-ink` expuesto como utility en `globals.css`; filas "Mensajes" / "Tu rutina" de `/mi` agrupadas en un `<ul>` con `divide-y` + íconos SVG inline; bottom nav de cliente `src/app/mi/mi-nav.tsx` (Inicio · Rutina · Mensajes) montada en `mi/layout.tsx`. Próximo `/panel` (dashboard). Reglas en `REGLAS_UI_EMIL.md` (ampliado 2026-09-02: §5 imágenes, §6 alineación, §7 overflow, §9 modales). Dirección de tema en `INSTRUCCIONES_TEMA.md` §4 |
| 3 — Push web nativo | ✅ **COMPLETO (2026-09-02)** — Código completo y verificado (typecheck limpio, `/sw.js` y `/manifest` sirven 200, cron sin auth → 401, card "Notificaciones" renderiza en `/mi`). **Archivos nuevos**: `public/sw.js` (service worker con listeners `push` + `notificationclick`), `public/manifest.webmanifest` (PWA mínima, link + themeColor + appleWebApp en `layout.tsx`), `src/lib/push/cliente.ts` (registrar SW, pedir permiso, `pushManager.subscribe`), `src/lib/push/enviar.ts` (`enviarPush(profileIds, {title,body,url,tag})`, borra subs muertas 404/410), `src/app/mi/push-actions.ts` (`guardarSuscripcion` / `borrarSuscripcion`), `src/app/mi/activar-notificaciones.tsx` (botón en `/mi`), `src/app/api/cron/cuotas/route.ts` + `vercel.json` (cron diario 12:00, avisa a 6 y 1 días). **Modificados**: `middleware.ts` (whitelist `/sw.js`, `/manifest.webmanifest`, `/icon-`, `/badge-`, `/api/cron`), `panel/mensajes/actions.ts` (enviar + responder dueño), `mi/mensajes/actions.ts` (responder cliente → avisa dueño), `mi/page.tsx`. **Pendiente manual**: (1) Generar claves VAPID: `npx web-push generate-vapid-keys` → `.env.local` (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:…`) + `CRON_SECRET`; las mismas 4 en Vercel → Project Settings → Environment Variables. (2) Iconos en `public/`: `icon-192.png`, `icon-512.png`, `badge-72.png` (referenciados por SW y manifest). (3) Reiniciar dev server (toma nuevo `.env.local`) y probar en navegador real con permiso: `/mi` → "Activar" → mensaje desde panel → debe llegar notificación. (4) Deploy a Vercel (cron se registra solo desde `vercel.json`). Disparar manualmente: `curl -H "authorization: Bearer $CRON_SECRET" https://<dominio>/api/cron/cuotas`. **Nota iOS**: solo funciona en 16.4+ y con app agregada a pantalla de inicio. |
| 4 — Rutinas (motor de reglas + editor + seed imágenes) | ✅ **COMPLETO (2026-09-02)** — Motor con **sexo y énfasis** (generación liviana + zona a enfocar): `tipos.ts` nuevos `SEXOS`/`SEXO_LABEL`, `ENFASIS`/`ENFASIS_LABEL`/`ENFASIS_GRUPOS` (7 zonas: Glúteos, Piernas, Pecho, Espalda, Hombros, Brazos, Abdomen), `MAX_ENFASIS = 2`, `SERIES_OPCIONES`/`REPS_OPCIONES` para menús. `EntradaMotor` ahora lleva `sexo` y `enfasis[]`. `motor.ts`: `ajustarPorSexo()` — mujer baja 1 serie en compuestos/aislamientos (mín. 3/2), sin tocar reps; `aplicarEnfasis()` — agrega hasta 3 ranuras extra/día para las zonas elegidas (máx. 8 ejercicios/día), con patrón real. Si es mujer y no eligió zona → glúteos por defecto. `generar.ts`: persiste sexo/énfasis en `preferencias` jsonb (sin migración SQL). Actions (`mi/rutina/actions.ts`, `panel/clientes/actions.ts`): `parseSexo()` y `parseEnfasis()` validan campos. Formulario (`generar-form.tsx`): select "Sexo" **condicional** (solo se muestra si `clienteSexo` prop existe; sino pasa `"sin_especificar"` por defecto) + fieldset "Zona a enfocar" (chips, máx. 2, controlado). Defaults se releen en `mi/rutina/page.tsx`, `panel/clientes/[id]/page.tsx`, `rutina-panel.tsx`. **Series/Reps sin escribir** (`rutina-editor.tsx`): los 2 `<input>` ahora `<select>` — Series 1–5, Reps 10 opciones fijas (5, 6, 6–8, 8–10, 8–12, 10–12, 12–15, 15, 15–20, 20). Si el valor guardado no está en la lista se agrega como primera opción (compat. hacia atrás). Typecheck limpio ✅. **Imágenes**: cambió wger por **free-exercise-db** (fotos fondo blanco). Editor alterna `/0.jpg`↔`/1.jpg` cada 900 ms + visor grande al tocar. Fix mobile: `img,video{max-width:100%;height:auto}` en `globals.css` + miniatura caja fija 72px. Seed corrido (2026-09-02): `imagen_url` de 53 ejercicios en tabla (verificado, cargan desde jsdelivr). |
| 5 — Cron `recalcular_estado_cuota()` diario (pg_cron o Vercel cron) | Sin empezar |
| Check-in por DNI + día de prueba (SPEC `SPEC_CHECKIN_PRUEBA.md`) | ✅ código + typecheck (2026-09-02). Migración `0009` aplicada; falta probar RLS end-to-end. Ver sección "Check-in por DNI…". |
| Ingresos — pagos por mes protegidos por PIN (Cline) | ✅ código (2026-09-02). Migración `0008_pin_ingresos.sql` ✅ aplicada. Buscador por nombre de socio en `listado-ingresos.tsx` (filtra la lista + total, client-side) — 2026-09-03. |
| Monitor de uso de Supabase (`SPEC_MONITOR_SUPABASE.md`) | ✅ código + migración `0011_monitor_db.sql` (panel `/admin` + cron, aviso al admin de la plataforma al acercarse al límite del plan free). |
| Gestor de morosidad — aviso automático de vencimiento (`SPEC_GESTOR_MOROSIDAD.md`) | ✅ código + typecheck (`tsc --noEmit` limpio). Migración `0012_gestor_morosidad.sql`, server action `actualizarDiasAvisoMorosidad` + card en `/panel/ajustes`, 3ª vía en el cron de cuotas, reset en `registrarPago`. Migración `0012` ✅ aplicada; falta probar end-to-end. Ver "Gestor de morosidad" en Decisiones de producto. |
| Fallback offline ante caída de Supabase (`SPEC_OFFLINE_FALLBACK.md`) | ✅ código + typecheck + smoke test (2026-09-03). **Sin migración, no toca RLS / `motor.ts` / `generar.ts`.** Capa 100% cliente. Ver "Fallback offline" en Decisiones de producto. |

### Datos de prueba
- Dueño: gimnasio `migym`, DNI `30111222`
- Cliente: Lucía Fernández, DNI `40123456`, plan Mensual
- `scripts/seed.mjs "Nombre" slug DNI "Dueño"` crea gimnasio + dueño

### Detalles conocidos
- Para el cliente el remitente de un mensaje figura "Gimnasio" (la policy
  `prof_select` no deja al cliente leer el perfil del dueño). Sin resolver.

### Bugs abiertos
- ✅ **RESUELTO (2026-09-03)** — "No se encontró el gimnasio" al crear el PIN de
  Ingresos. Causa: `0008_pin_ingresos.sql` sin aplicar → `select("pin_ingresos")`
  daba error 400. Se aplicaron `0006`–`0019`; `configurar-pin/actions.ts` además
  quedó devolviendo el mensaje real de Postgres.
- **`/mi/rutina` no respeta el tema** (visto en captura, 2026-09-01).
  - Causa 1: `bg-white` hardcodeado — ✅ RESUELTO y barrido global hecho.
    Editor de rutina + barrido de todo `src/`: inputs → `bg-paper`, `Panel`
    → `bg-paper-2`, filas de nav de `mi/page` → `bg-paper`, input del
    `tema-preview` → `var(--paper)`. No quedan `bg-white` en `src/`.
  - Causa 2: paleta del gimnasio que falla contraste (`ink`≈`paper`,
    `paper`≈`paper-2`) → texto ilegible e inputs invisibles. Es app-wide, no
    de rutina. Mitigado en el editor de tema (ver Estado / Branding): ahora
    `chequearBloqueos()` en `src/lib/contraste.ts` impide guardar (sin
    checkbox) si `ink`/`paper` o `ink`/`paper-2` < 4.5 o si la separación
    `paper`/`paper-2` < 1.05; `derivarPaleta()` fuerza esa separación.
    ✅ RESUELTO (2026-09-02): paleta del gimnasio de prueba re-guardada como
    preset **Océano** desde `/panel/ajustes`. La UI vuelve a leerse app-wide.
- **Imágenes reventaban el layout mobile en `/mi/rutina`** (2026-09-02) —
  ✅ RESUELTO. Faltaba el reset `img,video{max-width:100%;height:auto}` en
  `src/app/globals.css`; una `<img>` con `shrink-0` empujaba el texto fuera de
  pantalla en 375px. Reset agregado + miniatura en caja fija 72px + regla nueva
  en `REGLAS_UI_EMIL.md` §5 (Imágenes y media).

### Feedback de UX pendiente (dueño, 2026-09-02)
- ✅ **Motor de rutinas — realismo y variedad** (2026-09-02). Quejas: botón
  "Regenerar" al fondo del todo; siempre "series de 5"; las 4 objetivos daban
  la misma rutina; regenerar repetía el plan.
  - `src/lib/rutina/motor.ts`: prescripción por **rol de ranura**
    (`primario` / `secundario` / `aislamiento`) en vez de un valor único por
    compuesto → el plan mezcla p. ej. 5×5, 4×6, 3×8–10. `sesgoObjetivo()`
    sesga la **selección de ejercicios** por objetivo (fuerza→barra pesada;
    hipertrofia→mancuerna/máquina; resistencia→máquina/polea/peso corporal;
    bajar grasa→compuestos de mancuerna/peso corporal). `moldearPorObjetivo()`
    recorta accesorias en fuerza y agrega core al cierre en
    resistencia/bajar_grasa. `ajustarSeries()` aplica nivel + sexo por rol.
  - **Semilla**: `EntradaMotor.seed?` (opcional). Las actions
    (`mi/rutina/actions.ts`, `panel/clientes/actions.ts`) pasan un `seed`
    aleatorio en cada generación → `elegir()` rota entre los candidatos a
    ≤10 pts del mejor (hasta 3), así "Regenerar" devuelve un plan distinto
    pero válido. Sin seed sigue siendo determinista (previews).
  - **UI** (`mi/rutina/page.tsx`): el `<details>` de regenerar pasó del fondo
    a un chip compacto alineado a la derecha, justo bajo el encabezado.
  - Typecheck limpio ✅. Probado end-to-end (fuerza vs bajar_grasa dan planes
    y esquemas de series distintos; regenerar cambia el plan).

- ✅ **Editor de tema demasiado difícil** — RESUELTO (2026-09-02). Rediseño
  guiado de `src/app/panel/ajustes/*`: (a) 6 paletas prearmadas validadas
  (`PRESETS_TEMA`), un tap y guardar; (b) mini-preview sticky pegado a los
  controles en móvil (sin la tab Editor/Preview separada). Controles finos bajo
  "Personalizar a mano" (plegado).
- **Imágenes de ejercicio**: se cambió wger por free-exercise-db (ver Estado
  entregable 4). Si siguen sin gustar, la alternativa es GIFs reales vía
  ExerciseDB (RapidAPI, con API key y límite en el free tier).

## Cómo seguir (próxima sesión)

Ya hecho (2026-09-03):
- **Auditoría de tipografía Emil (vista cliente + dueño)**: barrido de textos que
  no seguían `REGLAS_UI_EMIL.md` §2 (escala, pesos, kickers). Cambios (solo
  `className`, `tsc --noEmit` limpio): (A1) todos los `<h1>` de `/panel/*` de
  `text-3xl` (fuera de escala) → `text-2xl`, unificados con la vista cliente —
  `clientes`, `clientes/[id]`, `mensajes`, `planes`, `ajustes`, `ingresos`,
  `ingresos/configurar-pin`. (A2) banner "solo lectura" en `mi/page.tsx` y
  `panel/page.tsx`: `font-semibold` → `font-display`, tamaño unificado `text-lg`.
  (A3) kickers uppercase estandarizados a `tracking-[0.08em]` (había 0.12/0.18):
  `panel/page.tsx` (+ `text-xs`→`text-[11px]`), `cliente-row.tsx`,
  `ajustes-form.tsx` (8×), `logo-uploader.tsx`; `VALIDACION_CONTRASTE.md` L26
  actualizado a 0.08em. (B) timestamps de hilo `text-[10px]`→`text-xs`
  (`mi/mensajes/[id]`, `panel/mensajes/[id]`); visor de rutina kicker +`uppercase`
  y título de ítem sin `font-medium` sobre `font-display` (`rutina-editor.tsx`);
  `/panel/ingresos` total `text-3xl`→`text-2xl` y `<h2>` de mes sin `font-medium`;
  sub-encabezados del hilo del dueño `text-sm font-medium`→`text-lg`. Sin tocar
  color/paleta. Pendiente para otro pase: `text-white` hardcodeado en
  `panel/page.tsx:86`, `font-semibold`/`text-[10px]` en los previews simulados de
  tema, `border-border`/`rounded-lg` en `mi/rutina/page.tsx`.
- **Check-in — pantalla de reposo / screensaver configurable**: overlay ambiental
  oscuro (identidad "Futurista": `--volt`, hora en Orbitron, anillo + haze +
  scanline, sólo `transform`/`opacity`) tras N segundos sin toques en `/checkin`;
  cualquier toque/tecla/rueda/`visibilitychange` lo cierra y re-enfoca el DNI.
  Config del dueño en `/panel/ajustes` (activar, segundos 15–600, mensaje,
  mostrar reloj/logo, intensidad sutil/normal/estático). Sin migración: anidado
  en `gimnasios.tema.reposoCheckin`. Archivos:
  `src/components/checkin/pantalla-reposo.tsx`, `.reposo-*` en `globals.css`,
  `panel/ajustes/reposo-checkin-form.tsx` + `actualizarReposoCheckin`, wiring en
  `checkin/layout.tsx`. Typecheck + verificado en browser ✅. Ver "Check-in —
  pantalla de reposo" en Decisiones de producto.
- **Fallback offline ante caída de Supabase** (SPEC `SPEC_OFFLINE_FALLBACK.md`):
  detector de conexión (`src/lib/offline/conexion.tsx`), cola persistente en
  `localStorage` (`cola.ts`) que reinvoca las Server Actions al reconectar,
  handlers de `checkin` / `alta_cliente` (`handlers.ts`), cache de lectura para
  el estado de cuota (`cache.ts`), `OfflineProvider` + banner + `AutoFlush`
  (`src/components/offline/*`), `error.tsx` en `/mi` y `/panel/clientes` con la
  copia cacheada, wiring en los 3 layouts + `checkin-form.tsx` + `alta-form.tsx`.
  Sin migración, no toca RLS. Typecheck + smoke test ✅. Ver "Fallback offline"
  en Decisiones de producto.
- **Panel: editar datos del socio ya creado** — `editarCliente` +
  `panel/clientes/[id]/editar-datos.tsx` (nombre / DNI / teléfono / sexo / clave;
  DNI cambia el email de auth con rollback). Falta probar end-to-end (bloqueado
  por migraciones).
- **Alta sin checkbox "Pago recibido"** — el alta ya no registra pago; el socio
  queda con cuota vencida y acceso habilitado, el dueño registra el primer pago
  desde la ficha. Ver "Planes y cuotas".
- **Buscador por nombre de socio en `/panel/ingresos`** (`listado-ingresos.tsx`,
  filtro client-side + "Total filtrado").

Ya hecho (2026-09-02): 
- **Gestor de morosidad**: migración `0012` (`gimnasios.dias_aviso_morosidad`,
  `clientes.ultimo_aviso_morosidad_enviado_en`), card "Aviso de vencimiento" en
  `/panel/ajustes` + `actualizarDiasAvisoMorosidad`, 3ª vía en el cron de cuotas
  (push al socio N días antes, texto fijo, dedupe por ciclo), reset en
  `registrarPago`. Typecheck limpio ✅. Migración `0012` aplicada; falta probar.
- Fix `/mi/rutina` no respeta el tema (tokens + `chequearBloqueos`)
- Seed de imágenes de ejercicios corrido (free-exercise-db, `imagen_url` en la tabla)
- Rediseño guiado del editor de tema + prueba end-to-end + gimnasio de prueba re-guardado como Océano
- **Entregable 4 — Rutinas**: motor con sexo y énfasis (generación liviana + zona a enfocar), series/reps como selectores (sin escritura libre), typecheck limpio ✅
- **Entregable 3 — Push web nativo**: código completo y verificado (SW, manifest, suscripción, emisor, wiring en mensajería, cron de cuota + `vercel.json`). Typecheck limpio ✅, `/sw.js` y `/manifest` sirven 200 ✅, cron sin auth → 401 ✅, card "Notificaciones" renderiza en `/mi` ✅
- **Pase de UI sobre `/mi` home + form de rutina** (SPEC `SPEC_UI_HOME_RUTINA.md`, 2026-09-02): componente `Select` reusable + variante `volt` de `Button` + `--color-volt-ink` utility; filas de `/mi` agrupadas en `<ul>` con divisor + íconos; bottom nav de cliente (`mi/mi-nav.tsx`). Typecheck limpio ✅. Migración `0007_cliente_sexo.sql` (columna `clientes.sexo`) ✅ aplicada (2026-09-03).
- **Sexo del cliente ahora es dato real**: columna `clientes.sexo` (nullable), la carga el dueño en el alta (`alta-form.tsx` → `altaCliente`). El select "Sexo" de `generar-form.tsx` solo aparece si está cargado. Falta: que el dueño pueda **editar** sexo (+ nombre / DNI / contraseña) de un cliente ya creado — chip de tarea creado, toca `auth.admin` y el email derivado del DNI.
- **Select "Sexo" condicional en `generar-form.tsx`** (actualización): ahora acepta prop `clienteSexo?: Sexo | null`. Si es `null`/`undefined`, NO muestra el select y pasa `"sin_especificar"` por defecto al motor mediante `<input type="hidden">`. Como `profiles` NO tiene campo `sexo`, actualmente el select se oculta hasta implementar captura en alta.
- **Banner motivacional en `/mi/rutina`**: 20 frases estáticas en `src/lib/frases-motivadoras.ts`, frase del día determinística (día del año % 20). Componente `BannerMotivacional` (`src/components/rutinas/banner-motivacional.tsx`) renderizado arriba del contenido principal. Sin IA, sin BD, todo estático.
- **Tutorial implementado y verificado a 375px** (dueño y cliente). **Archivos nuevos** — `src/components/tutorial/`: `overlay.tsx` (coach-mark: backdrop bg-ink/60, bottom-sheet en móvil / centrado en sm+, dots de progreso, Atrás / Siguiente / Saltear, Escape + scroll del body bloqueado, animate-fade-in/animate-slide-up); `pasos-dueno.tsx` (5 pasos: alta prellenada "Simular alta" avanza, cuota vencida→al día estado local, compositor "Simular envío", aviso in-app banner no push, cierre "Empezar"); `pasos-cliente.tsx` (4 pasos: cuota al día, rutina de ejemplo, mensaje del gimnasio, `<ActivarNotificaciones />` real como CTA final); `mock.tsx` (fragmentos de mentira con tokens); `tutorial.tsx` (`Tutorial` auto-abre según localStorage, escucha evento `abrir-tutorial`, marca flag al cerrar/saltear + `VerTutorialDeNuevo`). **Wiring**: `Tutorial` montado en `mi/layout.tsx` y `panel/layout.tsx`; `VerTutorialDeNuevo` en `mi/page.tsx` (junto a "Salir") y `panel/ajustes/page.tsx`. **Verificado**: Cero escrituras a Supabase (todo estado de React), flags `tutorial_dueno_visto` / `tutorial_cliente_visto` se setean a "1" al terminar o saltear (no reaparece), "Ver tutorial de nuevo" relanza sin tocar el flag ni el estado real, sin scroll horizontal a 375px, typecheck limpio ✅.
- **Sección de Ingresos con PIN** (nueva): Apartado `/panel/ingresos` con protección por PIN (4-6 dígitos, hash SHA-256). Muestra listado completo de pagos agrupados por mes con totales mensuales y total general. **Archivos nuevos**: `supabase/migrations/0008_pin_ingresos.sql` (columna `gimnasios.pin_ingresos`), `src/lib/pin.ts` (hashPin/verificarPin con SHA-256), `src/app/panel/ingresos/configurar-pin/actions.ts` (configurarPin + verificarPinIngresos + resetearPinConContrasena), `src/app/panel/ingresos/configurar-pin/page.tsx` (UI configuración + recuperación), `src/app/panel/ingresos/configurar-pin-form.tsx` (form con validación), `src/app/panel/ingresos/recuperar-pin-form.tsx` (form recuperación en página de configuración), `src/app/panel/ingresos/page.tsx` (página principal), `src/app/panel/ingresos/verificar-pin-modal.tsx` (modal de verificación con "Olvidé mi PIN", usa sessionStorage), `src/app/panel/ingresos/listado-ingresos.tsx` (listado agrupado por mes), `src/app/api/panel/ingresos/route.ts` (endpoint GET para pagos). **Modificado**: `src/app/panel/panel-nav.tsx` (agregado enlace "Ingresos"). **Flujo**: (1) Primera vez → redirige a configurar PIN, (2) Con PIN configurado → modal de verificación (se guarda en sessionStorage), (3) PIN correcto → muestra listado con totales. Enlace "Cambiar PIN" en la vista de ingresos. **Recuperación de PIN**: (A) Desde modal de verificación: botón "Olvidé mi PIN" → pide contraseña → verifica y redirige a configurar nuevo; (B) Desde página de cambio: sección "Resetear PIN" debajo del formulario → pide contraseña → borra PIN y recarga → muestra formulario sin pedir PIN anterior. **Pendiente manual**: aplicar migración `0008_pin_ingresos.sql` en Supabase.

- **Check-in por DNI (modo kiosko) + día de prueba** (SPEC
  `SPEC_CHECKIN_PRUEBA.md`, 2026-09-02): alta con 2 submits ("Dar de alta" /
  "1 día de prueba"), pantalla `/checkin` fuera de `/panel` (sesión del dueño,
  salir revalida la clave), `marcarIngreso` (registro siempre + push si prueba
  vencida), `registrarPago` apaga `en_prueba`, badges "En prueba" / "Prueba
  vencida" en la lista y el detalle del cliente. Typecheck limpio ✅. Ver
  sección "Check-in por DNI…" arriba. **Pendiente manual**: aplicar
  `supabase/migrations/0009_checkin_prueba.sql` (`clientes.en_prueba`,
  `clientes.prueba_iniciada_en`, tabla `registros_entrada` + RLS) — hasta
  entonces `/checkin`, `/panel/clientes` y `/panel/clientes/[id]` fallan porque
  los queries piden `en_prueba` / `registros_entrada`.

- **Logo del gimnasio + paletas desde el logo** (SPEC `SPEC_LOGO_COLORES.md`):
  compresión client-side, extracción de color, chips de paleta sugerida, logo en
  panel/mi/mensajes. Código y typecheck ✅. Migración `0006_logo_gimnasio.sql`
  (columna `logo_url` + bucket `logos` + RLS) ✅ aplicada (2026-09-03).

**Migraciones `0001`–`0019`: ✅ TODAS APLICADAS en Supabase (2026-09-03)** con
`node scripts/aplicar-migraciones.mjs` (runner con `pg` + `DATABASE_URL`).
Ninguna pantalla queda bloqueada por columnas faltantes. Lo que queda de las
features abajo es **probar end-to-end**, ya no aplicar SQL.

Pendiente, prioridad sugerida:

1. **Probar flujo de logo** (`/panel/ajustes` → subir → chip sugerido → guardar;
   verificar `.webp` <300 KB en el bucket y que un gimnasio sin logo no cambia).
1b. **Probar alta con sexo** → `/mi/rutina` muestra el select de Sexo solo si
   está cargado.
1d. **Probar Ingresos + prueba**: crear PIN de Ingresos, alta "1 día de prueba",
   2º ingreso en `/checkin` → push + badge, convertir con pago → badge se apaga.
   RLS: un dueño no ve/inserta `registros_entrada` de otro gimnasio.
1c. **Panel: editar cliente ya creado** (nombre / DNI / contraseña / sexo) —
   ✅ código (2026-09-03). Acción `editarCliente` en `panel/clientes/actions.ts`
   + componente `panel/clientes/[id]/editar-datos.tsx` (`<details>` "Editar datos
   del socio" dentro del panel Acceso). DNI cambia → actualiza `profiles.dni` y
   el email de auth (`dniAEmail`), con chequeo de choque en el gimnasio y
   rollback si `updateUserById` falla; contraseña opcional → `updateUserById` +
   `debe_cambiar_clave = true`; sexo → `clientes.sexo`. Typecheck limpio.
   **Falta probar end-to-end** (migraciones ya aplicadas; `/panel/clientes/[id]`
   ya no da 404 por columnas faltantes).
2. **Cerrar Entregable 3 — manual**: generar VAPID keys + `CRON_SECRET` → `.env.local` y Vercel, agregar iconos PNG (`icon-192.png`, `icon-512.png`, `badge-72.png`) a `public/`, probar suscripción + envío real en navegador con permiso, deploy a Vercel.
3. **Entregable 5 — Cron `recalcular_estado_cuota()`**: falta implementar (actualmente se calcula on-demand).
4. Rediseño UI: seguir con `/panel` (dashboard).
5. Imágenes de ejercicio: si las fotos de free-exercise-db no convencen a 375px, evaluar GIFs reales vía ExerciseDB (RapidAPI, API key + límite free).
6. Logo: íconos PWA generados desde el logo; logo en `/login` (requiere resolver
   el gimnasio antes de enviar el form). Ambos fuera de scope del SPEC inicial.

Login de prueba: cliente `migym/46697615/697615`, dueño `migym/30111222/gym1222`.

## Cómo trabajar (ahorrar tokens)

Reglas completas en **`REGLAS_DESARROLLO.md`**. Resumen:

- Cambio corto (≤ ~15 líneas, 1 archivo): decir qué archivo/línea cambiar, NO editar.
  Lo hace el humano o un comando PowerShell.
- Feature multi-archivo / rediseño con criterio: Claude Code.
- Fix puntual de 1-2 archivos: Cline.
- Migraciones SQL, seed, `.env`, Supabase: manual del humano (`INSTRUCCIONES_TEMA.md`).
- Respuestas cortas, sin resúmenes finales, sin narrar el proceso.
- Mobile-first + skill `emil-design-eng` antes de tocar UI.
- Pegar este archivo (o `REGLAS_DESARROLLO.md`) al arrancar cada sesión.

## Ver la app desde el celular

1. `package.json` → script dev: `"dev": "next dev -H 0.0.0.0"`.
2. IP local: `ipconfig | findstr /i "IPv4"`.
3. Firewall (una vez, admin): `New-NetFirewallRule -DisplayName "Next dev 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow`.
4. En el celu (misma WiFi): `http://<IP>:3000`.
