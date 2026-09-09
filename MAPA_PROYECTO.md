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
| Memoria de progreso (peso/reps por sesión) | tabla `registro_progreso` (no creada) | 🔲 sin spec armado — retención 6 meses obligatoria |
| Compartir logros (récord de peso + racha de constancia) | `src/lib/logros/*` (deteccion, actions, compartir, imagen, tipos), `src/components/logros/*` (`cartel-logro.tsx`, `racha-card.tsx`, `racha-seccion.tsx`), `src/components/mascota/pulpo.tsx`, migración `0038_reacciones_logro.sql` | ✅ integrado (2026-09-09) — `0038` ya aplicada en Supabase (tabla `reacciones_logro` verificada). Detección de récord enganchada en `guardarProgresoCliente` (`src/lib/progreso/actions.ts` → `ProgresoState.record`), `<CartelLogro tipo="record">` renderizado desde el dial de peso bajo la GIF (`dial-vertical-progreso.tsx`, props `gimnasioNombre`/`logoUrl`/`colores`/`ejercicioNombre` threadeadas por `rutina-editor.tsx` + `mi/rutina/page.tsx`, sólo vista alumno). Racha en `/mi` vía `obtenerRachaCliente` + `<RachaSeccion>` (auto-abre `<CartelLogro tipo="racha">` una vez por hito, guard en localStorage). Colores del tema vía `parseTema` de `src/lib/tema.ts`. `tsc --noEmit` limpio. Reacciones 👏 entre alumnos (`alternarReaccionLogro`) siguen sin UI. |
| Push web nativo (VAPID) | — | ✅ código completo — **falta manual: VAPID keys, iconos, deploy** |
| Reset de clave "olvidé mi contraseña" | `src/app/login/olvide-clave/*`, `src/app/reset-clave/page.tsx`, `src/lib/email/enviar.ts` (Resend), campo email en `alta-form.tsx` / `editar-datos.tsx` / `panel/ajustes` (`email-recuperacion-form.tsx`), migración `0021_email_recuperacion.sql` | ✅ código + typecheck (2026-09-03). **Doble camino**: (A) link por email — solo si `RESEND_FROM` es un dominio verificado (no `@resend.dev`); (B) sin dominio → flujo asistido: socio ⇒ push a los dueños "regeneralé la clave desde la ficha"; dueño ⇒ `notificarSuperadmin`. **Falta manual**: aplicar `0021`; para camino A: dominio en Resend + `RESEND_FROM=no-reply@dominio` + `<origin>/reset-clave` en Redirect URLs de Supabase Auth |
| Avisos al superadmin (push + email) | `src/lib/admin/notificar.ts` → `notificarSuperadmin()`; enganchado en `registrarError`, `registrarAccionAdmin`, cron de cuotas, y form "Contactar soporte" en `panel/ajustes` (`contactar-soporte-form.tsx` + `contactarSoporte`) | ✅ código + typecheck (2026-09-03). **Falta manual**: env `SUPERADMIN_EMAIL` (+ `RESEND_API_KEY` / `RESEND_FROM` de arriba) |
| Cron `recalcular_estado_cuota()` | — | 🔲 sin empezar |
| Fallback offline ante caída de Supabase | `src/lib/offline/*` (`conexion.tsx`, `cola.ts`, `cache.ts`, `handlers.ts`), `src/components/offline/*` (`provider.tsx`, `banner.tsx`, `conflictos.tsx`, `cache-al-vuelo.tsx`), `error.tsx` en `mi/` y `panel/clientes/`, wiring en los 3 layouts + `checkin-form.tsx` + `alta-form.tsx` | ✅ código + typecheck + smoke test (2026-09-03). Sin migración. Spec `SPEC_OFFLINE_FALLBACK.md` |
| Cobro automático socio→dueño con Mercado Pago (solo Elite) | `src/lib/pagos/mercadopago-connect.ts` (OAuth + refresh en 401), `src/lib/pagos/cobro-socio.ts` (gate Elite + `confirmarPagoSocio`), `api/mp-connect/{iniciar,callback}`, `api/pagos-socio/webhook`, `panel/plan/mp-connect-card.tsx` + `mp-connect-actions.ts`, `mi/pagos/{actions.ts,pagar-mp-button.tsx}`, migraciones `0029`/`0030` | ✅ COMPLETO (2026-09-04) — aplicado, deployado y probado end-to-end. Envs: `MP_CONNECT_CLIENT_ID` / `_SECRET` / `_REDIRECT_URI` |
| GIFs de ejercicios (wger.de / exercise-library) | `scripts/seed-ejercicios.mjs` | ❌ descartado — se mantiene `imagen_url` de free-exercise-db |

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

### Otros

- VAPID keys + `CRON_SECRET`
- Subir `icon-192.png`, `icon-512.png`, `badge-72.png`
- Probar push real
- Deploy a Vercel
- Implementar cron `recalcular_estado_cuota()`

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
