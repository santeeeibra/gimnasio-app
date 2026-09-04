# SPEC — Simulador del motor de rutinas (panel dev)

> Para pasarle directo a Claude Code. Contexto general del proyecto en `contex-sysgym.md`.

## Objetivo

Herramienta de debug para probar el motor de generación de rutinas sin crear
un cliente real. Elegís las mismas variables que en el form real del cliente
(incluido "Modo avanzado"), y ves: (1) la combinación elegida, (2) qué le
suma cada elección al plan, (3) la rutina resultante — las 3 en formato lista.

**Importante**: antes de tocar nada, Claude Code debe leer el estado actual
de `generar-form.tsx` (y el "Modo avanzado" que cuelga de ahí) y de
`src/lib/rutina/tipos.ts` / `motor.ts`, porque el generador real ya tiene más
campos de los documentados en `contex-sysgym.md`. La lista de abajo es la
base confirmada por capturas de pantalla — si en el código hay algo más,
agregarlo también al simulador.

## Ubicación

- Verificar si ya existe `/admin/panel-dev` (según `SPEC_PANEL_DEV.md`). Si
  existe, agregar ahí una sección "Simulador de rutinas". Si no está
  implementado todavía, crear ruta nueva `/admin/simulador-rutina/page.tsx`,
  protegida con `requireSuperadmin()` (mismo gate que el resto de `/admin`).
- No debe ser accesible ni visible para dueños de gimnasio ni clientes.

## UI (client component)

Reusar los mismos componentes/constantes del form real (`generar-form.tsx` +
su bloque "Modo avanzado"), no reinventar los labels. Campos confirmados:

**Básicos**
- Objetivo (con la descripción que ya muestra el form, ej. "Ganar volumen
  muscular. Series medias, repeticiones moderadas.")
- Días por semana
- Nivel (Principiante/Intermedio/Avanzado — elegir "Avanzado" habilita
  "Ajustes avanzados", igual que en el form real)
- Zona a enfocar (chips, máx. 2): Glúteos, Piernas, Pecho, Espalda, Hombros,
  Brazos, Abdomen
- Evitar dolor en / Molestias a evitar (chips): Hombro, Rodilla, Zona lumbar,
  Muñeca, Codo — mismo campo, dos nombres según la pantalla real (alta inicial
  dice "Evitar dolor en", regenerar/cambiar ejercicio dice "Molestias a
  evitar"). En el simulador alcanza con un solo bloque de chips.
- Equipamiento disponible: Gimnasio completo / Mancuernas y peso corporal /
  Solo peso corporal
- Sexo (select simple, siempre visible en el simulador — en el form real es
  condicional según si el cliente ya tiene `sexo` cargado, pero acá conviene
  poder probar los dos casos)

**Ajustes avanzados** (solo se aplican si Nivel = Avanzado, igual que en
producción):
- Estructura (split) — ej. "Empuje / Tracción / Pierna"
- Repeticiones — ej. "Hipertrofia clásica (6–12)"
- Volumen semanal — ej. "Estándar (~14)"
- Esfuerzo — ej. "Exigente"
- Orden de ejercicios — ej. "Compuestos primero (por defecto)"
- Técnica de intensidad en aislamientos — ej. "Sin técnica"

Botón "Generar rutina de prueba" (mejor botón explícito que auto-generar on
change).

## Salida 1 — Combinación elegida (lista)

```
- Objetivo: masa_muscular
- Días: 3
- Nivel: avanzado
- Zona a enfocar: glúteos, piernas
- Evitar dolor en: rodilla
- Equipo: gimnasio completo
- Sexo: mujer
- (avanzado) Estructura: empuje/tracción/pierna
- (avanzado) Repeticiones: hipertrofia clásica (6–12)
- (avanzado) Volumen semanal: estándar (~14)
- (avanzado) Esfuerzo: exigente
- (avanzado) Orden: compuestos primero
- (avanzado) Técnica aislamientos: sin técnica
```

## Salida 2 — Qué le suma cada elección

El form real YA tiene, en cada campo de "Ajustes avanzados", un desplegable
"¿por qué?" con la explicación de qué hace esa opción. **Reusar ese texto/esa
lógica tal cual existe** en vez de escribir explicaciones nuevas — evita
duplicar contenido y que se desincronicen.

Para los campos que no tienen "¿por qué?" en el form real (objetivo, zona a
enfocar, evitar dolor, sexo), agregar trace en `motor.ts`:

- Agregar `debug?: boolean` opcional a `EntradaMotor` (default `false` /
  `undefined` → cero cambio de comportamiento ni de firma para el flujo real).
- Acumular un array `trace: string[]`, devuelto junto con la rutina solo
  cuando `debug === true`.
- Cada función relevante empuja una línea legible cuando hay debug, ej.:
  - `ajustarPorSexo()` → si mujer: `"Sexo mujer: -1 serie en compuestos
    (mín. 3) y aislamientos (mín. 2)"`.
  - `aplicarEnfasis()` → por cada zona elegida: `"Énfasis en glúteos: +hasta
    3 ranuras extra/día (hip thrust, sentadilla búlgara...)"`. Si es mujer y
    no eligió zona: `"Sin zona elegida + mujer: énfasis por defecto en
    glúteos"`.
  - Zona a evitar dolor → por cada zona: `"Evitar rodilla: se sacan/sustituyen
    ejercicios que cargan esa zona"`.
  - `sesgoObjetivo()` → ej. `"Objetivo masa_muscular: prioriza mancuerna/
    máquina, series medias"`.

Este trace es solo para el simulador. `mi/rutina/actions.ts` y
`panel/clientes/actions.ts` (flujo real) NO pasan `debug: true` — quedan
exactamente igual que hoy.

Mostrar como lista única: primero las explicaciones que vienen del "¿por
qué?" existente, después el trace nuevo del motor, en el orden en que se
generó.

## Salida 3 — Rutina resultante (lista)

```
Día 1
- Sentadilla búlgara — 4 series x 8-10 (rol: primario)
- Hip thrust — 3 series x 10-12 (rol: secundario)
...
Día 2
...
```

Reusar el tipo que ya arma `generar.ts` (rutina + `rutina_items`), solo
renderizarlo como lista — no inventar un tipo nuevo.

## Restricciones importantes

- **No debe escribir nada en Supabase.** Server action nueva que llama
  directo al motor (no `generarYGuardar()`), devuelve `{ rutina, trace }` en
  memoria, no toca las tablas `rutinas` / `rutina_items`.
- No debe modificar el comportamiento del motor para clientes reales — la
  firma de `EntradaMotor` se extiende, no se rompe.
- Reusar constantes y textos ya existentes (`tipos.ts`, los "¿por qué?" del
  form real) — no duplicar contenido.

## Archivos a tocar (estimado)

- `src/lib/rutina/motor.ts`: trace opcional, sin romper la firma existente.
- Ruta o sección nueva en el panel dev (según lo que ya exista) + server
  action que llama al motor con `debug: true`.
- Un componente cliente: form (con Ajustes avanzados) + las 3 listas de
  salida.

## Fuera de alcance v1

- Historial de simulaciones (no hace falta guardar nada).
- Cualquier visibilidad fuera de la cuenta superadmin.
