# SPEC — Panel avanzado del generador de rutinas

> Para Claude Code. Referencias: `contex-sysgym.md`, `src/lib/rutina/motor.ts`,
> `src/lib/rutina/tipos.ts`, `SPEC_PANEL_AVANZADO_RUTINA.md` (modo manual, ya
> hecho). **No romper el flujo actual**: si el cliente no toca nada de este
> panel, `generarPlan()` devuelve exactamente lo mismo que hoy.

## Objetivo

Un cliente de **nivel avanzado** puede afinar la generación automática con
criterio de entrenador: elegir el split, el rango de reps / esquema de
progresión, el volumen semanal objetivo, el esfuerzo (RIR) y aplicar técnicas
de intensidad a los aislamientos. Cada opción muestra **de dónde sale la teoría**
(fuente citada, resumen de una línea).

## 1) Gating y entrada

- Solo visible si `cliente.nivel === "avanzado"` (el nivel ya se elige en
  `generar-form.tsx`). Para el resto, ni aparece el link.
- Ruta nueva: `src/app/mi/rutina/avanzado/` (`page.tsx` + `avanzado-form.tsx`
  cliente). Si entra un no-avanzado → `redirect("/mi/rutina")`.
- En `/mi/rutina`, debajo del form normal y del link al modo manual, un link
  chico: **"Modo avanzado — afinar el plan"**. Nunca es el flujo por default.
- El modo avanzado **usa el motor** (a diferencia del modo manual, que lo
  saltea). Es el mismo `generarPlan()` con más entrada.

## 2) Controles del panel

Cada control lleva un `<details>` "¿por qué?" con `titulo` + `resumen` +
`fuente` sacados de `src/lib/rutina/teoria.ts` (constante nueva, un objeto por
clave, único lugar donde viven las citas — se reusa en la vista del dueño).

### 2.1 Split explícito
`split: "auto" | "full_body" | "upper_lower" | "push_pull_legs" | "torso_pierna"`
- `auto` (default): el comportamiento actual (`splitPorDias`).
- El resto fuerza la secuencia de bloques, validando días:
  - `full_body`: 2–4 días.
  - `upper_lower`: 2–6 días (pares; impar = termina en Upper).
  - `push_pull_legs`: 3 o 6 días (con 3 = 1 vuelta; con 6 = 2 vueltas).
  - `torso_pierna`: 4 días.
- Si la combinación días/split no cierra, el form lo bloquea y sugiere los días
  correctos (no genera un plan inválido).
- **Teoría** (`teoria.frecuencia`): entrenar cada grupo **2×/semana** rinde más
  que 1× a volumen igualado. Fuente: Schoenfeld, Ogborn & Krieger, *Sports
  Medicine* 2016 (meta-análisis de frecuencia).

### 2.2 Esquema de repeticiones
`rango: "estandar" | "fuerza_hipertrofia" | "hipertrofia" | "metabolico" | "ondulante"`
- `estandar` (default): usa `ESQUEMA[objetivo]` como hoy.
- `fuerza_hipertrofia`: primario 6–8, resto 8–10.
- `hipertrofia`: primario 8–10, secundario 10–12, aislam. 12–15.
- `metabolico`: 12–20 en todo, descanso corto.
- `ondulante` (DUP): varía por día dentro de la semana — día 1 pesado (5–6),
  día 2 medio (8–10), día 3 liviano (12–15), y repite.
  **Teoría** (`teoria.dup`): la periodización ondulante diaria iguala o supera a
  la lineal en fuerza e hipertrofia en entrenados. Fuente: Rhea et al.,
  *J. Strength Cond. Res.* 2002.
- Todos los rangos deben salir de `REPS_OPCIONES` (menús del editor).

### 2.3 Volumen semanal objetivo por grupo
`volumen: "mev" | "estandar" | "mav"` → ~10 / ~14 / ~18–20 series semanales por
grupo trabajado.
- Sube/baja el tope de ranuras extra que hoy fija `aplicarEnfasis()` (hardcode 3)
  y cuántos aislamientos entran por día (hoy tope 8).
- **Teoría** (`teoria.volumen`): relación dosis-respuesta — >10 series
  semanales por grupo produce más hipertrofia que <10; el beneficio sigue
  subiendo hasta ~20 con rendimientos decrecientes. Fuente: Schoenfeld et al.,
  *J. Sports Sci.* 2017 (dosis-respuesta) + Baz-Valle et al. 2022.

### 2.4 Esfuerzo (RIR)
`rir: "2-3" | "1-2" | "0-1"` (reps en reserva objetivo).
- No cambia series/reps: agrega una nota por ítem ("Dejá 1–2 reps en reserva").
- Compuestos primarios nunca al fallo salvo `rir: "0-1"` explícito.
- **Teoría** (`teoria.rir`): llegar al fallo no es necesario para hipertrofia
  con volumen igualado y agrega fatiga y tiempo de recuperación, sobre todo en
  compuestos. Fuente: Grgic et al., *Sports Medicine* 2022 (meta-análisis
  fallo vs. no fallo).

### 2.5 Técnicas de intensidad en aislamientos
`tecnicaAislamientos: Tecnica` (reusa el catálogo `TECNICAS` / `TECNICA_DESC` de
`tipos.ts` y la columna `rutina_items.tecnica` de la migración 0010).
- Se aplica **solo a la última serie del último 1–2 aislamientos de cada día**.
  Nunca a compuestos.
- **Teoría** (`teoria.tecnicas`): dropset / rest-pause rinden similar a series
  rectas a volumen igualado, pero en menos tiempo; suben la fatiga → reservarlas
  para accesorios y series finales. Fuente: Fink et al. 2018 (dropsets);
  Enes et al., *JSCR* 2021 (rest-pause).

### 2.6 Orden de ejercicios
`orden: "compuestos_primero" | "prefatiga_zona"`
- `compuestos_primero` (default): como hoy.
- `prefatiga_zona`: para la(s) zona(s) de énfasis, el aislamiento va antes del
  compuesto de esa zona.
- **Teoría** (`teoria.orden`): los primeros ejercicios de la sesión reciben más
  volumen efectivo y ganancia; ordenar por prioridad. Fuente: Simão et al.,
  *Sports Medicine* 2012 (revisión de orden de ejercicios).

## 3) Datos

- `EntradaMotor` gana `avanzado?: OpcionesAvanzadas` (opcional; `undefined` =
  comportamiento actual). Tipo nuevo en `tipos.ts`.
- Se persiste dentro de `rutinas.preferencias` (jsonb, sin migración) bajo la
  clave `avanzado`.
- `rutina_items.tecnica` ya existe (migración 0010) — el motor la completa.
- RIR / tempo van en el string `nota` del ítem (sin migración). Si más adelante
  se quiere filtrar por eso, migración aparte.
- Defaults se releen de `rutinas.preferencias` en `mi/rutina/page.tsx`,
  `mi/rutina/avanzado/page.tsx` y `panel/clientes/[id]/page.tsx`.

## 4) Motor (`motor.ts`) — cambios, todos backwards-compatible

1. `EntradaMotor.avanzado` opcional. Si `undefined` → todo igual que hoy.
2. `splitPorDias()`: si `avanzado.split && split !== "auto"` y nivel avanzado,
   derivar de un `splitExplicito(split, dias)` nuevo (reusa los arrays `PUSH` /
   `PULL` / `LEGS` / `TORSO` / `PIERNA` / `FULL_BODY_*` que ya existen).
3. Resolución del esquema series/reps: envolver `ESQUEMA[objetivo]` en
   `resolverEsquema(objetivo, avanzado, diaIdx)` que aplica `rango` (incluido el
   caso ondulante que depende del índice de día).
4. `aplicarEnfasis()`: el tope `3` y el `8` pasan a derivarse de
   `avanzado.volumen` (con los valores actuales como default `estandar`).
5. Post-proceso por día: setear `tecnica` en la última serie de los últimos
   aislamientos según `avanzado.tecnicaAislamientos`; anexar RIR a `nota`.
6. `orden === "prefatiga_zona"`: reordenar dentro de `priorizarEnfasis()`.
7. Typecheck limpio, sin regresiones en la salida cuando `avanzado` no viene.

## 5) Vista del dueño (`panel/clientes/[id]/rutina-panel.tsx`)

- Bloque resumen arriba de la rutina: split usado, rango, volumen, RIR,
  técnica de aislamientos — como chips.
- Por ítem, si tiene `tecnica`, mostrarla al lado del ejercicio (mismo patrón
  visual que nota/descanso). Esto ya lo pedía `SPEC_PANEL_AVANZADO_RUTINA.md`
  §4 — verificar si quedó hecho y, si no, cerrarlo acá.

## 6) `src/lib/rutina/teoria.ts` (archivo nuevo)

```ts
export type Teoria = { titulo: string; resumen: string; fuente: string };
export const TEORIA = {
  frecuencia: { … },
  dup: { … },
  volumen: { … },
  rir: { … },
  tecnicas: { … },
  orden: { … },
} satisfies Record<string, Teoria>;
```

Único lugar con las citas. Lo consume el form avanzado (`<details>` por control)
y el panel del dueño (tooltip "¿por qué está armada así?").

## 7) Funciones extra — CONFIRMADO: entran estas dos, el resto queda fuera

### 7.1 "Explicame esta rutina"
Bloque colapsable en `/mi/rutina` y en la vista del dueño. Texto por reglas (sin
IA): un párrafo por día armado desde `PlanGenerado` + `EntradaMotor` + `TEORIA`.
Ej.: "Empezás con press de banca (5 series de 8 a 10) porque es el básico de
empuje y conviene hacerlo con más energía; después van accesorios de hombro y
tríceps con más repeticiones para acumular volumen." Archivo nuevo
`src/lib/rutina/explicar.ts` → `explicarPlan(plan, entrada): string[]` (un
string por día) + `explicarGeneral(entrada): string` (por qué ese split / rango).

### 7.2 Sustitución por molestia
- `OpcionesAvanzadas.evitar: Molestia[]` con `Molestia =
  "hombro" | "rodilla" | "lumbar" | "muñeca" | "codo"` (constante `MOLESTIAS`
  en `tipos.ts` con label).
- En el motor, `evitar` recorta candidatos en `elegir()`: mapa
  `MOLESTIA_BLOQUEA` de molestia → lista de `{ patron?, equipo? }` a descartar
  (p. ej. `hombro` → `empuje_vertical` con `barra`, aperturas pesadas;
  `lumbar` → peso muerto con barra desde el piso, buenos días; `rodilla` →
  sentadilla profunda con barra, extensiones a full ROM; etc.). Si tras el
  recorte no queda ningún candidato para la ranura, se ignora el filtro para
  ese hueco (mejor un ejercicio subóptimo que un día con un ejercicio menos) y
  se anota en `nota`.
- Selector de molestias en el form avanzado (chips, multi, opcional).
- También accesible desde el editor (`rutina-editor.tsx`): junto a "no conozco
  este ejercicio, cambialo", un "me molesta al hacerlo" que reusa
  `ejerciciosSimilares()` filtrando por el mismo mapa.
- **Teoría** (`teoria.molestia`): ante dolor articular, sustituir el patrón por
  una variante que respete el rango sin dolor mantiene el estímulo del grupo
  sin forzar la articulación (principio de "entrenar alrededor del dolor",
  consenso de rehab de fuerza; p. ej. Rio et al. 2015 sobre carga isométrica y
  dolor tendinoso).

### 7.3 Fuera de alcance (por ahora)
PDF / imprimible, historial de rutinas (requiere que `rutinas` deje de ser 1
por cliente), autorregulación por RPE.

## 8) Legibilidad y enfoque femenino (sirve para todo el apartado de rutina, no solo el panel avanzado)

### 8.1 Sesgo de selección por sexo — AUTOMÁTICO
Decisión: si el registro tiene `sexo === "mujer"` (viene de `clientes.sexo` /
lo que se cargó en el alta o el cuestionario), el sesgo se aplica solo. No hay
toggle.

- Función nueva en `motor.ts`: `sesgoSexo(ej, ranura, sexo)`, empujón chico
  (±6, mismo orden que `sesgoObjetivo`), sumado dentro de `puntuar()`.
- Para `mujer`:
  - +6 a movimientos de cadera/glúteo e isquios en cualquier rol: hip thrust,
    puente, patada en polea, abducción, peso muerto rumano, zancada, búlgara.
  - +4 a polea / máquina en `secundario` y `aislamiento` (dosificación fácil,
    tensión constante).
  - En el primario del día de empuje, no penaliza barra pero iguala mancuerna /
    máquina (deja de ganar la barra por `EQUIPO_PESO`).
- Es **sesgo, no filtro**: nada queda prohibido. Un hombre con énfasis en
  glúteos recibe exactamente lo mismo vía `enfasis`, sin pasar por `sesgoSexo`.
- El ajuste de **volumen** por sexo que ya existe (`ajustarSeries`: −1 set en
  no-aislamientos; default glúteos si no eligió zona) se mantiene igual.
- **Requisito de datos (tarea de seed, aparte):** verificar que `ejercicios`
  tenga masa suficiente de `grupo_muscular` `gluteos` / `isquios` con `patron`
  correcto (`dominante_cadera`, aislamiento). Si el catálogo está flaco, el
  default "mujer → glúteos" genera planes repetitivos. Listar los que falten.

### 8.2 "Tonificar / marcar" — 5º objetivo
Decisión: entra como objetivo propio, no como texto de ayuda.

- `tipos.ts`: agregar `"tonificar"` a `OBJETIVOS` y a `OBJETIVO_LABEL`
  ("Tonificar / marcar").
- `motor.ts` `ESQUEMA`: entrada nueva. Mapea a hipertrofia con accesorios en
  reps más altas y descanso corto:
  `primario { 3, "10–12" }`, `secundario { 3, "12–15" }`,
  `aislamiento { 3, "15" }`, `descanso "Descanso 45–60 s"`.
- `motor.ts` `sesgoObjetivo`: case `"tonificar"` — como hipertrofia (mancuerna /
  máquina / polea en secundarios y aislados) + leve preferencia por compuestos
  de pie / unilaterales.
- `moldearPorObjetivo`: tratar `tonificar` como `resistencia`/`bajar_grasa`
  para el cierre de core.
- Revisar todos los `switch (objetivo)` / `Record<Objetivo, …>` para que no
  queden ramas sin cubrir (typecheck los va a marcar).
- Forms (`generar-form.tsx`, alta del dueño): la opción nueva en el `<select>`
  de objetivo. Copy: "Tonificar / marcar — bajar algo de grasa y dar forma sin
  buscar volumen".

### 8.3 Vista del cliente entendible a primera vista (`/mi/rutina`)
Aplica a toda la pantalla, no depende del sexo.

- Nunca mostrar la jerga interna del motor (`patron`: "empuje_horizontal",
  "dominante_cadera", etc.). Solo: nombre del ejercicio + foto + músculo en
  palabra simple.
- Prescripción en texto claro: `"5 series · 8 a 10 repeticiones"` en vez de
  `"5×8–10"`. Un `<details>` "¿qué es una serie?" la primera vez (flag en
  localStorage, mismo patrón que el tutorial).
- Encabezado por día: `"Hoy: piernas y glúteos · 6 ejercicios · ~50 min"`
  (estimación de tiempo = Σ series × (descanso + ~40 s) redondeado).
- Agrupar el día: sección *Básicos* (roles primario/secundario) y *Accesorios*
  (aislamiento). Descanso como chip con icono de reloj.
- Mini-mapa corporal (icono SVG inline) marcando el músculo de cada ejercicio;
  cae a una etiqueta de texto si no hay icono para ese grupo.
- Pasa por la skill `emil-design-eng` y `REGLAS_UI_EMIL.md` (mobile-first, una
  columna, sin hover).

## No-goals

- Sin IA en el motor (sigue siendo reglas puras).
- No cambiar el generador básico ni el modo manual.
- No exponer el panel a clientes no-avanzados.
- No prometer periodización de varias semanas mientras la app guarde 1 sola
  rutina por cliente (el historial es requisito para eso).

## Criterio de aceptación

- Un cliente avanzado elige split PPL en 6 días + rango ondulante + dropset en
  aislamientos + volumen MAV, genera, y el plan refleja las 4 cosas.
- Cada control tiene su "¿por qué?" con fuente citada, tomada de `teoria.ts`.
- El dueño ve la config avanzada y las técnicas por ejercicio.
- Con `avanzado` sin setear, la salida de `generarPlan()` es byte-idéntica a la
  de antes (test de no-regresión).
- Con `sexo === "mujer"` y sin nada más, el plan mete más trabajo de cadera /
  glúteo / isquios que el mismo pedido con `sexo === "hombre"`, sin excluir
  ningún ejercicio.
- "Tonificar" aparece como objetivo y genera un plan con más reps y menos
  descanso que "Masa muscular"; ningún `switch (objetivo)` queda sin rama.
- En `/mi/rutina` no aparece jerga de `patron`; la prescripción se lee en
  palabras y cada día muestra músculos + cantidad + tiempo estimado.
