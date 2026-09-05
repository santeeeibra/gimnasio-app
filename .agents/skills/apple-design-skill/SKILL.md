---
name: apple-design-skill
description: |
  Apple Human Interface Guidelines (HIG) de máxima prioridad para SysGym.
  Diseño de interacción nativo estilo iOS, Liquid Glass, navegación gestual,
  jerarquía visual, curvatura continua (squircles), targets táctiles ergonómicos ≥44pt
  y bridge oficial con los tokens y componentes de SysGym.
version: 2.0.0
metadata:
  content-source: "Apple Human Interface Guidelines, mirrored via sosumi.ai + SysGym HIG Bridge"
  content-owner: "Apple Inc. & SysGym Engineering"
---

# Apple Design (Human Interface Guidelines — SysGym Edition)

> **PRIORIDAD SUPREMA DE DISEÑO NATIVO**: Cuando se diseñen pantallas, componentes,
> gestos o jerarquías en SysGym, los estándares de Apple HIG son la guía rectora.
> Reemplaza cualquier enfoque plano o web tradicional con la ergonomía, profundidad
> y elegancia de una app nativa de iOS.

---

## 1. SysGym HIG Design System Bridge

Este puente traduce las directrices de Apple a los tokens de Tailwind CSS v4 y componentes reales de SysGym:

### A. Materiales y Superficies: Liquid Glass
En iOS, las barras de navegación, tab bars y modales no son cajas opacas; son superficies translúcidas con profundidad:

```tsx
// Floating Tab Bar o Navigation Header estilo Liquid Glass
className="sticky bottom-4 mx-auto w-[calc(100%-2rem)] max-w-md rounded-full border border-rule/60 bg-paper-2/75 backdrop-blur-xl shadow-lg"

// Modal Sheet inferior con elevación y blur
className="rounded-t-[22px] border-t border-rule/50 bg-paper-2/90 backdrop-blur-2xl shadow-2xl"
```

### B. Curvatura Continua (Squircles de Apple)
Apple utiliza curvatura suave continua, evitando esquinas cuadradas abruptas:

| Componente | Token SysGym | Clase Tailwind |
|---|---|---|
| Inputs, selects, tags | 10px squircle | `rounded-[10px]` |
| Botones primarios, CTA | 12px squircle | `rounded-[12px]` |
| Tarjetas estándar de ejercicio | 14px–16px | `rounded-[14px]` o `rounded-[16px]` |
| Bottom Sheets y Modales | 22px squircle | `rounded-[22px]` |
| Pills de navegación y badges | Píldora total | `rounded-full` |

### C. Targets Táctiles Ergonómicos (Hit Target ≥ 44pt)
- En un gimnasio, el usuario opera la app con una sola mano, a menudo con fatiga muscular o sudor.
- **Todo elemento accionable debe tener mínimo `h-11` (44px) y `min-w-11` (44px) de área táctil efectiva.**
- Nunca texto suelto como enlace: siempre envolver en componentes con padding interactivo (`pillClasses` o `linkClasses.accion`).

### D. Jerarquía Tipográfica y Números Tabulares
- Textos de navegación y títulos: `font-display` (Plus Jakarta Sans) con peso semibold/medium.
- Números de series, repeticiones, kilajes y cronómetros: **`tabular-nums font-mono`** (JetBrains Mono) para evitar saltos horizontales en números que cambian dinámicamente.

---

## 2. Anatomía de Componentes del Sistema

Six HIG sections are mirrored under `references/`:

| Section         | Path                          | Covers                                                                                                                                                                                   |
|-----------------|-------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Getting started | `references/getting-started/` | Cross-platform design principles, plus one article per platform (iOS, iPadOS, macOS, watchOS, tvOS, visionOS, games)                                                                     |
| Foundations     | `references/foundations/`     | Color, typography, materials, motion, SF Symbols, icons, accessibility, dark mode, privacy, layout, branding, writing                                                                    |
| Patterns        | `references/patterns/`        | Common tasks/experiences: onboarding, search, drag and drop, notifications, undo/redo, feedback, multitasking, settings                                                                  |
| Components      | `references/components/`      | System-defined UI components, in 8 categories: content, layout and organization, menus and actions, navigation and search, presentation, selection and input, status, system experiences |
| Inputs          | `references/inputs/`          | Input methods: gestures, Apple Pencil, Digital Crown, keyboards, pointing devices, Camera Control, Action button, remotes, eyes                                                          |
| Technologies    | `references/technologies/`    | Platform technologies to integrate: Siri, Apple Pay, HealthKit, SharePlay, AirPlay, Sign in with Apple, and more                                                                         |

---

## 3. Feedback Sensorial y Estados de Presión

Siguiendo el estándar de iOS:
- Al presionar cualquier control (`pointerdown`), debe existir una respuesta visual inmediata (`active:scale-[0.97]` o `active:scale-95`).
- Acompañar con el feedback háptico adecuado según [`sysgym-ux-patterns`](file:///d:/SISTEMA%20GYM/.agents/skills/sysgym-ux-patterns/SKILL.md) y [`src/lib/ui/hapticos.ts`](file:///d:/SISTEMA%20GYM/src/lib/ui/hapticos.ts).
- No retrasar la interacción esperando animaciones o transiciones lentas.
