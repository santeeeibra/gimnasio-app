# MAPA_PROYECTO.md — índice rápido (no leer contex-sysgym.md entero para ubicar algo)

> Generado a partir de `contex-sysgym.md`. Objetivo: que Claude/Cline vayan
> directo al archivo correcto sin recorrer el repo ni el contexto completo.
> **Cómo mantenerlo al día:** ver instrucciones al final.

## Feature → archivos → estado

| Feature | Archivo(s) clave | Estado |
|---|---|---|
| Auth / login (DNI + gimnasio) | `src/app/login/`, helpers `current_gimnasio_id()`, `current_cliente_id()` | ✅ HECHO |
| Alta de clientes (manual, sin auto-registro) | `src/app/panel/clientes/alta-form.tsx` | ✅ HECHO |
| Planes y cuotas | tabla `planes`, `recalcular_estado_cuota()` | ✅ HECHO (cron pendiente) |
| Rutinas — motor de reglas | `src/lib/rutina/motor.ts` | ✅ COMPLETO, bug de variedad corregido 2026-09-02 |
| Rutinas — tipos/constantes | `src/lib/rutina/tipos.ts` (SEXOS, ENFASIS, SERIES/REPS) | ✅ HECHO |
| Rutinas — generación/persistencia | `src/lib/rutina/generar.ts` | ✅ HECHO |
| Rutinas — editor cliente | `src/app/mi/rutina/rutina-editor.tsx` | ✅ HECHO (animación 2 frames a mejorar) |
| Rutinas — panel dueño | `src/app/panel/clientes/[id]/rutina-panel.tsx` | ✅ HECHO |
| Rutinas — panel avanzado (dropset, myo-reps, etc.) | `SPEC_PANEL_AVANZADO_RUTINA.md` | 🔲 spec armado, no pasado a nadie |
| Mensajería | compositor + bandeja + hilos | ✅ HECHO |
| Branding / tema por gimnasio | `src/lib/tema.ts`, `src/lib/contraste.ts`, `/panel/ajustes` | ✅ COMPLETO |
| Logo + paleta desde logo | `src/lib/logo/comprimir.ts`, `src/lib/logo/paleta.ts`, migración `0006_logo_gimnasio.sql` | ✅ Implementado — **falta aplicar migración 0006 en Supabase** |
| Identidad "Futurista" (anillo + Orbitron) | `src/components/anillo-progreso.tsx`, `REGLAS_UI_EMIL.md` §2 y §17 | 🔄 Paso 1 hecho; faltan animaciones pasivas + propagar al resto de la app |
| Check-in DNI + día de prueba | `src/app/checkin/`, `registros_entrada`, migración `0009_checkin_prueba.sql` | ✅ HECHO — falta ver conversión prueba→pago en uso real |
| UI home + form rutina (selects, --volt, bottom nav) | `SPEC_UI_HOME_RUTINA.md` | 🔄 spec pasado a Claude Code, no confirmado ejecutado |
| Tutorial onboarding | `SPEC_TUTORIAL_ONBOARDING.md` | 🔄 parece implementado, falta confirmar recorrido completo |
| Frases motivadoras | `src/lib/frases-motivadoras.ts` | 🔲 instrucción dada a Cline, no confirmado |
| Memoria de progreso (peso/reps por sesión) | tabla `registro_progreso` (no creada) | 🔲 sin spec armado — retención 6 meses obligatoria |
| Push web nativo (VAPID) | — | ✅ código completo — **falta manual: VAPID keys, iconos, deploy** |
| Cron `recalcular_estado_cuota()` | — | 🔲 sin empezar |
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

### Migraciones a aplicar en el SQL Editor (en orden)

Correrlas todas juntas cuando vuelva el servicio de Supabase (incidente JWT /
401 del 2026-09-02):

1. `0006_logo_gimnasio.sql`
2. `0007_cliente_sexo.sql`
3. `0008_pin_ingresos.sql` (causa del bug "No se encontró el gimnasio" al crear el PIN de Ingresos)
4. `0009_checkin_prueba.sql`
5. `0012_gestor_morosidad.sql`
6. `0018_alta_pago_recibido.sql` — columna `clientes.acceso_habilitado`
7. `0019_datos_pago_gimnasio.sql` — columnas `gimnasios.pago_alias` / `pago_cbu` / `pago_titular`

(`0011_monitor_db.sql` está mergeada; confirmar si se aplicó.)

**Hasta aplicar `0018` + `0019`, estas pantallas fallan** porque los queries
piden columnas nuevas: `/mi`, `/mi/pagos`, `/panel/ajustes`, `/panel/clientes`
(y `/panel/clientes/[id]`).

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
