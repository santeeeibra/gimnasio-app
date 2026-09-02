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

### Rutinas (sin empezar)
- V1: motor de **reglas fijas** (sin IA). Variables: objetivo, peso, edad, días
  de entrenamiento, preferencias.
- Cliente puede editar su rutina (series/reps, sustituir ejercicios).
- Base de ejercicios con imagen/GIF de fuente abierta (wger).
- Fase 2 futura: capa de IA solo para ajustes finos.

### Mensajería
- El dueño manda mensajes individuales o masivos (todos / filtrado por plan).
- Cada mensaje tiene flag "respondible" (chat) o "solo aviso".
- Llega a la bandeja dentro de la app + push.

### Branding por gimnasio
- El dueño personaliza el tema desde `/panel/ajustes`: 7 colores independientes
  (fondo, fondo tarjetas, texto, texto suave, bordes, acento, texto sobre
  acento) + tipografía (9 presets: Moderno/Técnico/Neutro/Editorial/Humanista/
  Redondeado/Condensado/Contemporáneo/Amigable). Sin tinte automático.
- **Validación de contraste WCAG 2.1**: 6 pares críticos (umbrales 3.0 y 4.5).
  Sugerencias automáticas ajustando luminosidad HSL. Checkbox obligatorio para
  guardar con fallos (`src/lib/contraste.ts`).
- **10 fuentes Google Fonts**: Bricolage Grotesque, Inter, Space Grotesk, Geist,
  Fraunces, DM Sans, Manrope, Archivo, Sora, Plus Jakarta Sans (~2-2.5MB).
- Se guarda en `gimnasios.tema` (jsonb). `null` → defaults.
- `src/lib/tema.ts` centraliza tipo, defaults, validación y `temaToVars()`.
  Inyectado en `panel/layout.tsx` y `mi/layout.tsx`. Preview en vivo en Ajustes.

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
| Branding / tema personalizable | ✅ **COMPLETO** — 7 colores + 9 presets tipográficos (10 fuentes) + validación contraste WCAG 2.1 + preview en vivo. Ver `VALIDACION_CONTRASTE.md` y `FUENTES_PERSONALIZABLES.md`. **Pendiente**: aplicar migración `0004_tema_jsonb.sql` + prueba end-to-end |
| Rediseño UI mobile-first con `emil-design-eng` | 🔄 EN CURSO — `/login` ✅ hecho. `/panel/ajustes` ✅ validación de contraste estilo Emil. Próximo `/panel` (dashboard). Dirección y notas en `INSTRUCCIONES_TEMA.md` §4 |
| 3 — Push web nativo | Sin empezar. Tabla lista; faltan VAPID keys, service worker, endpoint, disparo en cuota por vencer. TODO marcado en `panel/mensajes/actions.ts` |
| 4 — Rutinas (motor de reglas + editor + seed wger) | Sin empezar. Tablas listas |
| 5 — Cron `recalcular_estado_cuota()` diario (pg_cron o Vercel cron) | Sin empezar |

### Datos de prueba
- Dueño: gimnasio `migym`, DNI `30111222`
- Cliente: Lucía Fernández, DNI `40123456`, plan Mensual
- `scripts/seed.mjs "Nombre" slug DNI "Dueño"` crea gimnasio + dueño

### Detalles conocidos
- Para el cliente el remitente de un mensaje figura "Gimnasio" (la policy
  `prof_select` no deja al cliente leer el perfil del dueño). Sin resolver.

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
