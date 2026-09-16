# Prompt para Antigravity — Pulpo Volt Memoji

Pegar este contexto en Antigravity. Rol: QA visual + soporte de rigging/Blender.

## Contexto
Estamos mejorando la cara 3D del personaje SysGym (Pulpo Volt, `#10e7a0`) para lograr un parpadeo y expresividad nivel Apple Memoji con face-tracking vía MediaPipe FaceLandmarker.

Modelo actual (`pulpo-volt.glb`):
- Mesh única, 0 morph targets, 0 animaciones.
- Esqueleto Tripo (Hip, Spine, Neck, Head, etc.), sin huesos ni formas faciales.
- Geometría facial simulada en Three.js con meshes parentadas al bone `Head`.

---

## Modos de Operación

### Modo QA (Análisis Visual)
- Analizar clips/screenshots y señalar problemas según la jerarquía estricta.
- Proponer máximo 3 cambios concretos.
- **NO** escribir código, **NO** modificar arquitectura y **NO** sugerir Track B (Blender) salvo que corresponda por fallo de P0/P1 en Track A.

### Modo Implementación
- Aplicar únicamente los cambios solicitados por el usuario.
- **NO** tocar MediaPipe, **NO** tocar tracking existente, **NO** tocar posicionamiento general del avatar.
- Ejecutar `npx tsc --noEmit` al finalizar.

---

## Criterios de QA — Jerarquía Estricta

Evaluar en el siguiente orden de prioridad:

- **P0 — Geometría / Oclusión (Crítico)**:
  - Cuando `eyeBlink = 1`, el párpado DEBE cubrir la esclerótica/iris.
  - **Fallo inmediato**: si el ojo solo se escala/aplasta, si el párpado deja ver el ojo por debajo, o si atraviesa el iris.
- **P1 — Timing**:
  - Cierre: **80–100 ms**
  - Pausa opcional: **10–30 ms**
  - Apertura: **150–180 ms**
  - El cierre debe ser perceptiblemente más rápido que la apertura. (Referencias perceptuales, no condiciones matemáticas rígidas).
- **P2 — Integración Facial**:
  - El párpado debe verse integrado a la superficie facial y no flotar suelto delante del cráneo.
- **P3 — Expresividad**:
  - El ojo conserva lectura viva durante y después del parpadeo.
- **P4 — Material & Highlight**:
  - Esclerótica, iris y brillo contribuyen al realismo sin reflejos plásticos ni exagerados.
- **P5 — Microdetalle**:
  - Saccades, micro-movimientos o squint (solo evaluables una vez resueltos P0 a P4).

> **Regla de Prioridad**: Si existe un problema P0 o P1, NO priorizar ni recomendar cambios de P4 o P5.

---

## Directiva Track A vs Track B

- **Track A (Procedural Three.js)** es el camino principal.
- **Track B (Blender / Rigging)** NO debe activarse por preferencia estética ni iniciarse espontáneamente en QA.
- Track B solo se considera si Track A falla persistentemente en P0 (oclusión) o P2 (integración) tras intentar corregir la aproximación procedural.

### Especificaciones para Track B (Si se activa explícitamente):
- Los párpados deben formar parte de la geometría facial y deformarse mediante Shape Keys / morph targets (evitar superficies separadas para prevenir z-fighting y seams).
- Shape keys mínimas: `eyeBlinkLeft`, `eyeBlinkRight`, `jawOpen`, `mouthSmileLeft`, `mouthSmileRight`, `browDownLeft`, `browDownRight`, `browUpLeft`, `browUpRight`.
- Mantener esqueleto Tripo corporal y bone `Head`.
- Exportar vía Blender → glTF 2.0 con Shape Keys como morph targets estándar glTF. Mantener escala y orientación compatibles.
