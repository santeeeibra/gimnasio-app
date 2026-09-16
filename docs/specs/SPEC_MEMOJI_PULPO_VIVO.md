# SPEC — Pulpo Volt Memoji: de overlay plano a personaje vivo

**Owner de ejecución:** Claude Code
**Colaboradores:** Antigravity (Gemini 3.8) para Blender/QA visual, ChatGPT para criterio de referencia
**Archivo principal:** [src/app/poc-memoji/memoji-poc.tsx](../../src/app/poc-memoji/memoji-poc.tsx)
**Modelo:** `public/models/pulpo-volt.glb`

## Contexto / diagnóstico

El GLB fue inspeccionado directamente (glTF JSON chunk): **1 sola mesh, 0 morph
targets, 0 animaciones**, esqueleto Tripo genérico de cuerpo completo (Hip,
Spine, Head, brazos, piernas) **sin ningún hueso facial**. La cabeza es una
superficie cerrada y lisa — no tiene cuencas, párpados ni boca modelados.

Todo lo que hoy se ve como "cara" es un `FaceRig` procedural creado en código
([memoji-poc.tsx:103-173](../../src/app/poc-memoji/memoji-poc.tsx#L103-L173)):
esferas negras (`SphereGeometry`) para ojos, `BoxGeometry` planas para cejas y
boca, todo parentado al bone `Head` pero **flotando delante del cráneo**, sin
conformarse a su curvatura.

Problemas concretos identificados:

1. **Parpadeo falso**: el blink escala `leftEye.scale.y` de la esfera negra
   ([memoji-poc.tsx:194-195](../../src/app/poc-memoji/memoji-poc.tsx#L194-L195)).
   Se ve como "el ojo se aplasta", no como un párpado que tapa.
2. **Elementos flotantes**: cejas y boca son cajas planas sin seguir la
   curvatura del cráneo — se nota al rotar la cabeza.
3. **Cero vida idle**: sin cámara activa o quieto frente a ella, el personaje
   se congela. No hay auto-blink, respiración, ni micro-movimiento.
4. **Un solo `LERP_FACTOR = 0.25`** para todos los canales
   ([memoji-poc.tsx:181](../../src/app/poc-memoji/memoji-poc.tsx#L181)). Un
   parpadeo real es ~10x más rápido que el movimiento de una ceja; usar la
   misma constante da sensación robótica.
5. **Lerp sin `delta`** en `updateFaceRig` — el resto del archivo usa
   `THREE.MathUtils.damp(…, delta)` (ver
   [memoji-poc.tsx:724-726](../../src/app/poc-memoji/memoji-poc.tsx#L724-L726)),
   pero el face rig no, así que el feel cambia según el frame rate.
6. **Ojo sin vida propia**: negro mate, sin iris, sin highlight especular, sin
   dirección de mirada (MediaPipe expone `eyeLookIn/Out/Up/Down` y hoy no se
   leen).

## Decisión de arquitectura

Dos tracks posibles:

- **Track A — Procedural Pro** (sin Blender): construir un eye-assembly real
  en Three.js — globo + iris + highlight + párpados como casquetes esféricos
  concéntricos que **rotan** para cerrar (no escalan). Mantiene el GLB actual.
- **Track B — Rig real** (Blender): esculpir cuencas/párpados en la malla,
  hornear shape keys (`eyeBlinkL/R`, `jawOpen`, `mouthSmile`, `browUp/Down`),
  re-exportar GLB, animar con `morphTargetInfluences`.

**Orden: A primero, B como ceiling-raiser si A no alcanza.** La capa de
timing/movimiento (Fase 0) es compartida por ambos tracks y no se tira si se
pasa a B más adelante.

## Datos de referencia (research ChatGPT, con fuentes)

Timing de blink fisiológico real, para no inventar constantes a ojo:

- Frecuencia idle: ~15-20/min en humanos, pero para un avatar mirando a
  cámara usar intervalo medio **3-5s con jitter aleatorio** (no timer fijo:
  ej. secuencia 3.2s, 5.1s, 2.8s, 4.7s...).
- Cierre **40-47% más rápido** que la apertura (asimetría real, no 50/50).
- Valores concretos a usar: **cierre 80-100ms, pausa 10-30ms, apertura
  150-180ms** (total ~250-300ms).
- Asimetría de párpados: superior hace **80-90%** del recorrido, inferior
  solo **10-20%** (no mover ambos igual).
- Doble parpadeo: variación ocasional, **~8% de las veces**, no comportamiento
  frecuente.
- Easing: **easeIn (quad/cubic) para el cierre, easeOut (cubic) para la
  apertura**. No usar la misma curva para ambos lados del blink.
- Cejas con leve delay respecto a la boca (~30-60ms) para que la expresión no
  se sienta simultánea/robótica.

Fuente Apple/ARKit: el catálogo real de blend shapes que usa Memoji incluye
`eyeBlinkLeft/Right`, `eyeSquintLeft/Right`, `eyeWideLeft/Right`, `jawOpen`,
`mouthSmileLeft/Right`, mirada y cejas — no hace falta más que eso para un
personaje estilizado (no anatomía humana completa).

## Fases (ejecuta Claude Code)

### Fase 0 — Capa de vida (la que más impacto da por esfuerzo)
- Motor de auto-blink con los timings de arriba (3-5s jitter, cierre
  80-100ms, apertura 150-180ms, 8% doble parpadeo).
- Blend: `max(blinkTrackeado, blinkAuto)` cuando hay rostro detectado; auto
  puro cuando no hay tracking.
- Reemplazar el `LERP_FACTOR` único por `damp(delta)` con constante propia
  por canal (blink rápido con easeIn/easeOut asimétrico, cejas/boca más
  lentas y con delay).
- Micro-vida: respiración senoidal sutil en el torso (~3-4s de ciclo, escala
  1.000→1.012), head sway lento (yaw ±0.5°, pitch ±0.3°), saccades oculares
  pequeñas en idle (micro-mirada izq/centro/der, no grandes desplazamientos).
- Gaze: leer `eyeLookIn/Out/Up/Down` del `FaceLandmarkerResult` y rotar el
  iris/ojo en consecuencia.
- Opcional: encadenar saccade → blink → vuelta al target (asociación visual
  natural entre movimiento ocular y parpadeo).

### Fase 0+1 — SOLO blink (primera tanda, en curso)
Alcance deliberadamente aislado — **sin `eyeSquint`, sin iris/mirada, sin
boca, sin cejas** — para poder atribuir cualquier problema visual a una sola
causa.

```text
MediaPipe
   ↓
eyeBlinkLeft / Right
   ↓
Blink Engine (auto-blink + tracked, timings de arriba)
   ↓
párpado superior + inferior (rotación sobre casquete esférico)
```

- Esclera + párpado superior e inferior como `SphereGeometry` parciales
  concéntricas al globo (radio levemente mayor), material verde `#10e7a0`.
  Sin iris ni highlight todavía (eso es Fase 3).
- Blink por **rotación** del párpado alrededor de un pivote, no por escala.
  Asimetría superior/inferior 80-90% / 10-20%.
- Motor de auto-blink con los timings ya definidos (3-5s jitter, cierre
  80-100ms, apertura 150-180ms, 8% doble parpadeo, easeIn cierre / easeOut
  apertura).
- Ojo izquierdo y derecho deben responder **independientemente** (parpadeo
  guiñado debe verse guiñado, no ambos ojos acoplados).

**QA de esta fase (antes de avanzar a lo que sigue):**
1. Blink espontáneo — Volt quieto, sin cámara forzando nada, parpadea solo.
2. Blink voluntario — guiñar un ojo real y confirmar que responde solo el
   párpado correspondiente.
3. Doble parpadeo — dejar correr y esperar que aparezca ocasionalmente, sin
   forzarlo.

Criterio decisivo de aprobación: **¿el párpado se ve desplazándose delante de
la esclera y ocultándola, o todavía parece que la esfera se está achicando?**
Si es lo segundo, no se avanza de fase — se ajusta geometría/pivote del
párpado hasta que sí lea como oclusión real.

### Fase 2 — `eyeSquint` (solo después de aprobar blink)
- `eyeSquintLeft/Right` → contracción sutil del párpado = gesto de
  esfuerzo/concentración ("una repetición más"). Aislado, sin tocar nada más.

### Fase 3 — Iris + mirada
- Iris oscuro + highlight especular (mayor ganancia visual según ChatGPT).
- Gaze: leer `eyeLookIn/Out/Up/Down` de MediaPipe, rotar iris.
- Saccades en idle (micro-mirada, no grandes desplazamientos).

### Fase 4 — Boca / jaw
- Cavidad de boca con interior oscuro, jaw open con low-pass sobre la señal
  de MediaPipe (evita temblor).

### Fase 5 — Sonrisa
- `mouthSmileLeft/Right`.

### Fase 6 — Cejas
- `TubeGeometry` sobre `CatmullRomCurve3` siguiendo la curvatura del cráneo,
  no cajas rectas. Delay ~30-60ms respecto a la boca.

### Fase 7 — Microanimaciones idle
- Respiración senoidal en el torso (~3-4s, escala 1.000→1.012), head sway
  lento (yaw ±0.5°, pitch ±0.3°), saccade → blink → vuelta al target.

### Fase 8 — Conformado a la superficie
- Raycast desde el centro del cráneo hacia cada elemento facial, orientar por
  la normal de impacto. Elimina el efecto "calcomanía flotante" al rotar la
  cabeza.

### Fase 9 — Track B (Blender), condicional
- Solo si Track A no alcanza el listón de "se ve un Memoji real".
- Ver [PROMPT_ANTIGRAVITY_MEMOJI_EYES.md](../../PROMPT_ANTIGRAVITY_MEMOJI_EYES.md).

### Fase 10 — Render / pulido final
- Ambient/Hemisphere + key light frontal + rim light suave (verde
  `#10e7a0` contra fondo neutro da profundidad barata) + contact shadow.
- No hace falta PBR complejo con `MeshStandardMaterial` estándar.

## Definition of done

Grabar 10s quieto mirando a cámara. Si un tercero mirando el video no puede
distinguir en qué momento parpadeaste vos del momento en que parpadeó el
auto-blink del pulpo — está listo.

## Reparto de trabajo

- **Claude Code**: Fases 0, 1, 2, 3, 5. Dueño del código y del deploy.
- **Antigravity (Gemini 3.8)**: Fase 4 (Blender) si se activa, y QA visual de
  screenshots/clips (juicio sobre si el blink "lee" como cierre real).
- **ChatGPT**: consulta y criterio, sin tocar repo — ver
  [PROMPT_CHATGPT_MEMOJI_ASESORAMIENTO.md](../../PROMPT_CHATGPT_MEMOJI_ASESORAMIENTO.md).

## Progreso

- [x] Fase 0+1 — solo blink (párpado por rotación, sin squint/iris/boca/cejas) — commits f5b0036, 41aeeeb, fe07d7a. P0/P2 aprobados en QA visual (guiño independiente + párpado verde integrado).
- [x] Fase 2 — eyeSquint (tope 0.4, blend max con auto-blink, telemetría en debug panel) — pendiente QA visual
- [ ] Fase 3 — iris + mirada
- [ ] Fase 4 — boca/jaw
- [ ] Fase 5 — sonrisa
- [ ] Fase 6 — cejas
- [ ] Fase 7 — microanimaciones idle
- [ ] Fase 8 — conformado a superficie
- [ ] Fase 9 — Track B (Blender), si aplica
- [ ] Fase 10 — render/pulido
