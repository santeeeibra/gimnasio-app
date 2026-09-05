---
name: sysgym-ux-patterns
description: |
  Patrones de UX premium para SysGym: drum roll picker estilo iOS, feedback
  háptico (Vibration API), sonidos de UI (Web Audio API) y animaciones 60fps
  compositor-only. Usar cada vez que se diseñe un input de valor numérico,
  un selector, o cualquier interacción táctil que se beneficie de feedback
  físico. Activa esta skill cuando el usuario mencione "rueda", "drum picker",
  "vibración", "sonido", "háptico", "animación fluida" o cuando estés
  diseñando un input numérico para móvil en SysGym.
version: 1.0.0
---

# SysGym UX Patterns — Drum Picker · Haptics · Sound · Animation

Este skill documenta los patrones de interacción premium que se introdujeron
en la feature de peso corporal (sept. 2026) y que deben reusarse en todas las
funcionalidades futuras que manejen valores numéricos o selecciones rápidas.

---

## 1. Ruler Dial Horizontal (estilo iOS Dynamic Island Timer / Calibrador)

### Cuándo usarlo
- Input de valor numérico continuo con decimales (peso corporal, carga de discos, porcentajes, etc.).
- Cuando se busca un look deportivo, táctil y de alta precisión tipo calibrador analógico o reloj inteligente.
- Interacción horizontal: se arrastra con el pulgar hacia la izquierda o derecha.

### Anatomía del componente

```
      68        69        70        71        72
   |||||||||||||||||||||||||||||||||||||||||||||||||
                          ▲
   [ Guardar peso ]                         70.5 kg
```

- **Ruler Canvas**: Canvas retina-sharp (`devicePixelRatio`) que dibuja solo las marcas visibles (~30 marcas en pantalla). 0 layout thrashing, 60fps/120fps sostenidos.
- **Marcas**:
  - Mayor (cada 1.0 kg): 28px alto, color ámbar/orange `#ff9f0a`, número en negrita arriba.
  - Media (cada 0.5 kg): 20px alto, color ámbar translúcido (65%).
  - Menor (cada 0.1 kg): 14px alto, color ámbar sutil (35%).
- **Puntero central**: Triángulo naranja (`▲`) apuntando hacia arriba en el centro exacto.
- **Desvanecido lateral**: Máscara CSS `mask-image: linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%)`. Funciona en fondo oscuro y claro sin crear bloques opacos.
- **Fila de acción inferior**:
  - A la izquierda: Botón tipo píldora estilo iOS (`rounded-full`, borde y texto ámbar con fondo sutil `#ff9f0a/15`).
  - A la derecha: Número digital grande en fuente mono/hero con resplandor cálido (`text-[#ff9f0a]` con `drop-shadow`).
- **Física e Inercia**: `pointerdown`, `pointermove`, `pointerup` con inercia de desaceleración y snapping magnético automático al 0.1 más cercano.
- **Feedback Sensorial**:
  - `playTick()` con Web Audio API en cada cruce de marca.
  - `vibrate(3)` con Vibration API en dispositivos compatibles.

### Código base — `DrumColumn`

```tsx
const ITEM_H = 48;   // alto ítem en px
const VISIBLE = 5;   // ítems visibles
const COL_H = ITEM_H * VISIBLE;
const PAD = ITEM_H * 2;  // relleno para centrar primero/último

function DrumColumn({ items, initialIndex, onChange, label }) {
  const scrollRef = useRef(null);
  const prevIdx = useRef(initialIndex);

  useEffect(() => {
    // Scroll inicial al valor por defecto
    scrollRef.current.scrollTop = initialIndex * ITEM_H;
  }, []);

  function onScroll() {
    const el = scrollRef.current;
    const idx = Math.round(el.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(idx, items.length - 1));

    if (clamped !== prevIdx.current) {
      prevIdx.current = clamped;
      onChange(clamped);
      playTick();    // sonido
      vibrate(4);    // háptico
    }

    // Efecto 3D: rotateX proporcional a distancia al centro
    const centerY = el.scrollTop + COL_H / 2;
    el.querySelectorAll("[data-drum-item]").forEach((item, i) => {
      const itemCenterY = PAD + i * ITEM_H + ITEM_H / 2;
      const dist = itemCenterY - centerY;
      const angle = (dist / ITEM_H) * 22;          // ±22° por posición
      const scale = Math.cos(dist / ITEM_H * Math.PI / 4);
      const opacity = Math.max(0.15, 1 - Math.abs(dist / ITEM_H) * 0.28);
      // SOLO transform y opacity: compositor-only, sin layout thrashing
      item.style.transform = `rotateX(${angle}deg) scale(${Math.max(0.75, scale)})`;
      item.style.opacity = String(Math.min(1, opacity));
    });
  }

  return (
    <div style={{ height: COL_H, width: 88, perspective: "300px" }}
         className="relative overflow-hidden rounded-[16px]">
      {/* Banda selección — no se anima, posición fija */}
      <div className="pointer-events-none absolute inset-x-0 z-10 rounded-[10px] border border-rule bg-paper-2"
           style={{ top: ITEM_H * 2, height: ITEM_H }} />
      {/* Fade mask — compositor */}
      <div className="pointer-events-none absolute inset-0 z-20"
           style={{ background: "linear-gradient(to bottom, var(--color-paper) 0%, transparent 28%, transparent 72%, var(--color-paper) 100%)" }} />
      {/* Scroll container */}
      <div ref={scrollRef} onScroll={onScroll}
           className="absolute inset-0 overflow-y-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
           style={{ scrollSnapType: "y mandatory" }}>
        <div style={{ height: PAD }} />
        {items.map((item, i) => (
          <div key={i} data-drum-item style={{ height: ITEM_H, scrollSnapAlign: "center" }}
               className="flex items-center justify-center">
            <span className="text-[26px] font-bold tabular-nums text-ink">
              {item}
            </span>
          </div>
        ))}
        <div style={{ height: PAD }} />
      </div>
    </div>
  );
}
```

### Ejemplo completo: `PesoPicker` (dos columnas)

Ver implementación en [`src/components/peso/card-peso.tsx`](file:///d:/SISTEMA%20GYM/src/components/peso/card-peso.tsx).

### Variantes para otras features

| Feature futura              | Columna izq.       | Columna der.       |
|-----------------------------|--------------------|--------------------|
| Tiempo de descanso          | Minutos (0–10)     | Segundos (00, 15, 30, 45) |
| Altura del cliente          | cm enteros (100–220) | — (una sola col) |
| Series/Reps en editor       | Series (1–10)      | Reps (5–30)        |
| Duración de rutina          | Horas (0–3)        | Minutos (0, 5, 10…55) |
| Precio de plan              | Miles ($0–$200k)   | Centenas            |

---

## 2. Sonido de UI — Web Audio API

### Reglas
- **Nunca** cargar archivos de audio externos (suma al bundle y depende de red).
- Crear el `AudioContext` **lazy** — solo después del primer gesto del usuario
  (política autoplay del navegador).
- El sonido debe ser corto (≤60ms), tonal y suave. Para interacciones táctiles:
  sine/triangle, frecuencia en torno a 600–1000 Hz, amplitud ≤0.1.

### Función reutilizable

```ts
// src/lib/ui/sonido.ts
let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try { audioCtx = new AudioContext(); } catch { return null; }
  }
  return audioCtx;
}

/** Click suave: para drum pickers, toggles, confirmaciones */
export function playTick(freq = 900, durMs = 50) {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.65, ctx.currentTime + durMs / 1000);
  gain.gain.setValueAtTime(0.06, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durMs / 1000);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + durMs / 1000 + 0.01);
}

/** Confirmación exitosa: dos tonos ascendentes */
export function playSuccess() {
  playTick(700, 60);
  setTimeout(() => playTick(1000, 80), 80);
}

/** Error: tono grave */
export function playError() {
  playTick(300, 80);
}
```

### Cuándo usar cada variante

| Evento                      | Sonido              |
|-----------------------------|---------------------|
| Cambio de valor en picker   | `playTick(900)`     |
| Guardar/confirmar OK        | `playSuccess()`     |
| Error de validación         | `playError()`       |
| Toggle de switch            | `playTick(800, 30)` |
| Tab activo seleccionado     | `playTick(700, 25)` |

---

## 3. Feedback Háptico — Vibration API

### Notas importantes
- **Disponible en Android** vía `navigator.vibrate()`.
- **NO disponible en iOS** con `navigator.vibrate()` (iOS tiene su propia API
  propietaria `HapticFeedback` solo accesible desde apps nativas).
- En iOS PWA (webapp guardada en pantalla de inicio), no hay vibración de JS.
  El iOS Taptic Engine solo lo activan elementos nativos (`<input>`, `<select>`).
- Siempre verificar `"vibrate" in navigator` antes de llamar.

### Función reutilizable

```ts
// src/lib/ui/haptico.ts

/** Pulso ligero — para cambio de ítem en picker, toggle */
export function hapticoLigero() {
  navigator.vibrate?.(4);
}

/** Pulso medio — para confirmaciones */
export function hapticoMedio() {
  navigator.vibrate?.(8);
}

/** Patrón éxito — tres pulsos cortos */
export function hapticoExito() {
  navigator.vibrate?.([6, 40, 6, 40, 10]);
}

/** Patrón error — pulso largo */
export function hapticoError() {
  navigator.vibrate?.(20);
}
```

### Cuándo usar cada variante

| Evento                      | Háptico             |
|-----------------------------|---------------------|
| Cambio de ítem en picker    | `hapticoLigero()`   |
| Guardar OK                  | `hapticoExito()`    |
| Error                       | `hapticoError()`    |
| Toggle, swipe completo      | `hapticoMedio()`    |
| Scroll snap en tabs         | `hapticoLigero()`   |

---

## 4. Animaciones 60fps — Reglas del Proyecto

### Única regla que importa
> Animar **solo** `transform` y `opacity`. Nunca `width`, `height`, `top`,
> `left`, `margin`, `padding`, `box-shadow` en transiciones frame-by-frame.

### Clases permitidas en transiciones

```
transition-transform    ✅ compositor
transition-opacity      ✅ compositor
transition-colors       ⚠️  repaint (aceptable para hover simple, no para scroll)
transition-all          ❌ nunca — anima todo incluyendo layout
```

### El efecto 3D del drum picker (sin layout thrashing)

```ts
// ✅ Correcto: leer scrollTop UNA VEZ, luego solo escribir transform/opacity
function updateRotations(el: HTMLElement) {
  const centerY = el.scrollTop + COL_H / 2;           // 1 lectura de layout
  el.querySelectorAll("[data-drum-item]").forEach((item, i) => {
    const dist = (PAD + i * ITEM_H + ITEM_H / 2) - centerY; // cálculo puro
    item.style.transform = `rotateX(${dist / ITEM_H * 22}deg)`;  // solo writes
    item.style.opacity = String(Math.max(0.15, 1 - Math.abs(dist/ITEM_H) * 0.28));
  });
}

// ❌ Incorrecto: getBoundingClientRect() dentro del forEach = layout thrashing
```

### `will-change` — solo mientras anima

```tsx
// Poner will-change en el scroll container, NO en cada ítem
<div style={{ willChange: "transform" }} ... />
```

### Fade de máscara — compositor

El degradado top/bottom del drum picker es un `div` con `background` estático
que **no se anima** — solo la opacidad de los ítems cambia (via JS).  
Esto es compositor-only: no hay `background-position` ni `height` animado.

---

## 5. Checklist antes de agregar cualquier interacción nueva

- [ ] ¿El input es numérico con rango acotado? → Drum picker
- [ ] ¿Hay cambio de valor discreta (tick)? → `playTick()`
- [ ] ¿Hay confirmación o guardado? → `playSuccess()` + `hapticoExito()`
- [ ] ¿Hay error? → `playError()` + `hapticoError()`
- [ ] ¿La animación usa solo `transform`/`opacity`? → ✅
- [ ] ¿Hay `transition-all` o `width`/`height` animados? → ❌ reemplazar
- [ ] ¿`will-change` se aplica solo durante la animación? → ✅
- [ ] ¿Se respeta `prefers-reduced-motion`? → Agregar guard

```ts
// Guard de prefers-reduced-motion
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!prefersReducedMotion) {
  playTick();
  hapticoLigero();
}
```

---

## 6. Features futuras donde aplicar estos patrones

| Feature                          | Drum picker   | Sonido     | Háptico    |
|----------------------------------|---------------|------------|------------|
| Timer de descanso entre series   | ✅ min + seg  | ✅ beep fin | ✅ medio   |
| Altura/peso en alta de cliente   | ✅ dos cols   | ✅ tick     | ✅ ligero  |
| Selector de precio de plan       | ✅ miles      | ✅ tick     | ✅ ligero  |
| Selector de días de entrenamiento| ✅ 2–7 días   | ✅ tick     | ✅ ligero  |
| Reps target en editor rutina     | ✅ 1–50       | ✅ tick     | ✅ ligero  |
| Fecha de vencimiento manual      | ✅ día/mes/año| ✅ tick     | ✅ ligero  |

---

## 7. Archivos de referencia en el proyecto

- [`src/components/peso/card-peso.tsx`](file:///d:/SISTEMA%20GYM/src/components/peso/card-peso.tsx) — Implementación completa del drum picker (`PesoPicker`, `DrumColumn`)
- [`src/components/progreso/mini-registro-progreso.tsx`](file:///d:/SISTEMA%20GYM/src/components/progreso/mini-registro-progreso.tsx) — Input inline de progreso de ejercicio
- [`src/lib/peso/actions.ts`](file:///d:/SISTEMA%20GYM/src/lib/peso/actions.ts) — Server actions para peso corporal
- [`src/lib/progreso/actions.ts`](file:///d:/SISTEMA%20GYM/src/lib/progreso/actions.ts) — Server actions para progreso de ejercicios
- [`supabase/migrations/0036_registro_peso_y_progreso.sql`](file:///d:/SISTEMA%20GYM/supabase/migrations/0036_registro_peso_y_progreso.sql) — Tablas y RLS
