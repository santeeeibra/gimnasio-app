# SPEC — 3 temáticas visuales nuevas (además de Clásico y Futurista)

> Para pasarle a Claude Code. Referencia: `contex-sysgym.md`. Pasar por la
> skill **`emil-design-eng`** para cada temática — es trabajo de diseño
> real (paleta, tipografía, texturas), no solo cablear un flag nuevo.
> Objetivo final: 5 estilos visuales en el selector de `/panel/ajustes`
> (Clásico, Futurista + estas 3), cada uno pensado para un tipo de gym
> distinto.

## Objetivo

Hoy `estiloVisual` en `src/lib/tema.ts` es `"clasico" | "futurista"`,
mostrado como radio de 2 opciones en `ajustes-form.tsx`. Extender a 5
valores, cada uno con su propio tratamiento visual (no solo color: puede
tocar tipografía, texturas, bordes, densidad).

## 1) Las 3 temáticas nuevas (dirección conceptual — el detalle fino lo define `emil-design-eng`)

- **`estudio`** — cálido, papel claro, tipografía editorial. Pensado para
  gimnasios boutique / yoga / pilates / estudios chicos. Contrapunto
  "suave" de Clásico.
- **`concreto`** — industrial, gris oscuro, tipografía condensada y
  bold, bordes duros. Pensado para boxes tipo crossfit / powerlifting /
  gimnasios "hardcore".
- **`cancha`** — enérgico, color de acento vivo, acentos diagonales o
  geométricos, sensación deportiva/de equipo. Pensado para gimnasios
  funcionales / entrenamiento grupal.

Nombres tentativos — si `emil-design-eng` sugiere mejores nombres o
ajustar el concepto para que se vea bien en mobile, tiene prioridad el
criterio de diseño sobre este spec.

## 2) Dónde tocar

- `src/lib/tema.ts`: extender `Tema["estiloVisual"]` a
  `"clasico" | "futurista" | "estudio" | "concreto" | "cancha"`. Cada
  valor nuevo define su propio bloque de variables (igual que Futurista
  pisa `--font-hero` en la línea ~364) — colores base, tipografía si
  aplica, y cualquier variable de textura/efecto que necesite.
- `src/app/globals.css`: un bloque de CSS por temática nueva, mismo
  patrón que el de Futurista (línea ~216) — fondo, efectos ambientales
  sutiles si aplica (nada que rompa `prefers-reduced-motion`).
- `src/app/panel/ajustes/ajustes-form.tsx`: sumar las 3 opciones al
  `Radios` de "Estilo visual" (línea ~137), con su `hint` corto como ya
  tienen Clásico/Futurista.
- Revisar componentes que hoy asumen que `futurista` es el único caso
  "especial" (ej. `src/components/anillo-progreso.tsx`) — generalizar la
  condición a "si el estilo tiene tratamiento propio" en vez de
  hardcodear `=== "futurista"`.
- Cada temática nueva pasa por `chequearBloqueos()` (contraste WCAG 2.1,
  `src/lib/contraste.ts`) igual que las paletas prearmadas — ninguna se
  guarda si no pasa los bloqueos duros.

## No-goals

- No es un editor de temáticas custom para el dueño (eso ya existe por
  separado en "Personalizar a mano" — colores sueltos). Estas 5 son
  prearmadas, un tap y listo.
- No reemplaza las paletas de color (`PRESETS_TEMA`) — son dos selectores
  distintos: estilo visual (esto) + paleta de colores (ya existe). Un
  dueño puede combinar cualquier paleta con cualquier estilo, salvo que
  el estilo fuerce colores propios (como hace Futurista hoy).

## Criterio de aceptación

- 5 opciones visibles y seleccionables en "Estilo visual" de
  `/panel/ajustes`, cada una con preview/hint claro.
- Las 3 nuevas pasan `chequearBloqueos()` sin excepciones manuales.
- Mobile-first: probadas en pantalla chica, sin overflow ni texto
  ilegible.
- Typecheck limpio.
