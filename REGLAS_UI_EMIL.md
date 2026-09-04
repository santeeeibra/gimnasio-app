# Reglas de UI - Identidad "Obsidian High-Performance" (Mobile-First)

> **Contexto**: App de gestión de gimnasios (SysGym), principalmente usada en móviles dentro de la sala de pesas.
> Estas reglas aseguran rendimiento atlético premium, performance táctil instantánea, consistencia visual y cero regresiones.
> **Antes de tocar UI**: leer este archivo + verificar el checklist de usabilidad (§21 y §10).

---

## 1. Sistema de tokens CSS (NO inventar valores)

La app cuenta con dos presets oficiales polaridad-conscientes que comparten la misma jerarquía de variables semánticas:

### Tokens Base (Modo Oscuro — Obsidian Core / Default)
```
--paper             → #090d14 (fondo general obsidiana profunda)
--paper-2           → #121722 (tarjetas, barras y contenedores en carbón satinado)
--paper-3           → #1b2232 (superficies elevadas, popovers y modales)
--ink               → #f8fafc (texto principal blanco titanio de ultra-alto contraste)
--ink-soft          → #94a3b8 (texto secundario pizarra técnica)
--rule              → rgba(255, 255, 255, 0.08) (hairline 1px preciso)
--accent            → #10e7a0 (Hyper-Mint / Emerald Glow, foco y energía primaria)
--accent-ink        → #042417 (texto de máximo contraste sobre el acento)
--accent-secondary  → #ff5252 (Coral de alta energía para series activas, récords y badges)
--ring              → rgba(16, 231, 160, 0.35) (color del focus-visible ring)
--scrim             → rgba(4, 7, 12, 0.78) (backdrop de modal con blur)
```

### Tokens Base (Modo Claro — Titanium Daylight / Preset Claro Coherente)
```
--paper             → #f8fafc (fondo general titanio claro)
--paper-2           → #ffffff (tarjetas y superficies puras de alto contraste)
--paper-3           → #f1f5f9 (superficies elevadas y hover)
--ink               → #090d14 (texto principal carbón oscuro)
--ink-soft          → #64748b (texto secundario grafito)
--rule              → #e2e8f0 (hairlines sutiles)
--accent            → #059669 (Emerald deportivo calibrado para contraste WCAG ≥ 4.5)
--accent-ink        → #ffffff (texto blanco sobre acento)
--accent-secondary  → #ef4444 (Coral deportivo)
--ring              → rgba(5, 150, 105, 0.30)
--scrim             → rgba(15, 23, 42, 0.60)
```

### Colores semánticos (re-derivados por tema)
```
--danger      → errores, vencido, alerta máxima (base #ef4444)
--warn        → advertencias, atención          (base #f59e0b)
--ok          → éxito, al día, completado       (base #10b981)
--danger-weak / --danger-strong  → fills y estados hover del rojo
```
`temaToVars()` re-deriva `--danger/--warn/--ok` contra el `--paper` real con piso de contraste 4.0. **Nunca** uses hex fijos en JSX: van siempre por token.

### Capa ambiental (§20)
```
--accent / --accent-contrast / --accent-weak / --accent-strong
--paper-3         → superficie elevada (popover, sheet sobre card)
--scrim           → backdrop de modal
--elev-shadow-sm / --elev-shadow-md
--glow-soft / --glow-strong / --glow-strength   → glow bioluminiscente en acentos
--dur-fast (150ms) / --dur-base (220ms) / --dur-slow (350ms)
--ease-out        → cubic-bezier(0.23, 1, 0.32, 1)
--ease-in-out     → cubic-bezier(0.77, 0, 0.175, 1)
```

### ❌ PROHIBIDO
- `bg-white` / `bg-black` en Tailwind → usar tokens (`bg-paper`, `bg-paper-2`)
- `text-gray-500` → usar `text-ink-soft`
- Hex literales en `className`

### ✅ Permitido
- Opacidades sobre tokens: `bg-paper/80`, `text-ink/60`, `border-rule/50`
- Hover: `hover:bg-paper-2`

---

## 2. Tipografía (Obsidian High-Performance)

### Familias
```
font-display  → Plus Jakarta Sans (títulos y jerarquía principal)
font-sans     → Plus Jakarta Sans (cuerpo, UI y navegación, default)
--font-hero   → JetBrains Mono (pesos 600 y 700: números tabulares técnicos para
                series, repeticiones, kilajes, cronómetros de descanso y volúmenes)
```

### Escala de tamaños (mobile-first)
```
text-[11px]   → kickers uppercase + tracking-[0.08em]
text-xs       → timestamps y metadata complementaria
text-[13px]   → labels de campos
text-sm       → texto compacto de listas y descripciones
text-[15px]   → cuerpo legible
text-base     → botones CTA
text-lg       → subtítulos de sección
text-xl       → nombres destacados de pantalla
text-2xl      → números destacados / títulos principales

text-[clamp(4rem,22vw,7rem)]  → número héroe de tableros
```

### Interlineado
```
leading-tight  → títulos de card / nombres (1-2 líneas)
leading-snug   → descripciones y párrafos cortos
leading-normal → cuerpo largo
```

### ❌ PROHIBIDO
- Inventar tamaños arbitrarios
- `font-bold` suelto (usar `font-semibold` o `font-display` con su peso correspondiente)

---

## 3. Espaciado y dimensiones

### Targets táctiles (WCAG móvil — NO NEGOCIABLE)
```
h-11 / h-12 (44-48px)   → inputs, botones principales, presets de timer y botones de series (min-w-[44px] h-11)
h-9 / h-10 (36-40px)    → botones secundarios compactos
size-9 (36x36px)        → botón-icono terciario (cerrar modal, más opciones)
min-w-[3.5rem] (56px)   → botón toggle o pestañas principales
```
**Regla crítica:** Todo elemento tocable frecuente (como tildar series en el gimnasio o elegir el tiempo de descanso) **debe tener al menos 44px de alto y ancho efectivo** para permitir interacción precisa con dedos sudorosos o en movimiento, sin desbordar pantallas de 375px. Nada interactivo por debajo de 32px de alto absoluto. Un link de texto suelto NO es un target: envolverlo en un `<button>`/`<Link>` con padding táctil.

**Links de texto**: el estilo lo define `linkClasses` en `src/components/ui.tsx` (`linkClasses.inline` para prosa, `linkClasses.accion` para acciones inline dentro de un bloque de texto). Ningún interactivo textual arma su clase a mano sin padding. `linkClasses.accion` lleva `min-h-11`: nunca le bajes el alto.

**Acciones de cabecera** ("Salir", "← Volver", "Ver tutorial de nuevo", "Cambiar PIN", "Desactivar"): NO son links en prosa, son controles. Van con `pillClasses` (`src/components/ui.tsx`), que garantiza `min-h-11` (44px reales) + superficie propia (borde + `bg-paper-2`). Prohibido dejarlas como texto suelto subrayado.
```jsx
import { pillClasses } from "@/components/ui";

<Link href="/mi" className={pillClasses.neutra}>← Volver</Link>
<button className={pillClasses.destructiva}>Salir</button>
```
- `pillClasses.neutra` → acción reversible (volver, ver tutorial, cambiar PIN).
- `pillClasses.destructiva` → cierra sesión o desactiva algo. **Siempre** distinta de la neutra: `--danger` en texto y borde, relleno al presionar. "Salir" nunca se ve igual que "Tutorial".

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
- `main` en mobile: **mínimo `px-5`** de padding lateral (`px-5 py-6`), nunca contenido pegado al borde.
- Prohibido ancho fijo en px mayor a ~320. Usar `w-full`, `max-w-*`, `flex-1`.
- Todo hijo de flex/grid que contenga texto que deba envolver o truncar lleva **`min-w-0`** (sin esto el texto empuja y rompe el ancho de pantalla).

### Border radius (Obsidian High-Performance)
```
rounded-[10px]  → inputs, botones secundarios, selects
rounded-[12px]  → botones principales, chips interactivos
rounded-[14px]  → cards estándar, contenedores de lista
rounded-[16px]  → hero cards, tarjeta de resumen de día
rounded-[22px]  → modales, hojas inferiores (bottom sheets)
rounded-full    → badges, pills de prescripción, avatares
```

---

## 4. Bordes y superficies (Firma Visual: Soft Glass & Precision Lines)

- **Hairline de precisión**: `border border-rule` (1px). `border-2` solo para estado activo/seleccionado.
- **Card**: `border border-rule rounded-[14px] bg-paper-2`.
- **Card destacada / Hero**: `border border-rule rounded-[16px] bg-paper-2` con leve elevación ambiental (`shadow-sm`).
- **Input / select**: `border border-rule rounded-[10px] bg-paper` (**`bg-paper`, no `bg-white`**).
- **Foco de input**: subir contraste del borde → `focus:border-ink`.
- **Lista con separadores**: `<ul>` con `divide-y divide-rule` y `overflow-hidden rounded-[14px]`.
- **Separador de sección**: `border-t border-rule pt-4`.

### Firma visual Obsidian
- Se descarta el corte poligonal rígido (`.card-cut`) en favor de una **geometría ergonómica fluida**:
  - Curvatura suave (`14px` a `16px`) optimizada para la mano al sostener el móvil.
  - Micro-glow pasivo bioluminiscente en el acento activo (`--accent` / `#10e7a0`).
  - Chips de prescripción con números en `JetBrains Mono` y fondo `bg-paper`.
  - Gradiente ambiental radial sutil en el fondo de pantallas clave.

---

## 5. Imágenes y media (⚠️ causa de regresión conocida)

### Reglas
- Toda `<img>` va **dentro de un contenedor de tamaño fijo**: `size-[72px]`, `aspect-square`/`aspect-video` + `w-full`, etc. Nunca una `<img>` suelta definiendo el tamaño del layout.
- La imagen dentro del contenedor: `h-full w-full object-contain` (siluetas y ejercicios) u `object-cover` (fotografías).
- En filas `flex`: el contenedor de la imagen lleva **`shrink-0`** y el bloque de texto **`min-w-0 flex-1`**.
- `loading="lazy"` + `decoding="async"` salvo que esté en el primer viewport.
- `alt` siempre: descriptivo, o `alt=""` si es puramente decorativa.
- **Fallback obligatorio**: `onError` → estado que renderiza un glifo/placeholder **del mismo tamaño** que la imagen (no colapsar la caja).
- Miniatura de ejercicio/avatar: caja 56-80px, `rounded-[10px]`, `bg-paper-2`, `overflow-hidden`.
- Imágenes externas (free-exercise-db, etc.): `<img>` plano, **no `next/image`**.

### Logo del gimnasio (branding dinámico)
- El logo (`gimnasios.logo_url`, puede ser `null`) siempre va en **caja de tamaño fijo** con `object-contain`. Tamaños: `size-9` sidebar `/panel`, `size-7` topbar móvil, `size-8` header `/mi`.
- Caja: `overflow-hidden rounded-[10px] border border-rule bg-paper-2`. `shrink-0` en filas flex; bloque de texto al lado `min-w-0` + `truncate`.
- Subida: comprimir **en el navegador** a WebP ≤512² y <300 KB antes de tocar Storage.

---

## 6. Alineación

- Filas `imagen + texto` de 2+ líneas: `items-start` (no `items-center`).
- Iconos junto a texto: `inline-flex items-center gap-2` y `shrink-0` en el icono.
- Valores numéricos en inputs cortos (series, reps): `text-center`.
- Título + acción en la misma fila: `flex items-start justify-between gap-2`, el título en `min-w-0` y la acción en `shrink-0`.
- **Acción secundaria de sección**: va en la fila del encabezado con `justify-between`, **nunca** suelta en el stack con `ml-auto`.
- Truncado explícito: `truncate` (1 línea) o `line-clamp-2` (2 líneas).

---

## 7. Desbordes / overflow (probar a 375px)

- El `body` **nunca** scrollea horizontal.
- Contenido intrínsecamente ancho: envolver en `overflow-x-auto`.
- `min-w-0` en todo hijo flex con texto (regla de oro contra texto desbordado).
- `overflow-hidden` en cards con imagen y en `<ul>` con `divide-y`.
- Checklist: probar siempre a 375px sin scroll horizontal.

---

## 8. Animaciones y microinteracciones

### Timing (usar SIEMPRE)
```
[transition-timing-function:var(--ease-out)]
duration-150   → hover, active, press táctil
duration-200   → inputs (border/box-shadow)
duration-350   → apariciones de paneles
```
- Transicionar **propiedades concretas** (`transition-[transform,background-color,opacity]`), **nunca** `transition-all`.
- Entrada/salida: `ease-out`. Movimiento continuo en pantalla: `ease-in-out`. Nunca `ease-in` en UI.

### Feedback táctil (OBLIGATORIO)
```
active:scale-95        → botones secundarios, chips, miniaturas, series marcadas
active:scale-[0.97]    → botones primarios CTA
active:scale-90        → botón-icono chico
active:bg-paper        → filas de lista
```

---

## 9. Overlays / modales

```jsx
<div
  role="dialog" aria-modal="true" aria-label={titulo}
  onClick={onClose}
  className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[color:var(--scrim)] p-4 animate-fade-in backdrop-blur-sm"
>
  <div
    onClick={(e) => e.stopPropagation()}
    className="w-full max-w-sm rounded-[22px] border border-rule bg-paper p-5 shadow-2xl"
  >
    {/* contenido */}
  </div>
</div>
```
- Cerrar por: click en backdrop **+** tecla `Escape` **+** botón X (`size-9`).
- Bloquear scroll del body mientras está abierto (`document.body.style.overflow = "hidden"`).
- En mobile entra desde abajo (`items-end`), en desktop centrado.

---

## 10. z-index (escala fija)

```
z-10   → sticky header / barra de sección
z-35   → timer flotante colapsado (sobre el contenido pero bajo el modal)
z-40   → nav fija (bottom/top)
z-50   → overlays, modales, toasts
```

---

## 11. Accesibilidad (no negociable)

- `<button>` para acciones, `<Link>` para navegación.
- `<label>` asociado con `<input>` siempre.
- Focus visible: `focus-visible:ring-2 focus-visible:ring-accent/40`.
- Iconos con `aria-label` descriptivo.

---

## 12. Componentes estándar

### Input con label
```jsx
<label className="block">
  <span className="block text-[13px] font-medium text-ink-soft mb-1.5">Label</span>
  <input
    className="w-full h-11 px-3 rounded-[10px] border border-rule bg-paper text-[16px] text-ink outline-none transition-[border-color] duration-150 [transition-timing-function:var(--ease-out)] focus:border-accent"
  />
</label>
```

### Botón principal con spinner
```jsx
<button className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[12px] bg-accent text-accent-ink font-semibold text-sm transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97]">
  {pending ? <Spinner /> : "Guardar sesión"}
</button>
```

---

## 13. Layouts móviles

### Navegación Bottom Bar
```jsx
<nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex border-t border-rule bg-paper/95 backdrop-blur-md h-16 pb-2">
  {NAV.map(item => (
    <Link className="relative flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors">
      <span className={`absolute top-0 h-0.5 w-8 rounded-full ${active ? "bg-accent" : "bg-transparent"}`} />
      {item.label}
    </Link>
  ))}
</nav>
```

---

## 14. Íconos (lucide-react — NO dibujar SVG a mano)

**Regla:** todos los íconos de la app salen de `lucide-react`. Está prohibido
escribir `<svg>` inline nuevo con `<path d="…">` dibujado a ojo — ese fue el
origen de íconos rotos (la "mancuerna" de `/mi` dibujaba un cuadrado con
rayitas sueltas) y de trazos/tamaños inconsistentes entre pantallas.

```jsx
import { Dumbbell, ChevronLeft } from "lucide-react";

<Dumbbell aria-hidden strokeWidth={2} className="size-[18px] shrink-0 text-ink-soft" />
```

### Convenciones
```
size-4  (16px)   → ícono dentro de un pill / botón / chevron de fila
size-[18px]      → ícono guía de fila de lista
size-5  (20px)   → ícono de bottom nav
size-[26px]+     → ilustración de estado vacío
strokeWidth={2}       → uso general (coincide con el trazo histórico de la app)
strokeWidth={1.8}     → nav inactiva / ilustración
strokeWidth={2.2}     → nav activa (el peso del trazo marca el estado)
```
- Color por token (`text-ink-soft`, `text-ink`, `currentColor`) — nunca hex.
- Siempre `aria-hidden` cuando hay texto al lado; si el ícono va solo, el
  control necesita `aria-label`.
- `shrink-0` en filas flex, para que el ícono no se aplaste (§7).
- Importar **por nombre** (`import { Dumbbell } from "lucide-react"`), nunca el
  paquete entero: así el tree-shaking deja sólo los íconos usados.

### Excepción única
El chevron del `<Select>` en `src/components/ui.tsx` sigue siendo un `<path>`
inline porque va posicionado en absoluto dentro del label. No agregar más
excepciones.


---

## 17. Patrón "High-Performance" (Métricas, Halo y Progreso)

Patrón visual para métricas destacadas y feedback de entrenamiento: **fondo carbón satinado**, `--accent` (Hyper-Mint) como emisor de energía, números tabulares en `--font-hero` (JetBrains Mono). Reemplaza al antiguo patrón noventero por una estética de instrumentación deportiva moderna.

### Componente `AnilloProgreso`
- Anillo SVG con círculo de fondo (`--rule`) y círculo de progreso en `--accent`.
- Círculo de progreso con glow sutil bioluminiscente (`filter: drop-shadow(0 0 4px var(--accent))`).
- Número central en `--font-hero` (`JetBrains Mono`, bold) + label uppercase en tracking `0.08em`.
- Transición suave con `var(--ease-out)` en `stroke-dashoffset`.

### Timer de descanso flotante arrastrable (§17.1)
- **Modo colapsado**: Píldora táctil o burbuja ergonómica con altura ≥ 48px y padding táctil generoso.
- **Touch-drag con PointerEvents**: El usuario puede mover el timer libremente por la pantalla con un dedo.
- **Edge-snapping magnético**: Al soltarse, se pega automáticamente al borde izquierdo o derecho más cercano con una curva fluida (`cubic-bezier(0.2, 0.9, 0.3, 1.2)`), evitando tapar el contenido de la pantalla.
- **Discriminación de tap/click vs arrastre**: Un arrastre no dispara la apertura del timer; sólo un tap estático (sin desplazamiento) expande o colapsa el panel.
- **Expansión in situ**: Al expandirse, se despliega en la posición donde se soltó el widget, autoconteniéndose para no desbordar el viewport ni tapar la barra de navegación inferior (`bottom-nav`).
- **Persistencia en sesión**: Recuerda sus coordenadas en la sesión actual mientras el usuario navega la rutina.

---

## 18. Hidratación y SSR

```tsx
<html lang="es" suppressHydrationWarning>
```
No aplicar `suppressHydrationWarning` a otros elementos sin justificación.

---

## 19. Checklist pre-commit

- [ ] Solo tokens CSS (sin `bg-white`, sin hex, sin `text-gray-*`).
- [ ] Inputs con `text-[16px]` y `bg-paper`.
- [ ] Toda `<img>` en contenedor de tamaño fijo con `shrink-0` + fallback `onError`.
- [ ] Hijos flex con texto llevan `min-w-0`.
- [ ] Botones/links/chips con `active:scale-*`.
- [ ] Transiciones con propiedad concreta + `var(--ease-out)`.
- [ ] Nada tappable < 32px de alto; targets principales 44×44px.
- [ ] Modales: Escape + backdrop + X, scroll bloqueado, `z-50`.
- [ ] **Probado a 375px: cero scroll horizontal**.

---

## 20. Capa ambiental y polaridad consciente

- La app tiene una capa preset-agnóstica que resuelve contraste en modo oscuro (**Obsidian**) y claro (**Titanium Daylight**).
- `temaToVars()` garantiza `--accent`, `--paper`, `--paper-2`, `--ink`, `--rule` y `--scrim` en ambos modos.
- Prohibido acentos con contraste menor a 4.5 sobre el fondo correspondiente.

---

## 21. Checklist de 30 segundos

- [ ] **Color por token**: cero hex en JSX, cero `bg-white`/`text-gray-*`.
- [ ] **Links**: usan `linkClasses` (`inline` o `accion`), sin texto suelto sin caja.
- [ ] **Encabezado de sección**: título + acción en fila `justify-between`.
- [ ] **Modal**: backdrop `bg-[color:var(--scrim)]`, Escape + backdrop + X, `z-50`.
- [ ] **Probado en preset Oscuro Y Claro**: texto legible, tarjetas distinguibles, sin pérdida de contraste.
- [ ] **375px**: cero scroll horizontal, `min-w-0` en flex texto, imágenes con caja fija.
- [ ] **Táctil**: elementos interactivos ≥ 44px, inputs con `text-[16px]`.

---

## §10 — Checklist de afordancia

- [ ] Todo elemento que dispare una acción tiene contenedor visual (borde y/o fondo).
- [ ] Elementos hermanos comparten el mismo tratamiento base (ej: pastillas de series).
- [ ] Íconos coinciden semánticamente con la acción.
- [ ] Texto de ayuda/error va en su propia línea, debajo de la acción.
- [ ] Nada se corta a mitad de palabra en listas variables (`flex-wrap`).
- [ ] Todo elemento tocable tiene mínimo 44×44px de área táctil.

---

**Última actualización**: 2026-09-04 — Renovación completa a la identidad **Obsidian High-Performance**: paleta carbón/obsidiana con Hyper-Mint y Coral secundario, tipografía Plus Jakarta Sans + JetBrains Mono, esquinas redondeadas 10-16px ergonómicas, preset claro Titanium Daylight coherente, y preservación total de las reglas de usabilidad y rendimiento táctil móvil.
