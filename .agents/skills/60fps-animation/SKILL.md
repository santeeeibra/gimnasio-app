---
name: 60fps-animation
description: |
  Directriz de rendimiento visual 60fps/120fps de máxima prioridad para SysGym.
  Elimina jank, layout thrashing y bloqueos de renderizado en Next.js, React y
  Tailwind CSS v4 animando exclusivamente transform y opacity sobre la GPU.
  Incluye curvas de resorte iOS, FLIP en React y soporte ProMotion 120Hz.
version: 2.0.0
---

# 60fps / 120fps Performant Web Animation (SysGym Edition)

> **PRIORIDAD SUPREMA DE MOTION**: Ninguna animación en SysGym puede forzar recálculo
> de layout (reflow) ni repintado continuo en el hilo principal de la CPU.
> Toda animación o micro-interacción debe correr al 100% sobre el Compositor GPU
> a 60fps estables en móviles de gama media y 120fps en pantallas ProMotion.

---

## 1. Regla Inquebrantable: Compositor-Only

El navegador ejecuta 3 etapas: **Layout → Paint → Composite**.
Animar propiedades de Layout o Paint satura el hilo principal del móvil:

| Animación Prohibida (CPU Jank) | Qué Detona | Reemplazo Obligatorio (Compositor GPU) |
|---|---|---|
| `width`, `height` | Layout + Paint | `transform: scaleX()/scaleY()` o técnica FLIP |
| `top`, `left`, `margin`, `padding` | Layout + Paint | `transform: translate3d(x, y, 0)` |
| `box-shadow` animado | Paint pesado | Animar `opacity` de un pseudo-elemento `::after` |
| `filter: blur(...)` en bucle | Paint pesado | Cross-fade de opacidad entre dos capas |
| `background-position` | Paint | `transform: translate()` en un contenedor interno |
| `transition: all` | Recálculo total | `transition-[transform,opacity]` específico |

---

## 2. Tokens de Resortes iOS en SysGym (Tailwind CSS v4)

Configurados en `src/app/globals.css`:

```css
:root {
  /* Resorte iOS natural (para modales, bottom sheets, drawers) */
  --ease-spring: cubic-bezier(0.32, 0.72, 0, 1);

  /* Desaceleración suave (para entradas de tarjetas, chips y botones) */
  --ease-smooth: cubic-bezier(0.16, 1, 0.3, 1);

  /* Micro-press instantáneo al tacto */
  --ease-press: cubic-bezier(0.23, 1, 0.32, 1);
}
```

### Clases Tailwind Recomendadas en SysGym

```tsx
// Micro-interacción en botón (presión táctil sin layout shift)
className="transition-transform duration-150 [transition-timing-function:var(--ease-press)] active:scale-[0.97]"

// Bottom Sheet / Modal que sube estilo iOS
className="transition-transform duration-300 [transition-timing-function:var(--ease-spring)]"

// Fila o tarjeta con sombra flotante ultra-liviana (0 paint jank)
className="relative after:pointer-events-none after:absolute after:inset-0 after:rounded-inherit after:shadow-lg after:opacity-0 after:transition-opacity after:duration-200 hover:after:opacity-100"
```

---

## 3. Técnica FLIP en React (Sin Layout Thrashing)

Para reordenar series, animar agregado de ejercicios o cambios de tamaño sin estirar el texto:

```tsx
import { useLayoutEffect, useRef } from "react";

export function useFlipAnimation(deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null);
  const prevRect = useRef<DOMRect | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const nextRect = el.getBoundingClientRect();

    if (prevRect.current) {
      const dx = prevRect.current.left - nextRect.left;
      const dy = prevRect.current.top - nextRect.top;

      if (dx !== 0 || dy !== 0) {
        // Invert
        el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
        el.style.transition = "none";

        // Play en el siguiente frame compositor
        requestAnimationFrame(() => {
          el.style.transition = "transform 260ms cubic-bezier(0.32, 0.72, 0, 1)";
          el.style.transform = "translate3d(0, 0, 0)";
        });
      }
    }

    prevRect.current = nextRect;
  }, deps);

  return ref;
}
```

---

## 4. Expansión de Altura sin JS: CSS Grid 1fr -> 0fr

Nunca animar `height` ni `max-height`. Para desplegar acordeones, notas de rutina o formularios:

```tsx
<div className={`grid transition-[grid-template-rows] duration-260 [transition-timing-function:var(--ease-spring)] ${abierto ? "grid-template-rows-[1fr]" : "grid-template-rows-[0fr]"}`}>
  <div className="overflow-hidden min-h-0">
    {/* Contenido que aparece suavemente sin re-renderizado */}
    {children}
  </div>
</div>
```

---

## 5. Prevención de Layout Thrashing (Lectura y Escritura)

Si se necesita sincronizar movimiento táctil (ej. arrastre de la barra de rutina o del dial de peso):

```ts
// ❌ PÉSIMO: Lee offsetWidth y escribe style dentro de un bucle
items.forEach(el => {
  const w = el.offsetWidth; // FORZADO DE REFLOW
  el.style.width = w + "px";
});

// ✅ CORRECTO: 1 lectura previa, luego solo escrituras en requestAnimationFrame
const widths = items.map(el => el.offsetWidth); // Lecturas agrupadas
requestAnimationFrame(() => {
  items.forEach((el, i) => {
    el.style.transform = `scaleX(${widths[i] / 100})`; // Escrituras GPU
  });
});
```

---

## 6. Soporte ProMotion 120Hz y Accesibilidad

1. **Pantallas a 120Hz (iPhone Pro / iPad Pro / Android Flagship):**
   - El uso exclusivo de `transform` permite al compositor de WebKit sincronizar a la tasa de refresco nativa (120 fps) automáticamente sin saltos de cuadros.
2. **`prefers-reduced-motion`:**
   - Respetar siempre a usuarios con sensibilidad al movimiento:
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, ::before, ::after {
       animation-duration: 0.01ms !important;
       animation-iteration-count: 1 !important;
       transition-duration: 0.01ms !important;
       scroll-behavior: auto !important;
     }
   }
   ```
