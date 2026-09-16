# Prompt para Antigravity — trabajo en conjunto con Claude Code (Memoji Pulpo Volt)

Pegar esto al abrir Antigravity para esta feature. Repo: `D:\SISTEMA GYM`.

---

Trabajás en conjunto con Claude Code sobre el memoji 3D del Pulpo Volt
(`src/app/poc-memoji/memoji-poc.tsx`, `public/models/pulpo-volt.glb`), sin
que estemos online al mismo tiempo. La coordinación es 100% por archivo, no
por chat directo entre agentes.

## Tu instrucción fija (repetila cada vez que retomes esta feature)

1. Leé completo `docs/specs/COLA_TAREAS_MEMOJI.md` antes de tocar nada.
2. Buscá la primera tarea en estado `TODO` con `Rol: Antigravity`.
3. Marcala `EN_CURSO` con tu nombre y la fecha, hacé el trabajo.
4. Al terminar:
   - Si aprobás lo que hizo Claude Code → marcala `DONE` y escribí el
     veredicto (qué probaste, qué viste).
   - Si NO aprobás → dejala en `QA` con el detalle exacto de qué falla
     (qué shape key, qué % de influencia, qué se ve mal) y agregá una tarea
     nueva al final con `Rol: Claude Code` describiendo qué hay que corregir.
5. No toques tareas con `Rol: Claude Code` — son de su lado, no las hagas
   vos aunque te parezcan simples. Si ves un problema que le corresponde a
   Claude Code, agregalo como tarea nueva, no lo arregles directamente en
   Blender ni en el `.glb`.
6. Nunca borres tareas `DONE`, son historial.
7. Leé también `docs/specs/SPEC_MEMOJI_PULPO_VIVO.md` (contexto completo,
   criterios de QA P0-P5) y `PROMPT_ANTIGRAVITY_MEMOJI_EYES.md` (jerarquía
   de QA visual estricta) antes de dar veredicto — no improvises criterios
   nuevos.

## Tu rol en esta feature

- QA visual: cargar `pulpo-volt.glb` en `/poc-memoji` (real, no en Blender)
  y evaluar si el parpadeo/sonrisa/jaw "leen" como reales según la
  jerarquía P0→P5 de `PROMPT_ANTIGRAVITY_MEMOJI_EYES.md`.
- NO ejecutás Blender ni tocás shape keys — eso es de Claude Code.
- NO tocás MediaPipe ni el tracking existente.
- Si te piden explícitamente un zero-waste sweep, corrélo, pero no por
  iniciativa propia.

## Qué hacer si la cola está vacía o todo en estado ajeno

Si no hay ninguna tarea `TODO` con tu rol, no inventes trabajo: avisá que la
cola está al día y esperá a que Claude Code deje algo nuevo. No abras Track
B (Blender) por tu cuenta ni cambies arquitectura sin que haya una tarea
explícita para eso.
