# SPEC — Pase de UI (Emil) sobre /mi (home) y el form de generar rutina

> Para pasarle a Claude Code. No es un rediseño: es aplicar `REGLAS_UI_EMIL.md`
> a las dos pantallas que quedaron afuera del pase anterior (ver
> `contex-sysgym.md` → estado del entregable "Rediseño UI mobile-first").
> Pasar por la skill `emil-design-eng` antes de tocar estos archivos.

## Contexto

Comparando la app actual contra la referencia de estilo aprobada
(mockup "SysGym — propuesta de UI mobile-first"), el sistema de diseño
ya está definido en `REGLAS_UI_EMIL.md` (tokens `--volt`, `--danger`,
`--warn`, `--ok`, radios 5/6/8/14px, reglas de lista). El problema es
que `/mi` (home del cliente) y el formulario de generar/regenerar rutina
no pasaron ese sistema todavía. Este spec es la lista puntual de lo que
falta, no un diseño nuevo.

## 1) Selects nativos sin estilizar (formulario de rutina)

Los `<select>` de Objetivo / Días / Nivel / Sexo / Equipamiento están
renderizando el control nativo del sistema operativo (fuente grande,
flecha genérica, ignora `rounded-[5px] border-rule bg-paper`).

Fix: agregar `appearance-none` + ícono de flecha custom (SVG chevron,
posicionado absoluto) al componente de select compartido. Si no existe
un componente de select reusable, crear uno en vez de repetir la
solución en cada `<select>` suelto.

## 2) Color de marca pisado por negro/neutro

- Botón "Regenerar rutina": hoy sólido negro/neutro. Debe usar `--volt`
  (el acento del tema del gimnasio — el mismo que ahora puede salir del
  logo, ver `SPEC_LOGO_COLORES.md`).
- Chips de "Zona a enfocar" en estado seleccionado: hoy negro/azul
  marino sólido. Debe usar `--volt` de fondo y `--volt-ink` de texto
  (mismo patrón de token que ya usan otros botones primarios de la app).

Esto es importante porque si el dueño personalizó su paleta (o la sacó
del logo), un negro fijo rompe esa identidad visual en la pantalla más
usada por el cliente.

## 3) Falta iconografía en filas de lista

En `/mi`, las filas "Mensajes del gimnasio" y "Tu rutina" son texto
plano + link "ver", sin ícono. Agregar un ícono chico a la izquierda de
cada fila (usar la lib de íconos que ya esté en el proyecto — revisar
si hay una instalada antes de sumar una nueva dependencia).

## 4) Filas sueltas en vez de lista agrupada

Regla existente: `<ul>` con `divide-y divide-rule` + `overflow-hidden`.
Hoy "Mensajes" y "Tu rutina" son dos cards separadas con borde propio
cada una. Agruparlas en una sola lista con divisor interno, según la
regla de sección 4 de `REGLAS_UI_EMIL.md`.

## 5) Bottom nav en /mi home

Confirmar si `/mi` ya tiene navegación inferior persistente (Inicio ·
Rutina · Mensajes · Perfil) en el resto de la app. Si `/mi/page.tsx` no
la incluye, agregarla ahí también — tiene que estar en todas las
pantallas de cliente, no solo algunas.

## 6) Pendiente ya anotado: campo Sexo condicional

Aprovechar este mismo pase para resolver lo que quedó pendiente: el
`<select>` de "Sexo" en `generar-form.tsx` solo debe mostrarse si
`cliente.sexo` viene cargado desde el alta del dueño en panel. Si es
null/undefined, no renderizar el select y pasar `sexo: "sin_especificar"`
al motor por default (ver `tipos.ts` → `SEXOS`/`SEXO_LABEL`).

## No-goals

- No es un rediseño de paleta ni de layout — la estructura de
  información se mantiene, solo cambian estilo de componentes.
- No crear tokens nuevos: todo con los que ya existen en
  `REGLAS_UI_EMIL.md` (`--volt`, `--danger`, `--warn`, `--ok`, `--paper`,
  `--paper-2`, `--ink`, `--ink-soft`, `--rule`).

## Criterio de aceptación

- Los selects del form de rutina se ven con el radio/borde del design
  system, no el control nativo del SO.
- Botón "Regenerar rutina" y chips seleccionados usan `--volt`, no un
  color fijo.
- "Mensajes" y "Tu rutina" en `/mi` tienen ícono y están agrupados en
  una sola lista con divisor.
- Bottom nav presente en `/mi` home igual que en el resto de pantallas
  de cliente.
- Campo Sexo no aparece si el cliente no tiene sexo cargado.
- Typecheck limpio, sin tocar los tokens ni la lógica del motor.
