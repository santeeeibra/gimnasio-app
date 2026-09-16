# Prompt para ChatGPT — Pulpo Volt Memoji, asesoramiento

Pegar este contexto en ChatGPT. Rol: consultor/criterio, no ejecuta código ni
tiene acceso al repo — solo da opinión, referencias y sugerencias.

## Contexto

Estamos llevando el "memoji" 3D de la mascota de una app de gimnasios (un
pulpo verde `#10e7a0`, llamado Pulpo Volt) de un estado plano/muerto a algo
que se sienta vivo, al nivel de un Apple Memoji, usando face-tracking en vivo
(MediaPipe FaceLandmarker) y renderizado en Three.js / react-three-fiber
dentro de una app Next.js.

Estado actual del modelo 3D: es un GLB genérico auto-rigged (Tripo), 1 mesh,
sin morph targets, sin animaciones, sin cuencas ni párpados modelados. Toda
la cara hoy se simula con formas primitivas (esferas para ojos, cajas para
cejas/boca) flotando delante de una cabeza lisa, parentadas al bone `Head`.
El parpadeo actual solo escala la esfera del ojo — no hay un párpado que
tape de verdad, por eso no convence.

Decidimos un plan en dos tracks:
- **Track A** (elegido primero): resolver todo por código — globo ocular +
  iris + highlight + párpados como casquetes esféricos que rotan para
  cerrar, sin tocar el modelo 3D.
- **Track B** (respaldo si A no alcanza): re-modelar la cabeza en Blender con
  cuencas/párpados reales y shape keys (`eyeBlinkLeft/Right`, `jawOpen`,
  `mouthSmileLeft/Right`, `browUp/DownLeft/Right`) horneadas al GLB.

## Lo que necesitamos de vos

1. **Referencia técnica de cómo Apple resuelve el párpado de Memoji**: la
   curva de easing real de un parpadeo humano/Memoji (duración de cierre vs.
   apertura, si hay overshoot, si el párpado inferior también se mueve).
2. **Timing de vida idle**: cada cuánto parpadea alguien en reposo (rango
   real, no solo "2-6 segundos" que asumimos nosotros), si existen dobles
   parpadeos naturales, y qué otros micro-movimientos (respiración, sway de
   cabeza, saccades oculares) hacen que un personaje 3D estático se sienta
   vivo sin sobreactuar.
3. **Segunda opinión sobre Track A vs B** dado que el modelo base es
   auto-rigged sin geometría facial: ¿conviene apostar fuerte a resolverlo
   100% procedural (más rápido, sin Blender) o el techo de calidad de A es
   demasiado bajo comparado con B para un memoji "que se sienta real"?
4. **Curvas de easing sugeridas** (tipo `cubic-bezier` o descripción
   matemática) para: parpadeo, apertura de mandíbula al hablar, subida de
   cejas — que evitar que el movimiento se vea "lerp robótico".
5. Cualquier trampa visual barata (highlights, sombras de contacto, rim
   light) que dé mucho "vivo" por poco esfuerzo, en un motor Three.js con
   materiales `MeshStandardMaterial` estándar (no PBR complejo).

## Qué NO necesitamos
- No hace falta código React/Three.js — eso lo resuelve Claude Code sobre el
  repo directamente.
- No hace falta trabajo de modelado 3D — eso, si se activa, lo coordina
  Antigravity/Gemini con Blender.
