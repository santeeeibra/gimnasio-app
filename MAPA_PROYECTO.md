# MAPA_PROYECTO.md — índice rápido (no leer contex-sysgym.md entero para ubicar algo)

> Generado a partir de `contex-sysgym.md`. Objetivo: que Claude/Cline vayan
> directo al archivo correcto sin recorrer el repo ni el contexto completo.
> **Cómo mantenerlo al día:** ver instrucciones al final.

## Feature → archivos → estado

| Feature | Archivo(s) clave | Estado |
|---|---|---|
| Auth / login (DNI + gimnasio) | `src/app/login/`, helpers `current_gimnasio_id()`, `current_cliente_id()` | ✅ HECHO |
| Alta de clientes (manual, sin auto-registro) | `src/app/panel/clientes/alta-form.tsx`, `altaCliente` en `clientes/actions.ts` | ✅ HECHO — el alta NO registra pago (2026-09-03), se saca el checkbox "Pago recibido"; el dueño cobra desde la ficha del socio |
| Editar datos del socio ya creado | `panel/clientes/[id]/editar-datos.tsx`, `editarCliente` en `clientes/actions.ts` | ✅ código (2026-09-03) — migraciones aplicadas, falta probar end-to-end |
| Ingresos — pagos por mes + PIN + buscador por socio | `src/app/panel/ingresos/*`, `api/panel/ingresos/route.ts` | ✅ código + migración `0008` aplicada — buscador por nombre 2026-09-03; falta probar |
| Ingresos — fix "Olvidé mi PIN" + desactivar PIN | `panel/ingresos/configurar-pin/actions.ts` (`resetearPinConContrasena` ahora usa `signInWithPassword`, NO `updateUser({password})`; nuevo `desactivarPinIngresos`), `desactivar-pin-form.tsx`, `configurar-pin-form.tsx` set `pin_ingresos_desactivado:false`, `page.tsx` (redirige a configurar solo si `pin_ingresos` null **y** `pin_ingresos_desactivado` false; link "Activar PIN de nuevo"), `listado-ingresos.tsx` (prop `pinRequerido`) | ✅ código + typecheck + build + browser (2026-09-09). Necesita migración `0039` (`gimnasios.pin_ingresos_desactivado`). Pre-migración degrada sin romper (lecturas/escrituras del flag best-effort) |
| Gestión de gimnasios (dev /admin) — suspender, nota interna, acciones rápidas, buscador, vencimiento | `supabase/migrations/0039_gestion_gimnasios_dev.sql`, `admin/actions.ts` (`ESTADOS`+`suspendido`, `actualizarNotaInterna`), `admin/gimnasios/lista-gimnasios.tsx` (buscador client-side + iconos por fila: entrar como dueño / reset clave / ver errores + chip de vencimiento + indicador de nota), `admin/gimnasios/[id]/estado-form.tsx` (opción Suspendido + `confirm()`), `admin/gimnasios/[id]/nota-interna-form.tsx`, `admin/errores/page.tsx` (filtro `?gimnasio_id=`), gate en `login/actions.ts` + `lib/auth.ts` (`requireProfile` → `/suspendido`), `src/app/suspendido/page.tsx` | ✅ código + typecheck + `next build` (2026-09-09). **Falta aplicar `0039`** (check `estado` +`suspendido`, `gimnasios.nota_interna`, `gimnasios.pin_ingresos_desactivado`, `gimnasio_permite_escritura()` excluye `suspendido`). Falta probar /admin en browser con login superadmin |
| Planes y cuotas | tabla `planes`, `recalcular_estado_cuota()` | ✅ HECHO (cron pendiente) |
| Rutinas — motor de reglas | `src/lib/rutina/motor.ts` | ✅ COMPLETO — refactor a "presupuesto cerrado" 4 fases (2026-09-03): techo fijo de series/día por nivel, trueque de énfasis sin sumar ranuras + guard de afinidad de día, `repartirSeries` por peso de rol. Sin `aplicarEnfasis`/`ajustarSeries` |
| Rutinas — tipos/constantes | `src/lib/rutina/tipos.ts` (SEXOS, ENFASIS, SERIES/REPS) | ✅ HECHO — `EntradaMotor.zonasDolor?` agregado 2026-09-03 |
| Rutinas — generación/persistencia | `src/lib/rutina/generar.ts` | ✅ HECHO — persiste `zonasDolor` en `preferencias` 2026-09-03 |
| Rutinas — zonas de dolor en generación inicial | `generar-form.tsx` (fieldset "Evitar dolor en"), `motor.ts` (`estaBloqueado`), `mi/rutina/actions.ts` + `panel/clientes/actions.ts` (`parseZonasDolor`) | ✅ código + typecheck + browser (2026-09-03), sin migración |
| Rutinas — editor cliente | `src/app/mi/rutina/rutina-editor.tsx` | ✅ HECHO (animación 2 frames a mejorar) |
| Rutinas — panel dueño | `src/app/panel/clientes/[id]/rutina-panel.tsx` | ✅ HECHO |
| Rutinas — panel avanzado (dropset, myo-reps, etc.) | `SPEC_PANEL_AVANZADO_RUTINA.md` | 🔲 spec armado, no pasado a nadie |
| Mensajería | compositor + bandeja + hilos | ✅ HECHO |
| Branding / tema por gimnasio | `src/lib/tema.ts`, `src/lib/contraste.ts`, `/panel/ajustes` | ✅ COMPLETO |
| Logo + paleta desde logo | `src/lib/logo/comprimir.ts`, `src/lib/logo/paleta.ts`, migración `0006_logo_gimnasio.sql` | ✅ Implementado — migración `0006` aplicada |
| Identidad "Futurista" (anillo + Orbitron) | `src/components/anillo-progreso.tsx`, `REGLAS_UI_EMIL.md` §2 y §17 | 🔄 Paso 1 hecho; faltan animaciones pasivas + propagar al resto de la app |
| Check-in DNI + día de prueba | `src/app/checkin/`, `registros_entrada`, migración `0009_checkin_prueba.sql` | ✅ HECHO — falta ver conversión prueba→pago en uso real |
| Check-in — pantalla de reposo (screensaver) configurable | `src/components/checkin/pantalla-reposo.tsx`, CSS `.reposo-*` en `globals.css`, `ReposoCheckin` en `src/lib/tema.ts`, form `panel/ajustes/reposo-checkin-form.tsx` + `actualizarReposoCheckin` en `panel/ajustes/actions.ts`, wiring en `checkin/layout.tsx` | ✅ código + typecheck + verificado en browser (2026-09-03). **Sin migración** — config anidada en `gimnasios.tema.reposoCheckin`. Opciones: activar/desactivar, segundos de inactividad (15–600), mensaje, mostrar reloj/logo, intensidad (sutil/normal/estático). Estilo "Futurista" (fondo oscuro, `--volt`, hora en `--font-hero`). Migraciones aplicadas → la card ya carga en `/panel/ajustes` |
| UI home + form rutina (selects, --volt, bottom nav) | `SPEC_UI_HOME_RUTINA.md` | 🔄 spec pasado a Claude Code, no confirmado ejecutado |
| Tutorial onboarding | `SPEC_TUTORIAL_ONBOARDING.md` | 🔄 parece implementado, falta confirmar recorrido completo |
| Frases motivadoras | `src/lib/frases-motivadoras.ts` | 🔲 instrucción dada a Cline, no confirmado |
| Memoria de progreso (peso/reps por sesión) | tabla `registro_progreso` (migración `0036`), `src/lib/progreso/actions.ts` (`guardarProgresoCliente` / `guardarProgresoSocio`), `src/components/progreso/dial-vertical-progreso.tsx` | ✅ HECHO — `0036` aplicada. Dial de peso estilo regla iOS con guardado por ejercicio/día (upsert `cliente_id,ejercicio_id,fecha`) |
| Progreso offline (sobrecarga sin señal) | `src/lib/offline/handlers.ts` (`PayloadProgreso` + handler `progreso_ejercicio` en `HANDLERS`), `src/components/progreso/dial-vertical-progreso.tsx` (`accionConCola` envuelve la Server Action) | ✅ código + typecheck (2026-09-10). Si `!navigator.onLine` o la action tira `TypeError`/error de red → `encolar("progreso_ejercicio", …)` + `{ ok: "✓" }` optimista ("✓ Listo"). El handler reinvoca `guardarProgresoSocio(cliente_id,…)` o `guardarProgresoCliente(…)` al reconectar. Sin migración |
| Monetización — afiliación contextual (Fase 4 del plan) | `src/lib/monetizacion/afiliados.ts` (catálogo por patrón biomecánico), `src/components/monetizacion/equipamiento-sugerido.tsx`, montado en `mi/rutina/rutina-editor.tsx` + `demo/page.tsx`, `PLAN_MONETIZACION_ORGANICA.md` | ✅ código + typecheck (2026-09-10) — **apagado**. `CONFIG_AFILIADOS.activo = NEXT_PUBLIC_HABILITAR_AFILIADOS === "true"` (off por defecto). Sin `urlDirecta` (env `NEXT_PUBLIC_MELI_URL_*`) no renderiza. Solo sugiere en compuestos pesados puntuales (peso muerto, sentadilla trasera, press con barra); resto → `null`. `rel="sponsored nofollow"` + divulgación visible. **Falta manual**: alta en ML Afiliados + links `/sec/` reales en los envs |
| Métricas de uso y retención (Fase 2 del plan) | `src/app/panel/page.tsx` (card "Constancia de Entrenamiento"), `src/app/panel/clientes/[id]/page.tsx` (chip "sin entrenar hace X días"), `src/app/api/cron/cuotas/route.ts` (bloque alerta de abandono), migración `0042_alerta_abandono.sql` | ✅ código + typecheck (2026-09-10). "Atleta activo" = registró `registro_progreso` o `registros_entrada` en 7d; dashboard muestra activos 7d/30d + reparto por día de semana (30d). Cron: 1 push/día al dueño con socios al día inactivos +10d (ventana 60d, dedupe 7d vía `clientes.ultimo_aviso_abandono_enviado_en`). **Falta aplicar `0042`** — pre-migración el bloque de abandono degrada sin romper (try/catch) |
| Compartir logros (récord de peso + racha de constancia) | `src/lib/logros/*` (deteccion, actions, compartir, imagen, tipos), `src/components/logros/*` (`cartel-logro.tsx`, `racha-card.tsx`, `racha-seccion.tsx`), `src/components/mascota/pulpo.tsx`, migración `0038_reacciones_logro.sql` | ✅ integrado (2026-09-09) — `0038` ya aplicada en Supabase (tabla `reacciones_logro` verificada). Detección de récord enganchada en `guardarProgresoCliente` (`src/lib/progreso/actions.ts` → `ProgresoState.record`), `<CartelLogro tipo="record">` renderizado desde el dial de peso bajo la GIF (`dial-vertical-progreso.tsx`, props `gimnasioNombre`/`logoUrl`/`colores`/`ejercicioNombre` threadeadas por `rutina-editor.tsx` + `mi/rutina/page.tsx`, sólo vista alumno). Racha en `/mi` vía `obtenerRachaCliente` + `<RachaSeccion>` (auto-abre `<CartelLogro tipo="racha">` una vez por hito, guard en localStorage). Colores del tema vía `parseTema` de `src/lib/tema.ts`. `tsc --noEmit` limpio. Reacciones 👏 entre alumnos (`alternarReaccionLogro`) siguen sin UI. |
| Push web nativo (VAPID) | — | ✅ código completo — **falta manual: VAPID keys, iconos, deploy** |
| Reset de clave "olvidé mi contraseña" | `src/app/login/olvide-clave/*`, `src/app/reset-clave/page.tsx`, `src/lib/email/enviar.ts` (Resend), campo email en `alta-form.tsx` / `editar-datos.tsx` / `panel/ajustes` (`email-recuperacion-form.tsx`), migración `0021_email_recuperacion.sql` | ✅ código + typecheck (2026-09-03). **Doble camino**: (A) link por email — solo si `RESEND_FROM` es un dominio verificado (no `@resend.dev`); (B) sin dominio → flujo asistido: socio ⇒ push a los dueños "regeneralé la clave desde la ficha"; dueño ⇒ `notificarSuperadmin`. **Falta manual**: aplicar `0021`; para camino A: dominio en Resend + `RESEND_FROM=no-reply@dominio` + `<origin>/reset-clave` en Redirect URLs de Supabase Auth |
| Avisos al superadmin (push + email) | `src/lib/admin/notificar.ts` → `notificarSuperadmin()`; enganchado en `registrarError`, `registrarAccionAdmin`, cron de cuotas, y form "Contactar soporte" en `panel/ajustes` (`contactar-soporte-form.tsx` + `contactarSoporte`) | ✅ código + typecheck (2026-09-03). **Falta manual**: env `SUPERADMIN_EMAIL` (+ `RESEND_API_KEY` / `RESEND_FROM` de arriba) |
| Cron `recalcular_estado_cuota()` | — | 🔲 sin empezar |
| Fallback offline ante caída de Supabase | `src/lib/offline/*` (`conexion.tsx`, `cola.ts`, `cache.ts`, `handlers.ts`), `src/components/offline/*` (`provider.tsx`, `banner.tsx`, `conflictos.tsx`, `cache-al-vuelo.tsx`), `error.tsx` en `mi/` y `panel/clientes/`, wiring en los 3 layouts + `checkin-form.tsx` + `alta-form.tsx` | ✅ código + typecheck + smoke test (2026-09-03). Sin migración. Spec `SPEC_OFFLINE_FALLBACK.md` |
| Cobro automático socio→dueño con Mercado Pago (solo Elite) | `src/lib/pagos/mercadopago-connect.ts` (OAuth + refresh en 401), `src/lib/pagos/cobro-socio.ts` (gate Elite + `confirmarPagoSocio`), `api/mp-connect/{iniciar,callback}`, `api/pagos-socio/webhook`, `panel/plan/mp-connect-card.tsx` + `mp-connect-actions.ts`, `mi/pagos/{actions.ts,pagar-mp-button.tsx}`, migraciones `0029`/`0030` | ✅ COMPLETO (2026-09-04) — aplicado, deployado y probado end-to-end. Envs: `MP_CONNECT_CLIENT_ID` / `_SECRET` / `_REDIRECT_URI` |
| GIFs de ejercicios (wger.de / exercise-library) | `scripts/seed-ejercicios.mjs` | ❌ descartado — se mantiene `imagen_url` de free-exercise-db |
| UI jitter.video — Toggle switch reusable | `src/components/ui.tsx` (`<Toggle>`), consumido en `panel/ajustes/ajustes-form.tsx` + `panel/ajustes/reposo-checkin-form.tsx` | ✅ código + typecheck + browser 375px (2026-09-09). Switch pill estilo iOS/banking (no checkbox nativo): track `--volt` en "on", knob que desliza (`translate-x`), `role="switch"`, dispara `hapticoSeleccion()` en `onChange`. Soporta controlado (`checked`+`onCheckedChange`) y no controlado (`defaultChecked`+`name`) → sigue funcionando con FormData/server actions. `ui.tsx` pasó a `"use client"`. NO se tocaron los checkboxes de selección múltiple (`pago-form`, `compose-form`, `plan-form`) |
| UI jitter.video — Navigation bar flotante | `src/app/panel/panel-nav.tsx` (`PanelBottomNav`), `src/app/panel/layout.tsx` (`pb-24`→`pb-28`) | ✅ código + browser 375px (2026-09-09). Barra móvil rediseñada a pill flotante despegada de los bordes con `backdrop-blur-xl` + `backdrop-saturate-150` + sombra; item activo `bg-ink text-paper` redondeado; `hapticoSeleccion()` al tocar. Primer paso del rediseño de navegación a ventanas superpuestas/modales (pedido reunión de ventas 08/09) — la nav ya queda como capa fija `z-30`; falta migrar las secciones a modal |
| UI jitter.video — Banking cards de clientes | `src/app/panel/clientes/cliente-row.tsx` (reescrito), `src/app/panel/clientes/listado-clientes.tsx` (wrapper `<ul>` a `space-y-2.5`, sin `divide-y`) | ✅ código + typecheck + browser 375px (2026-09-09). Cada socio es una tarjeta squircle (`rounded-[18px]` borde + `bg-paper-2` + sombra sutil, `active:scale-[0.99]`): arriba avatar + nombre + `DNI · plan`; abajo chip de estado de cuota con jerarquía fuerte (`Vencido`/`Prueba vencida` = relleno `--danger`; `Al día` = outline `--ok`; `Por vencer` = `--volt`; `En prueba` = neutro) + contador de días a la derecha; `Renovar` en footer con divisor. `hapticoImpactoSuave()` al abrir. `cliente-row.tsx` pasó a `"use client"` |

## Specs (`SPEC_*.md`) — quién los tiene que ejecutar

| Spec | Destino | Estado |
|---|---|---|
| `SPEC_LOGO_COLORES.md` | — | ✅ implementado |
| `SPEC_CHECKIN_PRUEBA.md` | — | ✅ implementado y verificado |
| `SPEC_UI_HOME_RUTINA.md` | Claude Code | 🔄 pasado, no confirmado |
| `SPEC_TUTORIAL_ONBOARDING.md` | Claude Code | 🔄 aparentemente ejecutado, falta confirmar |
| `SPEC_PANEL_AVANZADO_RUTINA.md` | Claude Code | 🔲 armado, no pasado |
| `SPEC_GESTOR_MOROSIDAD.md` | — | ⚠️ no descrito en contex-sysgym.md — revisar contenido del archivo |
| `SPEC_MONITOR_SUPABASE.md` | — | ⚠️ ver "memoria de progreso" (monitoreo % uso Supabase) |
| `SPEC_RUTINA_AVANZADA.md` | — | ⚠️ ver si es el mismo que panel avanzado o distinto |
| `SPEC_TEMATICAS_PULIDO.md` / `SPEC_TEMATICAS_VISUALES.md` | — | ⚠️ no descritos en contex-sysgym.md |
| `SPEC_RESET_CLAVE_Y_NOTIFICACIONES.md` | Claude Code | ✅ ejecutado 2026-09-03 (código + typecheck; falta manual: migración `0021`, Resend, envs, Redirect URL) |
| `SPEC_MP_CONNECT_SOCIOS.md` | Claude Code | ✅ ejecutado 2026-09-04 — código + migraciones `0029`/`0030` aplicadas + envs en Vercel + **probado end-to-end en producción** |

## Cola sin spec armado

- Checklist de setup en `/panel/ajustes` (Claude Code)
- Métricas resumen dashboard dueño (Claude Code)
- Alta masiva de clientes por CSV (Claude Code)
- Confirmación antes de acciones destructivas (Cline)
- Estados vacíos en listas (Cline)
- Buscador/filtro en lista de clientes (Cline)
- Botón "ya transferí" → mensaje al dueño (Cline)
- Banner "agregá a pantalla de inicio" (Cline)
- Toast de error genérico (Cline)

## Pendientes manuales (Supabase/Vercel)

### Migraciones — ✅ TODAS APLICADAS (2026-09-03)

`0001`–`0019` aplicadas en Supabase. Se aplicaron `0006`–`0019` con
`node scripts/aplicar-migraciones.mjs` (runner con `pg` + `DATABASE_URL`).
Ya no hay pantallas bloqueadas por columnas faltantes.

**Pendiente: `0039_gestion_gimnasios_dev.sql`** (2026-09-09) — check de
`gimnasios.estado` +`suspendido`, `gimnasios.nota_interna`,
`gimnasios.pin_ingresos_desactivado`, y `gimnasio_permite_escritura()` que
además excluye `suspendido`. Idempotente. Hasta aplicarla: el detalle/lista de
`/admin/gimnasios` fallan al leer `nota_interna`, y "Desactivar PIN" en
`/panel/ingresos` devuelve error sin romper la sección.

**Pendiente: `0042_alerta_abandono.sql`** (2026-09-10) — agrega
`clientes.ultimo_aviso_abandono_enviado_en date` (dedupe de la alerta de
abandono en el cron de cuotas). Idempotente. Pre-migración el bloque de
abandono del cron degrada sin romper (try/catch); el resto del cron y el
dashboard funcionan igual.

**Nota:** `0040_leads_landing.sql`, `0041_tipo_cuenta.sql` ya existen en el
repo (estado de aplicación no confirmado acá).

### Otros

- VAPID keys + `CRON_SECRET`
- Subir `icon-192.png`, `icon-512.png`, `badge-72.png`
- Probar push real
- Deploy a Vercel
- Implementar cron `recalcular_estado_cuota()` (hoy se calcula on-demand; el
  cron `/api/cron/cuotas` ya corre a diario y hace avisos + alerta de abandono)
- Aplicar `0042_alerta_abandono.sql`
- Monetización afiliados: alta en Mercado Libre Afiliados + poner los links
  `/sec/` reales en `NEXT_PUBLIC_MELI_URL_*` y `NEXT_PUBLIC_HABILITAR_AFILIADOS=true`
  cuando se quiera encender

---

## Cómo mantener este mapa actualizado

Este archivo lo genera **Cline (o cualquier Claude)** leyendo `contex-sysgym.md`
— no es un resumen mecánico, así que PowerShell solo no alcanza para
regenerar el contenido (requiere entender el texto). Lo que sí podés
automatizar con PowerShell es el *recordatorio* de hacerlo.

**Prompt para pegarle a Cline** (después de cerrar una sesión importante, o
cuando `contex-sysgym.md` cambió mucho):

> Leé `contex-sysgym.md` completo y regenerá `MAPA_PROYECTO.md` con el mismo
> formato de tablas que ya tiene (Feature → archivo → estado). No agregues
> texto fuera de las tablas y la sección final de instrucciones. Mantené esa
> última sección igual.

**Script PowerShell opcional** (solo recordatorio, no regenera contenido) —
guardalo como `recordar-mapa.ps1` en la raíz del repo:

```powershell
$doc = "contex-sysgym.md"
$mapa = "MAPA_PROYECTO.md"
if ((Get-Item $doc).LastWriteTime -gt (Get-Item $mapa).LastWriteTime) {
    Write-Host "contex-sysgym.md cambio despues de MAPA_PROYECTO.md -> pedile a Cline que lo regenere." -ForegroundColor Yellow
} else {
    Write-Host "MAPA_PROYECTO.md esta al dia." -ForegroundColor Green
}
```

Corré `.\recordar-mapa.ps1` al arrancar sesión, junto con pegar
`contex-sysgym.md`.
