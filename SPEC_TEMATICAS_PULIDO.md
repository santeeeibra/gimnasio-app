# SPEC — Pulido de los 5 estilos visuales (firma visual única por estilo)

> Continuación de `SPEC_TEMATICAS_VISUALES.md` (ya implementado en commit
> `52f2d0b`). Esto **no se ejecuta ahora** — es el handoff para otra sesión.
> Herramientas obligadas: skill **`ios-ux-prototype`** (prototipos de flujo en
> HTML con mockup de teléfono, para iterar el look de cada estilo antes de
> tocar código) + skill **`emil-design-eng`** (decisiones finas de motion,
> tipografía, textura) + `REGLAS_UI_EMIL.md`.

## De dónde venimos (estado actual, commit `52f2d0b`)

Los 3 estilos nuevos ya existen y son seleccionables en `/panel/ajustes`,
pero por ahora son **paleta + fuente + una textura de fondo sutil**. Funcionan,
pasan contraste, pero todavía no tienen una *firma visual* que los haga
inconfundibles. Falta el trabajo de diseño real.

### Qué hay implementado hoy

| Archivo | Qué define |
|---|---|
| `src/lib/tema.ts` → `ESTILOS_VISUALES` | Por estilo: `label`, `hint`, `colores` (paleta base validada), `fuente` sugerida, `fontHero` (familia para números héroe), `ambiental` (bool) |
| `src/app/globals.css` (bloque "Estilos visuales ambientales") | Un bloque CSS por estilo que restyliza los hooks compartidos `.futurista-fondo::before` / `.futurista-anillo-glow` / `.futurista-num-in` según `[data-estilo-visual="…"]` |
| `src/app/panel/ajustes/ajustes-form.tsx` | Radio de 5 opciones; elegir un estilo aplica paleta + fuente al draft |
| `src/app/panel/ajustes/actions.ts` | Validación server-side de los 5 valores |

### Hooks CSS compartidos (así se propaga un estilo sin tocar componentes)

- `.futurista-fondo` — contenedor con `position:relative`; su `::before` es la
  textura ambiental (gateada por `[data-estilo-visual]`). Hijos directos van a
  `z-index:1`.
- `.futurista-anillo-glow` — glow del anillo de `AnilloProgreso`.
- `.futurista-num-in` — entrada del número central (se remonta con `key={valor}`).
- Los nombres tienen prefijo `futurista-` por historia; **son genéricos**. Si el
  pulido lo amerita, renombrarlos a algo neutro (`fx-fondo`, `fx-num-in`,
  `fx-anillo-glow`) tocando: `mi/page.tsx`, `panel/page.tsx`,
  `components/anillo-progreso.tsx`, `panel/ajustes/tema-preview-completo.tsx`,
  `globals.css`.

### Paletas actuales (no perder — están validadas WCAG con la fórmula del repo)

```
estudio  paper #f6f3ec  paper2 #ede6da  ink #23201b  inkSoft #6a6155  rule #d6cab3  volt #9c5f36  voltInk #fdfaf4   fuente editorial (Fraunces)
concreto paper #17181a  paper2 #212327  ink #eef0f2  inkSoft #9aa0a8  rule #3a3d42  volt #ff5c39  voltInk #1a1a1a   fuente condensado (Archivo)
cancha   paper #f2f5f7  paper2 #e3e9ee  ink #122031  inkSoft #47586b  rule #bcccd9  volt #1466d6  voltInk #ffffff   fuente contemporaneo (Sora)
```

Todas pasan `chequearBloqueos()` **y** todos los pares de `chequearContraste()`
(`ink/paper`, `inkSoft/paper`, `ink/paper2`, `inkSoft/paper2`, `voltInk/volt`,
`rule/paper ≥1.35`, `paper/paper2 ≥1.05`). **Cualquier retoque de color debe
volver a pasar** — script rápido en
`scratchpad/c.mjs` (fórmula de luminancia WCAG copiada de `src/lib/contraste.ts`).

## Objetivo del pulido

Que cada estilo tenga una **firma visual reconocible de un vistazo**, no solo un
color distinto. Firma = una decisión formal que se repite (forma de borde, ritmo
tipográfico, un elemento gráfico, una manera de tratar el título dominante) y que
**solo** aparece en ese estilo. Referencia de "una firma": `.card-cut` (corte
asimétrico) es la firma del look base; Futurista es grilla + glow + Orbitron.

Regla de oro (Emil): **físico > abstracto**, 1 elemento dominante por pantalla,
motion solo con propósito y nunca en acciones frecuentes. Mobile-first, probar a
375px, cero scroll horizontal.

## Dirección por estilo (punto de partida, la sesión de diseño la afina)

### `estudio` — boutique / yoga / pilates / estudio chico
- Sensación: papel, calma, editorial. Contrapunto suave de Clásico.
- Firma candidata: tratamiento tipográfico editorial fuerte — título dominante
  en Fraunces con *cursiva* real o ligaduras, kicker con línea fina arriba
  (regla horizontal + label), mucho aire. Bordes hairline, nada de sombras
  duras. Textura: grano de papel apenas perceptible, **estático**.
- Motion: mínimo. Fades lentos (`ease`, ~350ms). Nada que "vibre".

### `concreto` — box crossfit / powerlifting / "hardcore"
- Sensación: hormigón, taller, número grande y crudo.
- Firma candidata: bordes a 0px (esquinas rectas), rules gruesas (2px) en vez de
  hairline, kickers en mayúscula con tracking amplio, números héroe enormes en
  Archivo condensada pegados al borde. Textura: trama diagonal dura de `--rule`
  o marca de "stencil". Acento `--volt` naranja usado con moderación, como
  señalética.
- Motion: casi nulo. Sin pulsos. Press feedback seco (`scale(0.98)`, 120ms).

### `cancha` — funcional / entrenamiento grupal / equipos
- Sensación: deporte, energía, cancha marcada.
- Firma candidata: acentos diagonales geométricos (líneas de cancha), chips
  tipo dorsal, `--volt` azul vivo como color de equipo. Cuña diagonal en cards
  destacadas. Números héroe en Sora con peso alto.
- Motion: permitido algo más de vida (pulso lento del glow, entrada del número
  con leve overshoot spring `bounce 0.15`), siempre bajo `prefers-reduced-motion`.

## Cómo abordar la sesión de pulido

1. **`ios-ux-prototype`**: generar un HTML con mockups de teléfono mostrando las
   pantallas clave (`/mi`, `/panel` Resumen, `/panel/ajustes`, `/mi/rutina`) en
   los 3 estilos, lado a lado. Iterar ahí la firma visual sin tocar la app.
2. **`emil-design-eng`**: revisar cada decisión de motion/tipografía/textura con
   el framework (¿anima? ¿propósito? ¿easing? ¿duración?).
3. Recién entonces llevar a código: ampliar el bloque de cada estilo en
   `globals.css` (y si hace falta, variables nuevas en `ESTILOS_VISUALES` /
   `temaToVars` — mismo patrón que `--font-hero`).
4. Revisar `tema-preview-completo.tsx` y `MiniPreview` (en `ajustes-form.tsx`):
   deben mostrar la firma de cada estilo en el preview, no solo los colores.
5. Actualizar `REGLAS_UI_EMIL.md` §17 con la firma de cada estilo (hoy solo
   documenta "Futurista").

## No-goals

- No agregar estilos nuevos (son 5 y quedan 5).
- No romper las paletas validadas — todo retoque de color re-pasa contraste.
- No meter blink / indicadores "en vivo" / spinners decorativos (§17).
- No editor de estilos custom (eso es "Personalizar a mano", ya existe).

## Criterio de aceptación

- Cada uno de los 3 estilos nuevos tiene ≥1 firma visual propia y repetible,
  visible en `/mi` y `/panel` sin abrir ajustes.
- El preview de `/panel/ajustes` comunica esa firma (no solo swatches).
- `REGLAS_UI_EMIL.md` §17 documenta la firma de los 5 estilos.
- Contraste: las 3 paletas (retocadas o no) siguen pasando
  `chequearBloqueos()` + `chequearContraste()` sin excepción manual.
- `prefers-reduced-motion`: sin movimiento en ninguno.
- Mobile 375px: sin overflow, texto legible. Typecheck limpio.
