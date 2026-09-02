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

### Planes y cuotas
- Planes los define cada dueño (nombre, precio, duración).
- El pago se hace por fuera del sistema (transferencia); el dueño lo registra a
  mano. El sistema calcula días restantes.
- Alerta en rojo cuando quedan ≤5-6 días + push, para cliente y dueño.

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
  - Select "Sexo" (3 opciones).
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

## Modelo de datos

`gimnasios` (+ `tema` jsonb), `planes`,
`clientes`, `ejercicios`, `rutinas` / `rutina_items`, `mensajes` /
`mensaje_destinatarios`, `push_subscriptions`.

Helpers SQL: `current_gimnasio_id()`, `is_dueno()`, `current_cliente_id()`,
`recalcular_estado_cuota()`. Chequeos cruzados de mensajería vía funciones
SECURITY DEFINER (`soy_destinatario`, `mensaje_gimnasio`, `mensaje_remitente`,
`mensaje_respondible`) para evitar recursión RLS (`42P17`).

## Estado

| Entregable | Estado |
|---|---|
| 1 — Scaffold, auth, panel dueño, vista cliente, seed | ✅ HECHO |
| 2 — Mensajería (compositor, bandeja, hilos) | ✅ HECHO, probado end-to-end |
| Branding / tema personalizable | ✅ **COMPLETO y ampliado** — 7 colores (con base/derivados + "Calcular desde la base") + 9 presets tipográficos (10 fuentes) + tamaño base + redondeo + espaciado + estilo de navegación + densidad + validación contraste WCAG 2.1 (avisos salteables + **bloqueos duros no salteables**: `ink`/`paper`, `ink`/`paper-2` ≥ 4.5 y separación `paper`/`paper-2` ≥ 1.05, vía `chequearBloqueos()`) + preview en vivo. Ver `VALIDACION_CONTRASTE.md` y `FUENTES_PERSONALIZABLES.md`. Migración `0004_tema_jsonb.sql` ✅ aplicada (2026-09-01). **Rediseño guiado ✅ (2026-09-02)**: 6 paletas prearmadas validadas (`PRESETS_TEMA` en `src/lib/tema.ts`: Papel/Arena/Océano/Bosque/Noche/Carbón) — un tap y guardar; los controles finos quedan bajo "Personalizar a mano" (plegado); mini-preview sticky pegado a los controles en móvil + preview completo en columna en desktop. Umbral del par `rule`/`paper` bajado a 1.35 (hairline decorativo, no control WCAG 1.4.11). Prueba end-to-end ✅ y paleta del gimnasio de prueba re-guardada como **Océano** (reemplaza la vieja `#05fffb` cian que rompía la UI). |
| Rediseño UI mobile-first con `emil-design-eng` | 🔄 EN CURSO — `/login` ✅. `/panel/ajustes` ✅ (rediseño guiado hecho 2026-09-02: paletas prearmadas + "Personalizar a mano" plegado + preview sticky). `/mi/rutina` editor ✅ (miniaturas + visor + táctil). Próximo `/panel` (dashboard). Reglas en `REGLAS_UI_EMIL.md` (ampliado 2026-09-02: §5 imágenes, §6 alineación, §7 overflow, §9 modales). Dirección de tema en `INSTRUCCIONES_TEMA.md` §4 |
| 3 — Push web nativo | ✅ **COMPLETO (2026-09-02)** — Código completo y verificado (typecheck limpio, `/sw.js` y `/manifest` sirven 200, cron sin auth → 401, card "Notificaciones" renderiza en `/mi`). **Archivos nuevos**: `public/sw.js` (service worker con listeners `push` + `notificationclick`), `public/manifest.webmanifest` (PWA mínima, link + themeColor + appleWebApp en `layout.tsx`), `src/lib/push/cliente.ts` (registrar SW, pedir permiso, `pushManager.subscribe`), `src/lib/push/enviar.ts` (`enviarPush(profileIds, {title,body,url,tag})`, borra subs muertas 404/410), `src/app/mi/push-actions.ts` (`guardarSuscripcion` / `borrarSuscripcion`), `src/app/mi/activar-notificaciones.tsx` (botón en `/mi`), `src/app/api/cron/cuotas/route.ts` + `vercel.json` (cron diario 12:00, avisa a 6 y 1 días). **Modificados**: `middleware.ts` (whitelist `/sw.js`, `/manifest.webmanifest`, `/icon-`, `/badge-`, `/api/cron`), `panel/mensajes/actions.ts` (enviar + responder dueño), `mi/mensajes/actions.ts` (responder cliente → avisa dueño), `mi/page.tsx`. **Pendiente manual**: (1) Generar claves VAPID: `npx web-push generate-vapid-keys` → `.env.local` (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:…`) + `CRON_SECRET`; las mismas 4 en Vercel → Project Settings → Environment Variables. (2) Iconos en `public/`: `icon-192.png`, `icon-512.png`, `badge-72.png` (referenciados por SW y manifest). (3) Reiniciar dev server (toma nuevo `.env.local`) y probar en navegador real con permiso: `/mi` → "Activar" → mensaje desde panel → debe llegar notificación. (4) Deploy a Vercel (cron se registra solo desde `vercel.json`). Disparar manualmente: `curl -H "authorization: Bearer $CRON_SECRET" https://<dominio>/api/cron/cuotas`. **Nota iOS**: solo funciona en 16.4+ y con app agregada a pantalla de inicio. |
| 4 — Rutinas (motor de reglas + editor + seed imágenes) | ✅ **COMPLETO (2026-09-02)** — Motor con **sexo y énfasis** (generación liviana + zona a enfocar): `tipos.ts` nuevos `SEXOS`/`SEXO_LABEL`, `ENFASIS`/`ENFASIS_LABEL`/`ENFASIS_GRUPOS` (7 zonas: Glúteos, Piernas, Pecho, Espalda, Hombros, Brazos, Abdomen), `MAX_ENFASIS = 2`, `SERIES_OPCIONES`/`REPS_OPCIONES` para menús. `EntradaMotor` ahora lleva `sexo` y `enfasis[]`. `motor.ts`: `ajustarPorSexo()` — mujer baja 1 serie en compuestos/aislamientos (mín. 3/2), sin tocar reps; `aplicarEnfasis()` — agrega hasta 3 ranuras extra/día para las zonas elegidas (máx. 8 ejercicios/día), con patrón real. Si es mujer y no eligió zona → glúteos por defecto. `generar.ts`: persiste sexo/énfasis en `preferencias` jsonb (sin migración SQL). Actions (`mi/rutina/actions.ts`, `panel/clientes/actions.ts`): `parseSexo()` y `parseEnfasis()` validan campos. Formulario (`generar-form.tsx`): select "Sexo" + fieldset "Zona a enfocar" (chips, máx. 2, controlado). Defaults se releen en `mi/rutina/page.tsx`, `panel/clientes/[id]/page.tsx`, `rutina-panel.tsx`. **Series/Reps sin escribir** (`rutina-editor.tsx`): los 2 `<input>` ahora `<select>` — Series 1–5, Reps 10 opciones fijas (5, 6, 6–8, 8–10, 8–12, 10–12, 12–15, 15, 15–20, 20). Si el valor guardado no está en la lista se agrega como primera opción (compat. hacia atrás). Typecheck limpio ✅. **Imágenes**: cambió wger por **free-exercise-db** (fotos fondo blanco). Editor alterna `/0.jpg`↔`/1.jpg` cada 900 ms + visor grande al tocar. Fix mobile: `img,video{max-width:100%;height:auto}` en `globals.css` + miniatura caja fija 72px. Seed corrido (2026-09-02): `imagen_url` de 53 ejercicios en tabla (verificado, cargan desde jsdelivr). |
| 5 — Cron `recalcular_estado_cuota()` diario (pg_cron o Vercel cron) | Sin empezar |

### Datos de prueba
- Dueño: gimnasio `migym`, DNI `30111222`
- Cliente: Lucía Fernández, DNI `40123456`, plan Mensual
- `scripts/seed.mjs "Nombre" slug DNI "Dueño"` crea gimnasio + dueño

### Detalles conocidos
- Para el cliente el remitente de un mensaje figura "Gimnasio" (la policy
  `prof_select` no deja al cliente leer el perfil del dueño). Sin resolver.

### Bugs abiertos
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
- ✅ **Editor de tema demasiado difícil** — RESUELTO (2026-09-02). Rediseño
  guiado de `src/app/panel/ajustes/*`: (a) 6 paletas prearmadas validadas
  (`PRESETS_TEMA`), un tap y guardar; (b) mini-preview sticky pegado a los
  controles en móvil (sin la tab Editor/Preview separada). Controles finos bajo
  "Personalizar a mano" (plegado).
- **Imágenes de ejercicio**: se cambió wger por free-exercise-db (ver Estado
  entregable 4). Si siguen sin gustar, la alternativa es GIFs reales vía
  ExerciseDB (RapidAPI, con API key y límite en el free tier).

## Cómo seguir (próxima sesión)

Ya hecho (2026-09-02): 
- Fix `/mi/rutina` no respeta el tema (tokens + `chequearBloqueos`)
- Seed de imágenes de ejercicios corrido (free-exercise-db, `imagen_url` en la tabla)
- Rediseño guiado del editor de tema + prueba end-to-end + gimnasio de prueba re-guardado como Océano
- **Entregable 4 — Rutinas**: motor con sexo y énfasis (generación liviana + zona a enfocar), series/reps como selectores (sin escritura libre), typecheck limpio ✅
- **Entregable 3 — Push web nativo**: código completo y verificado (SW, manifest, suscripción, emisor, wiring en mensajería, cron de cuota + `vercel.json`). Typecheck limpio ✅, `/sw.js` y `/manifest` sirven 200 ✅, cron sin auth → 401 ✅, card "Notificaciones" renderiza en `/mi` ✅

Pendiente, prioridad sugerida:

1. **Cerrar Entregable 3 — manual**: generar VAPID keys + `CRON_SECRET` → `.env.local` y Vercel, agregar iconos PNG (`icon-192.png`, `icon-512.png`, `badge-72.png`) a `public/`, probar suscripción + envío real en navegador con permiso, deploy a Vercel.
2. **Entregable 5 — Cron `recalcular_estado_cuota()`**: falta implementar (actualmente se calcula on-demand).
3. Rediseño UI: seguir con `/panel` (dashboard).
4. Imágenes de ejercicio: si las fotos de free-exercise-db no convencen a 375px, evaluar GIFs reales vía ExerciseDB (RapidAPI, API key + límite free).

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
