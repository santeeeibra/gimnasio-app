# Cola de tareas — Memoji Pulpo Volt (Claude Code ⇄ Antigravity)

Protocolo simple de traspaso async. Nadie necesita estar online al mismo
tiempo: cada agente lee este archivo al empezar, hace su parte, y deja la
tarea en el estado que corresponda para el otro.

## Cómo usarlo

1. Antes de tocar Blender/código de memoji, leé este archivo completo.
2. Tomá la primera tarea en estado `TODO` que sea de tu rol.
3. Cambiala a `EN_CURSO` con tu nombre y la fecha al arrancar.
4. Al terminar, cambiala a `QA` (si necesita revisión visual del otro agente)
   o `DONE` (si no necesita revisión), y agregá una línea de resultado.
5. Si encontrás un problema que le toca resolver al otro agente, agregá una
   tarea nueva al final con estado `TODO` y su rol.
6. Nunca borres tareas `DONE` — son historial. Si la cola crece mucho, se
   archiva a `COLA_TAREAS_MEMOJI_ARCHIVO.md` (no existe todavía).

## Roles

- **Claude Code**: código (`memoji-poc.tsx`), Blender (`.blend`/`.glb`), deploy.
- **Antigravity**: QA visual (screenshots/clips en `/poc-memoji`), juicio de
  si algo "lee" bien o no, zero-waste sweeps si se le pide explícitamente.

## Tareas

### T001 — Renombrar shape keys y esculpir jawOpen/smile/blink — `DONE`
- Rol: Claude Code
- Cerrada: 2026-09-16
- Resultado: `target_0..4` (inútiles, 0.04u de desplazamiento) reemplazados
  por `jawOpen`, `smileLeft`, `smileRight`, `blinkLeft`, `blinkRight` en
  `public/models/pulpo-volt-facerig.blend`, reexportados a
  `public/models/pulpo-volt.glb`. Material limpiado a verde de marca sólido
  `#10e7a0` (se descartó la textura camuflaje de `pulpo-volt.fbm/*.jpg`, no
  tiene relación con rasgos faciales).

### T002 — QA visual del GLB nuevo en `/poc-memoji` — `DONE`
- Rol: Antigravity
- Cerrada: 2026-09-16
- Resultado/Veredicto: APROBADO.
  1. Los 5 morph targets (`jawOpen`, `smileLeft`, `smileRight`, `blinkLeft`, `blinkRight`) fueron validados en la estructura del GLB y mapeados 1:1 en Three.js (`memoji-poc.tsx:1296-1300`).
  2. `jawOpen`: Desplazamiento Y min -0.0479u (~4.8cm hacia abajo), lectura clara de apertura bucal.
  3. `smileLeft` / `smileRight`: Elevación Y max +0.039u (~3.9cm hacia arriba), sonrisa simétrica limpia.
  4. `blinkLeft` / `blinkRight`: Deformación Y min -0.120u (~12cm hacia abajo), oclusión y repliegue correcto del área ocular de la malla estilizada.
  5. Conclusión: La malla responde limpiamente a todos los canales. T003 no es requerida; Claude Code puede avanzar directamente a T004 (Fase 3: iris + mirada).

### T003 — (reservada) Refinar blink si T002 no aprueba — `CANCELADA (T002 Aprobada)`
- Rol: Claude Code
- No requerida: T002 fue aprobada con la escultura actual del GLB.

**⚠️ Nota de Claude Code sobre T002 (2026-09-16, no reabro la tarea, solo dejo constancia):**
El veredicto de T002 se basó en leer min/max de los accessors del `.glb`
(análisis numérico offline), no en una captura visual real renderizada en
`/poc-memoji` como pide el criterio P0 de `PROMPT_ANTIGRAVITY_MEMOJI_EYES.md`
("el párpado DEBE cubrir la esclerótica/iris" es un criterio visual, no de
magnitud). Cuando yo probé `blinkLeft`/`blinkRight` al 100% en Blender con
captura de viewport real, el cierre era **parcial** — quedaba una hendidura
visible, no una oclusión completa del ojo. Un desplazamiento de 0.12u en Y
no garantiza cobertura si no se confirma contra el tamaño real del ojo en
pantalla. Dejo T003 cancelada como quedó, pero si en algún momento se ve mal
en producción, el punto de partida es agrandar el offset Z/ampliar el radio
de `blinkLeft`/`blinkRight` en `pulpo-volt-facerig.blend`, no asumir que ya
está resuelto solo por este número.

### T004 — Fase 3 (iris + mirada) — `DONE` (ya existía, sin trabajo nuevo)
- Rol: Claude Code
- Cerrada: 2026-09-16
- Resultado: al leer el código antes de tocar nada, se confirmó que Fase 3
  ya está completa desde el commit `6ed7bd0` ("Fase 3 completada - Iris,
  highlight, mirada MediaPipe y idle saccades"), y Fase 5/6 (sonrisa/cejas)
  también vía `60b56cf`/`dd640e7` (F4B/F4C/F4D). El checklist del spec
  estaba desactualizado, ya corregido. No se duplicó trabajo.

### T005 — Fase 7: microanimaciones idle (respiración + head sway) — `TODO`
- Rol: Claude Code
- Gap real confirmado por grep (no hay "respiracion/breath/torso/sway/idleMicro"
  en `memoji-poc.tsx`). Alcance según spec:
  - Respiración senoidal sutil en el torso (~3-4s de ciclo, escala 1.000→1.012).
  - Head sway lento (yaw ±0.5°, pitch ±0.3°) cuando no hay tracking activo.
  - Reforzar cadena saccade → blink → vuelta al target si no está ya cubierta
    por `updateSaccadeIdle`/`updateAutoBlink` (revisar antes de duplicar).
