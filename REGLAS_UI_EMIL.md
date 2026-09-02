# Reglas de UI - Estilo Emil Kowalski (Mobile-First)

> **Contexto**: App de gestión de gimnasios, principalmente usada en móviles.
> Estas reglas aseguran coherencia visual, performance táctil y cero regresiones.
> **Antes de tocar UI**: leer este archivo + pasar por la skill `emil-design-eng`.

---

## 1. Sistema de tokens CSS (NO inventar valores)

### Colores dinámicos (tema personalizable)
```
--paper      → fondo general
--paper-2    → tarjetas, barras
--ink        → texto principal
--ink-soft   → texto secundario
--rule       → bordes
--volt       → acento (botones, badges)
--volt-ink   → texto sobre acento
```

### Colores fijos (semánticos)
```
--danger: #c1362f   → errores, vencido
--warn: #b9791a     → advertencias
--ok: #2f7d4f       → éxito
```

### ❌ PROHIBIDO
- `bg-white` / `bg-black` → usar tokens (`bg-paper`, `bg-paper-2`)
- `text-gray-500` → usar `text-ink-soft`
- Hex literales en className

### ✅ Permitido
- Opacidades: `bg-paper/70`, `text-ink/40`
- Hover: `hover:bg-paper-2`

---

## 2. Tipografía

### Familias
```
font-display  → títulos, números héroe
font-sans     → cuerpo, UI (default)
```

### Escala de tamaños (mobile-first)
```
text-[11px]   → kickers uppercase + tracking-[0.08em]
text-xs       → timestamps
text-[13px]   → labels campos
text-sm       → texto compacto
text-[15px]   → cuerpo legible
text-base     → botones CTA
text-lg       → subtítulos
text-xl       → nombres destacados
text-2xl      → números importantes

text-[clamp(4rem,22vw,7rem)]  → héroe dashboard
```

### Interlineado (alineación vertical del texto)
```
leading-tight  → títulos de card / nombres (1-2 líneas)
leading-snug   → descripciones, párrafos cortos
leading-normal → cuerpo largo
```

### ❌ PROHIBIDO
- Inventar tamaños arbitrarios
- `font-bold` (usar font-display con weight default)

---

## 3. Espaciado y dimensiones

### Targets táctiles (WCAG móvil)
```
h-11 / h-12     → inputs, botones principales (44-48px)
h-9 / h-10      → botones secundarios (36-40px)
h-8 + px-2.5    → acción terciaria dentro de una card (mínimo tappable)
size-9          → botón-icono (cerrar, más opciones)
min-w-[3.5rem]  → botón toggle (56px mínimo)
```
Nada interactivo por debajo de 32px de alto. Un link de texto suelto NO es un
target: envolverlo en un `<button>`/`<Link>` con padding.

### Padding y gap
```
px-3, py-2   → campos compactos
px-4, py-3   → botones principales
px-4, py-4   → filas de lista
px-5, py-4   → cards grandes
gap-2        → íconos + texto
gap-3        → imagen + bloque de texto / elementos relacionados
gap-4        → campos de formulario
```

### Ancho y límites (contra desbordes)
```
max-w-md mx-auto   → pantallas de cliente (una columna)
max-w-lg / max-w-xl → paneles densos del dueño
max-w-sm           → modales / overlays
```
- `main` en mobile: **mínimo `px-5`** de padding lateral (`px-5 py-6`), nunca
  contenido pegado al borde.
- Prohibido ancho fijo en px mayor a ~320. Usar `w-full`, `max-w-*`, `flex-1`.
- Todo hijo de flex/grid que contenga texto que deba envolver o truncar lleva
  **`min-w-0`** (sin esto el texto empuja y rompe el ancho de la pantalla).

### Border radius
```
rounded-[5px]   → inputs, botones, selects (STANDARD)
rounded-[6px]   → cards, listas
rounded-[8px]   → miniaturas de imagen
rounded-[14px]  → modales / hojas inferiores
rounded-lg      → inputs login (h-12)
rounded-full    → badges, pills, avatares
```

---

## 4. Bordes y superficies

- Hairline **siempre** `border border-rule` (1px). `border-2` solo para estado
  activo/seleccionado (`peer-checked:border-ink`).
- Card: `border border-rule rounded-[6px] bg-paper-2`.
- Input / select: `border border-rule rounded-[5px] bg-paper` (**`bg-paper`, no
  `bg-white`**).
- Foco de input: subir contraste del borde → `focus:border-ink` (no ring en
  inputs; el ring se reserva para `focus-visible` de botones/links).
- Lista: `<ul>` con `divide-y divide-rule` **y `overflow-hidden`** para que el
  redondeo recorte la primera y última fila.
- Separador de sección: `border-t border-rule pt-4`.
- Card que contiene imagen: `overflow-hidden` para recortar la imagen al radio.

---

## 5. Imágenes y media (⚠️ causa de regresión conocida)

> **Bug histórico (2026-09-02)**: faltaba el reset `img { max-width:100%;
> height:auto }` en `globals.css`. Una `<img>` con fuente grande y `shrink-0`
> dentro de un flex empujaba el texto fuera de la pantalla en 375px. Ya está el
> reset global, pero **igual aplicar estas reglas siempre**:

### Reglas
- Toda `<img>` va **dentro de un contenedor de tamaño fijo**: `size-[72px]`,
  `aspect-square`/`aspect-video` + `w-full`, etc. Nunca una `<img>` suelta
  definiendo el tamaño del layout.
- La imagen dentro del contenedor: `h-full w-full object-contain` (dibujos /
  siluetas) u `object-cover` (fotos de fondo).
- En filas `flex`: el contenedor de la imagen lleva **`shrink-0`** y el bloque
  de texto **`min-w-0 flex-1`**.
- `loading="lazy"` + `decoding="async"` salvo que esté en el primer viewport.
- `alt` siempre: descriptivo, o `alt=""` si es puramente decorativa.
- **Fallback obligatorio**: `onError` → estado que renderiza un glifo/placeholder
  **del mismo tamaño** que la imagen (no colapsar la caja).
- Miniatura de contenido (ejercicio, avatar): caja 56-80px, `rounded-[8px]`,
  `bg-paper-2`, `overflow-hidden`.
- Imágenes externas (free-exercise-db, etc.): `<img>` plano, **no `next/image`**
  (evita configurar `remotePatterns`). El reset global las contiene.
- Animar cuadros (pseudo-GIF): alternar `src` con `setInterval`; respetar
  `prefers-reduced-motion` (no animar si el usuario lo pide).

### Ejemplo — miniatura con fallback
```jsx
url && !err ? (
  <div className="size-[72px] shrink-0 overflow-hidden rounded-[8px] border border-rule bg-paper-2">
    <img
      src={src} alt="" loading="lazy" decoding="async"
      onError={() => setErr(true)}
      className="h-full w-full object-contain"
    />
  </div>
) : (
  <div className="grid size-[72px] shrink-0 place-items-center rounded-[8px] border border-rule bg-paper-2 text-ink-soft">
    <Glifo className="size-6" />
  </div>
)
```

### Logo del gimnasio (branding dinámico)
- El logo (`gimnasios.logo_url`, puede ser `null`) siempre va en **caja de
  tamaño fijo** con `object-contain` — nunca `object-cover` (recortaría un
  isotipo). Tamaños por contexto: `size-9` sidebar `/panel`, `size-7` topbar
  móvil, `size-8` header `/mi`, `size-4` avatar inline en mensajes.
- Caja: `overflow-hidden rounded-[6px] border border-rule bg-paper-2`
  (`rounded-full` sólo para el avatar de mensajes). `shrink-0` en filas flex;
  el bloque de texto al lado `min-w-0` + `truncate`.
- `null` ⇒ **no** renderizar la caja: caer al nombre en texto / ícono genérico.
  Ninguna pantalla debe cambiar de layout por tener o no logo.
- Es imagen de terceros servida desde Storage: `<img>` plano (no `next/image`),
  `alt=""` si va acompañado del nombre, `decoding="async"` + `loading="lazy"`
  fuera del primer viewport.
- Subida: comprimir **en el navegador** a WebP ≤512² y <300 KB antes de tocar
  Storage (`src/lib/logo/comprimir.ts`). Nunca subir el archivo crudo.

---

## 6. Alineación

- Filas `imagen + texto` de 2+ líneas: `items-start` (no `items-center`).
- Iconos junto a texto: `inline-flex items-center gap-2` y `shrink-0` en el icono.
- Valores numéricos en inputs cortos (series, reps): `text-center`.
- Título + acción en la misma fila: `flex items-start justify-between gap-2`,
  el título en `min-w-0` y la acción en `shrink-0`.
- Truncado explícito: `truncate` (1 línea) o `line-clamp-2` (2 líneas). Nunca
  dejar una cadena larga (nombre, email) sin límite.
- Contenido centrado en pantalla: `mx-auto` sobre el `max-w-*`, no `margin` a mano.

---

## 7. Desbordes / overflow (probar a 375px)

- El `body` **nunca** scrollea horizontal.
- Contenido intrínsecamente ancho (tabla, bloque de código, fila de chips que no
  envuelve, diagrama): envolver en su propio `overflow-x-auto`.
- `min-w-0` en el hijo flex con texto = regla de oro contra "texto empujado
  fuera de pantalla".
- `overflow-hidden` en la card con imagen y en el `<ul>` con `divide-y`.
- Checklist: abrir a 375px y confirmar cero scroll horizontal.

---

## 8. Animaciones

### Timing (usar SIEMPRE)
```
[transition-timing-function:var(--ease-out)]
duration-150   → hover, active, press
duration-200   → inputs (border/box-shadow)
duration-350   → apariciones
```
- Transicionar **propiedades concretas** (`transition-[transform,background-color]`),
  nunca `transition-all`.
- Entrada/salida: `ease-out`. Movimiento en pantalla: `ease-in-out`. Nunca
  `ease-in` en UI.
- Nada de animación en acciones repetidas 100+ veces/día (atajos de teclado,
  toggles de nav).

### Clases predefinidas
```
.animate-rise      → entrada suave (login)
.animate-fade-in   → aparición de paneles / overlays
.animate-error     → error snappy
.stagger           → entrada escalonada (hasta 6 hijos)
.spin-fast         → spinner de botón
```

### Feedback táctil (OBLIGATORIO)
```
active:scale-95        → botones secundarios, chips, miniaturas
active:scale-[0.97]    → botones primarios
active:scale-90        → botón-icono chico
active:bg-paper        → filas de lista
```

---

## 9. Overlays / modales

```jsx
<div
  role="dialog" aria-modal="true" aria-label={titulo}
  onClick={onClose}
  className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/60 p-4 animate-fade-in"
>
  <div
    onClick={(e) => e.stopPropagation()}
    className="w-full max-w-sm rounded-[14px] border border-rule bg-paper p-4 shadow-xl"
  >
    {/* contenido */}
  </div>
</div>
```
- Cerrar por: click en backdrop **+** tecla `Escape` **+** botón X (`size-9`).
- Bloquear scroll del body mientras está abierto
  (`document.body.style.overflow = "hidden"` y restaurar al desmontar).
- En mobile entra desde abajo (`items-end`), en `sm+` centrado.
- El contenido interno usa las mismas reglas de imagen/overflow (`aspect-square`
  + `object-contain` para la imagen grande).

---

## 10. z-index (escala fija, no inventar)

```
z-10   → sticky header / barra de sección
z-40   → nav fija (bottom/top)
z-50   → overlays, modales, toasts
```

---

## 11. Accesibilidad (no negociable)

### ✅ HACER
- `<button>` para acciones (NO `<div onClick>`)
- `<Link>` para navegación
- `<label>` asociado con `<input>` siempre
- Jerarquía h1 → h2 → h3 correcta (no saltear niveles)

### Focus visible
```
focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-ink/20
```

### ARIA (con moderación)
```jsx
<button aria-pressed={active}>Toggle</button>
<button aria-label="Cerrar"><span aria-hidden>{icon}</span></button>
<div role="alert">{error}</div>
```

### ❌ PROHIBIDO
- `<div onClick>` sin role + tabindex + onKeyDown
- `outline: none` sin alternativa visible
- Iconos sin texto/aria-label
- Imagen sin `alt`

---

## 12. Componentes estándar

### Input con label
```jsx
<label className="block">
  <span className="block text-[13px] font-medium text-ink-soft mb-1.5">
    Label
  </span>
  <input
    className="w-full h-11 px-3 rounded-[5px] border border-rule bg-paper text-[16px] outline-none transition-[border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] focus:border-ink"
  />
</label>
```

### Botón con spinner
```jsx
<Button disabled={pending}>
  {pending ? (
    <>
      <span className="size-4 rounded-full border-2 border-paper/30 border-t-paper spin-fast" />
      Guardando…
    </>
  ) : "Guardar"}
</Button>
```

### Lista con separadores
```jsx
<ul className="overflow-hidden rounded-[6px] border border-rule bg-paper-2 divide-y divide-rule">
  {items.map(item => (
    <li key={item.id}>
      <Link
        href={`/ruta/${item.id}`}
        className="block px-4 py-4 transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper active:bg-paper"
      >
        {item.nombre}
      </Link>
    </li>
  ))}
</ul>
```

### Fila con miniatura + texto + acción
```jsx
<li className="p-4">
  <div className="flex gap-3">
    <ExThumb ej={ej} />                     {/* size-[72px] shrink-0 */}
    <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium leading-tight min-w-0">{ej.nombre}</p>
        <button className="shrink-0 h-8 px-2.5 ...">Acción</button>
      </div>
      {/* meta, campos, etc. */}
    </div>
  </div>
</li>
```

---

## 13. Layouts móviles

### Grid mobile-first
```jsx
<div className="grid sm:grid-cols-2 gap-4">
  {/* campos */}
</div>
```

### Navegación bottom
```jsx
<nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex border-t border-rule bg-paper">
  {NAV.map(item => (
    <Link className="relative flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] active:scale-95 transition-transform duration-150 [transition-timing-function:var(--ease-out)]">
      <span className={`absolute top-0 h-0.5 w-8 rounded-full ${active ? "bg-volt" : "bg-transparent"}`} />
      {item.label}
    </Link>
  ))}
</nav>
```

### Número héroe (jerarquía)
```jsx
<div className="mb-10">
  <p className="font-display leading-[0.82] tracking-tight text-[clamp(4rem,22vw,7rem)] text-danger">
    3
  </p>
  <p className="mt-2 text-base text-ink-soft">por vencer</p>
</div>
```

---

## 14. Checklist pre-commit

- [ ] Solo tokens CSS (sin `bg-white`, sin hex, sin `text-gray-*`)
- [ ] Inputs con `text-[16px]` y `bg-paper`
- [ ] Toda `<img>` en contenedor de tamaño fijo + `object-contain/cover` + `alt` + fallback `onError`
- [ ] Hijos flex con texto llevan `min-w-0`; imagen lleva `shrink-0`
- [ ] Botones/links/chips con `active:scale-*`
- [ ] Transiciones con propiedad concreta + `var(--ease-out)` (nunca `transition-all`)
- [ ] Interactivos con `focus-visible:ring-2 ring-ink/20`
- [ ] Nada tappable < 32px de alto; links de texto envueltos en botón con padding
- [ ] Modales: Escape + backdrop + X, scroll de body bloqueado, `z-50`
- [ ] Sin `<div onClick>`; iconos con `aria-label`
- [ ] **Probado a 375px: cero scroll horizontal**

---

## 15. Archivos de referencia

```
src/app/globals.css              → tokens, reset img, animaciones
src/lib/tema.ts                  → DEFAULT_TEMA
src/components/ui.tsx            → Button, Field
src/app/login/page.tsx          → mobile-first completo
src/app/panel/page.tsx          → número héroe
src/app/panel/ajustes/*         → validación contraste
src/app/mi/rutina/rutina-editor.tsx → miniatura + fallback + visor modal
src/lib/logo/comprimir.ts        → compresión canvas → WebP <300 KB
src/lib/logo/paleta.ts           → color dominante + paletas sugeridas
src/app/panel/ajustes/logo-uploader.tsx → subida + caja fija + fallback
```

---

## 16. Filosofía Emil Kowalski

- No UI genérica / templates
- Jerarquía clara: 1 elemento dominante por pantalla
- Físico > abstracto
- Animaciones con propósito (nunca "porque queda lindo" en algo frecuente)
- Mobile-first, táctil por defecto

---

**Última actualización**: 2026-09-02 (secciones 4-10 nuevas: bordes, imágenes,
alineación, overflow, overlays, z-index — tras el bug de imágenes que rompían
el layout en `/mi/rutina`; §5 subsección "Logo del gimnasio" tras el SPEC de
logo + paletas).
**Aplicar al editar**: `src/app/` y `src/components/`.

**Crítico:** `text-[16px]` en inputs evita el zoom en iOS.
