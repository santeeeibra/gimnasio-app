# SPEC — Modo avanzado / personalizado de rutina (dropsets, técnicas, etc.)

> Para pasarle a Claude Code. Referencia: `contex-sysgym.md`, motor actual en
> `src/lib/rutina/motor.ts` y `tipos.ts`. No tocar la lógica del motor
> automático — este modo es una alternativa, no un reemplazo.

## Objetivo

El cliente que ya entrena y sabe lo que quiere puede armar su rutina a
mano en vez de usar el generador automático: elegir ejercicios, definir
series/reps, y aplicar técnicas de intensidad (dropset, rest-pause,
myo-reps, superserie, cluster set) ejercicio por ejercicio.

## 1) Entrada — nunca por default

En `/mi/rutina`, debajo del generador automático actual, un link chico:
"¿Ya entrenás y querés armar tu rutina a mano?" que abre el modo
personalizado. Nunca es la pantalla inicial — el generador automático
sigue siendo el flujo por default para todos.

## 2) Datos

- Agregar campo `origen: 'auto' | 'manual'` a donde se persiste hoy la
  rutina (revisar si conviene en `rutinas` o en cada `rutina_items`, según
  cómo esté modelado actualmente — mantener compatibilidad con lo que ya
  lee `rutina-panel.tsx` y `rutina-editor.tsx`).
- Cada ítem de rutina manual necesita, además de lo que ya existe
  (ejercicio, series, reps): un campo `tecnica` opcional
  (`ninguna | dropset | rest_pause | myo_reps | superserie | cluster_set`).
- Catálogo de técnicas como constante en `tipos.ts` (mismo patrón que
  `SEXOS`/`ENFASIS`), con label + descripción corta de una línea cada una
  (se muestra como tooltip/texto de ayuda, nunca solo el nombre técnico):
  - dropset: "Bajás el peso sin descansar y seguís hasta el fallo."
  - rest_pause: "Descanso corto de 10-15s dentro de la misma serie."
  - myo_reps: "Una serie de activación + mini-series cortas con poco descanso."
  - superserie: "Dos ejercicios seguidos sin descanso entre ellos."
  - cluster_set: "Repeticiones divididas en bloques con micro-pausas."

## 3) UI del builder

- Selector de ejercicio: reusar el listado/búsqueda que ya existe para
  "no conozco este ejercicio, cambialo" (`ejerciciosSimilares()` como
  base de datos disponible, filtrando por grupo muscular).
- Series / reps: mismos `<select>` de `SERIES_OPCIONES` / `REPS_OPCIONES`
  que ya usa `rutina-editor.tsx` — no reinventar el control.
- Técnica: un `<select>` o chips con las 5 opciones del catálogo +
  "Ninguna" por default.
- Agregar/quitar ejercicios y días libremente (respetar los mismos topes
  de la app: máx. razonable de ejercicios por día, ver `aplicarEnfasis()`
  en el motor para el número que ya usan como límite — 8).
- Botón de salida: "Generar automático con lo que tengo" — vuelve al
  motor actual (`generarPlan()`) sin perder lo que el cliente ya cargó
  manualmente si decide volver atrás.

## 4) Vista del dueño

`rutina-panel.tsx` debe mostrar de dónde salió la rutina (`origen`) y,
si tiene técnica asignada, mostrarla junto al ejercicio (mismo patrón
visual que usa hoy para nota/descanso).

## No-goals

- Sin IA, sin recomendaciones automáticas de qué técnica usar — el
  cliente elige, la app solo lo deja elegir claro.
- No modificar `motor.ts` — el modo manual es un flujo paralelo que
  escribe en la misma estructura de datos pero no pasa por el motor de
  reglas.
- No bloquear el modo manual por nivel/objetivo — cualquier cliente
  puede entrar, aunque la mayoría no lo use.

## Criterio de aceptación

- Un cliente puede armar una rutina completa a mano y guardarla sin
  pasar por `generarPlan()`.
- El dueño ve en `rutina-panel.tsx` si la rutina fue armada a mano o
  generada, y las técnicas asignadas por ejercicio.
- El generador automático actual sigue funcionando exactamente igual
  (typecheck limpio, sin regresiones).
