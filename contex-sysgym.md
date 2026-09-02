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

### Rutinas (motor + generación + editor hechos; falta pulido/seed real)
- V1: motor de **reglas fijas** (sin IA). Variables: objetivo, nivel, días de
  entrenamiento, preferencia de equipo.
- `src/lib/rutina/`: `tipos.ts` (tipos + labels OBJETIVO/NIVEL), `motor.ts`
  (scoring de ejercicios con factores de equipo, `ejerciciosSimilares()` para
  sustituciones), `generar.ts` (arma la rutina por día).
- Cliente genera y edita su rutina en `/mi/rutina` (`generar-form.tsx`,
  `rutina-editor.tsx`, `actions.ts`: `generarMiRutina`, `editarItem`,
  `sustituirEjercicio`). Puede cambiar series/reps y sustituir ejercicios
  ("No lo conozco" → alternativas del mismo grupo).
- El dueño ve la rutina del cliente en `/panel/clientes/[id]/rutina-panel.tsx`.
- Base de ejercicios con imagen/GIF de fuente abierta (wger) — **pendiente el
  seed real**, hoy hay datos de ejemplo.
- Fase 2 futura: capa de IA solo para ajustes finos.

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
| 3 — Push web nativo | Sin empezar. Tabla lista; faltan VAPID keys, service worker, endpoint, disparo en cuota por vencer. TODO marcado en `panel/mensajes/actions.ts` |
| 4 — Rutinas (motor de reglas + editor + seed imágenes) | 🔄 EN CURSO — motor (`src/lib/rutina/`), generación y editor cliente (`/mi/rutina`), panel dueño (`/panel/clientes/[id]/rutina-panel.tsx`) ✅. **Imágenes**: se cambió wger (línea, fondo transparente, feas) por **free-exercise-db** (dominio público, fotos fondo blanco centradas, 2 cuadros por ejercicio). `src/data/ejercicios.json` tiene `imagen_url` = frame `/0.jpg` en los 53, vía `scripts/ejercicios-img.mjs` (+ cache `scripts/fedb-cache.json`). El editor alterna `/0.jpg`↔`/1.jpg` cada 900 ms para simular GIF y abre un visor grande al tocar la miniatura. Fix mobile clave: `img,video{max-width:100%;height:auto}` en `globals.css` (faltaba el reset → las imágenes reventaban el layout en 375px) + miniatura en caja fija 72 px. **Pendiente**: correr `node scripts/seed-ejercicios.mjs` (manual, service_role) para subir las URLs nuevas a la tabla; rediseño guiado del editor de tema (ver fila de abajo). |
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

Prioridad sugerida:

1. ✅ **Fix `/mi/rutina` no respeta el tema** — `bg-white` de las pantallas de
   rutina pasados a tokens. Validación de tema endurecida (`chequearBloqueos`).
   Ver Bugs abiertos.
2. ✅ Editor de tema: prueba end-to-end hecha (2026-09-02) — guardado de preset
   Océano en el gimnasio de prueba, persiste y se aplica app-wide.
3. ✅ **Seed de imágenes de ejercicios** — se cambió wger por **free-exercise-db**
   (dominio público, fotos fondo blanco centradas, 2 cuadros). `imagen_url` en
   `src/data/ejercicios.json` vía `scripts/ejercicios-img.mjs` (+ cache
   `scripts/fedb-cache.json`). Editor `/mi/rutina`: miniatura 72px animada
   (0.jpg↔1.jpg cada 900ms, respeta reduce-motion) + visor modal al tocar +
   táctil + stagger + focus-visible. Fix reset `img` en `globals.css`.
   **Falta que corra el humano**: `node scripts/ejercicios-img.mjs && node scripts/seed-ejercicios.mjs`.
   Login de prueba que SÍ entra: cliente `migym/46697615/697615`,
   dueño `migym/30111222/gym1222`.
4. ✅ **Rediseño guiado del editor de tema** — hecho (2026-09-02).
5. **Entregable 3 — Push web nativo**: VAPID keys, service worker, endpoint,
   disparo en cuota por vencer (TODO en `panel/mensajes/actions.ts`).
6. Rediseño UI: seguir con `/panel` (dashboard).

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
