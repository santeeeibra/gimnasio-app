---
name: sysgym-ux-patterns
description: |
  Patrones de UX premium de máxima prioridad para SysGym: feedback háptico
  avanzado (Acoustic Haptics + Taptic Engine iOS 17.4+ + Vibration API Android),
  sonidos de UI sintetizados con Web Audio API (cero latencia, cero archivos),
  drum roll pickers y ruler dials estilo iOS, y animaciones 60fps/120fps compositor-only.
  Esta skill tiene PRIORIDAD SUPREMA en cualquier decisión de interacción táctil,
  motion, feedback físico o selector numérico en SysGym.
version: 2.0.0
---

# SysGym UX Patterns — Sensory Feedback · Dials · Haptics · Sound · 60fps

> **PRIORIDAD SUPREMA DE UI/UX**: Esta skill y sus directrices sensoriales rigen sobre
> cualquier regla de diseño general o previa. En SysGym, una interacción táctil sin
> respuesta física inmediata o con saltos de frame se considera un fallo de usabilidad.

---

## 1. Arquitectura Sensorial Unificada (`src/lib/ui/hapticos.ts`)

SysGym cuenta con un motor sensorial multi-capa que entrega la sensación de una **aplicación nativa de iOS/Android** dentro de la web móvil:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ACCIONES DEL USUARIO                           │
│        (Taps, Swipes, Dial Rotation, Serie Marcada, Timer Fin)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   src/lib/ui/hapticos.ts (MOTOR)                       │
├───────────────────────────────────┬────────────────────────────────────┤
│ 1. Android / Chrome:              │ Vibration API (navigator.vibrate)  │
│ 2. iOS 17.4+ Safari:              │ Taptic Engine real vía switch DOM  │
│ 3. iPhone / iPad / PWA:           │ Acoustic Haptics (80-120Hz altavoz)│
│ 4. Audio Sintetizado:             │ Web Audio API (sin archivos audio) │
└───────────────────────────────────┴────────────────────────────────────┘
```

### Principio de Cero Latencia y Cero Archivos
- **Nunca** descargar archivos `.mp3` o `.wav` para la interfaz (aumentan bundle y sufren demoras de red).
- Todo sonido se genera sintéticamente en memoria con osciladores matemáticos (`sine`, `triangle`, micro-rampas exponenciales).
- Duraciones ultra-cortas (15ms a 80ms) para respuesta sensorial instantánea al tacto.

---

## 2. Catálogo de Feedback Háptico y Sonoro

Importar siempre desde `@/lib/ui/hapticos`:

```ts
import {
  hapticoDial,
  hapticoImpactoSuave,
  hapticoImpactoMedio,
  hapticoImpactoFuerte,
  hapticoSeleccion,
  hapticoExito,
  hapticoError,
  hapticoSerieCompletada,
  hapticoTimerFin,
  hapticoRecordPersonal,
} from "@/lib/ui/hapticos";
```

### Tabla de Aplicación en la App

| Evento de UI | Función | Sensación Física | Sonido Sintetizado |
|---|---|---|---|
| **Paso de rueda / Dial / Regla** | `hapticoDial()` | Pulso micro-seco (10ms) + switch iOS | Click de aguja (950Hz→600Hz, 18ms) |
| **Tap en botón secundario / tab** | `hapticoImpactoSuave()` | Tap liviano (5ms) + switch iOS | Pop suave amortiguado (500Hz) |
| **Tap en botón principal / modal** | `hapticoImpactoMedio()` | Impacto medio (12ms) | Thump cálido con cuerpo |
| **Cambio de toggle / switch** | `hapticoSeleccion()` | Click seco distintivo | Doble micro-tono |
| **Serie de ejercicio completada** | `hapticoSerieCompletada()` | Golpe contundente doble | Chime deportivo brillante ascendente |
| **Guardado / Alta / Check-in OK** | `hapticoExito()` | Tres pulsos rítmicos | Acorde armónico ascendente (680→1020Hz) |
| **Descanso de timer finalizado** | `hapticoTimerFin()` | Patrón triple de alerta | Doble campana de aviso clara |
| **Nuevo récord personal (PR)** | `hapticoRecordPersonal()` | Vibración triunfal escalonada | Fanfarria sintética luminosa |
| **Error de validación / bloqueo** | `hapticoError()` | Pulso largo de detención (25ms) | Tono grave amortiguado (280Hz) |

---

## 3. Acoustic Haptics (El Secreto de la Vibración en iPhone)

Dado que Safari en iOS bloquea `navigator.vibrate`, SysGym emplea **Acoustic Haptics**:
1. Un oscilador triangular a frecuencia subsónica/grave resonante (entre 80 Hz y 115 Hz) excita la membrana física de los altavoces estéreo del iPhone por 30ms.
2. La masa de aire y la excursión del altavoz se sienten en los dedos como un golpe mecánico real ("chassis thump").
3. Se superpone un micro-click agudo (950 Hz) para dar nitidez perceptiva.
4. En iOS 17.4+, además se dispara el click del Taptic Engine nativo interactuando con un elemento `<input type="checkbox" switch>` invisible.

---

## 4. Ruler Dial Horizontal & Drum Roll Picker

### A. Ruler Dial Horizontal (Medición Continua — Peso, Discos, Medidas)
- **Implementación**: Canvas con `devicePixelRatio` para nitidez retiniana 4K/3K.
- **Rendimiento**: Dibuja únicamente las ~30 marcas visibles en viewport. 0 layout thrashing. 60fps/120fps garantizados.
- **Interacción**: Inercia cinemática con desaceleración natural y snapping magnético.
- Cada cruce de marca dispara `hapticoDial(18)` (con throttle automático).
- Ver implementación en [`src/components/peso/card-peso.tsx`](file:///d:/SISTEMA%20GYM/src/components/peso/card-peso.tsx).

### B. Drum Roll Picker Vertical 3D (Minutos, Segundos, Días, Reps)
- Estilo cilindro de iOS (`perspective: 300px`).
- Rotación `rotateX` y opacidad calculadas por CSS transform sobre el compositor GPU.
- **Cero lecturas DOM en bucle**: se lee `scrollTop` una sola vez y se aplican transforms directos.
- `scrollSnapType: "y mandatory"` nativo para deslizamiento fluido a 120Hz en ProMotion.

---

## 5. Regla 60fps Compositor-Only en Interacciones

Toda animación o transición en SysGym debe cumplir:

```css
/* ✅ PERMITIDO: Compositor GPU sin relayout ni repaint */
transform: translate3d(x, y, 0) scale(...) rotate(...)
opacity: ...
backdrop-filter: blur(...)   /* con contención */

/* ❌ PROHIBIDO en transiciones activas: Fuerza layout thrashing */
width, height, top, left, margin, padding, box-shadow
transition: all
```

### Curvas de Resorte (Spring Curves) de SysGym
- **Drawer / Sheet de abajo:** `cubic-bezier(0.32, 0.72, 0, 1)` (amortiguación iOS fluida).
- **Entrada de contenido / modal:** `cubic-bezier(0.16, 1, 0.3, 1)` (entrada veloz y desaceleración orgánica).
- **Micro-press en botón:** `transform: scale(0.97)` en 150ms `cubic-bezier(0.23, 1, 0.32, 1)`.

---

## 6. Despertar de Audio en el Primer Gesto

Para cumplir con las políticas de autoplay de iOS Safari y Chrome:
```tsx
import { iniciarAudioHaptico } from "@/lib/ui/hapticos";

// En el contenedor principal o primer botón interactivo:
<main onPointerDown={() => iniciarAudioHaptico()} ...>
```
Esto inicializa silenciosamente el contexto de audio y desbloquea el hardware de sonido y Taptic Engine para toda la sesión del usuario.

---

## 7. Acordeón Interactivo Compacto (Guías y Explicaciones Largas)

Para evitar bloques extensos de texto en pantalla vertical en dispositivos móviles (ej: explicaciones de rutina, guías para no expertos, desgloses teóricos):

### Reglas de Diseño y UX
1. **Contención Inicial**: Nunca renderizar 5+ párrafos continuos en secuencia vertical que empujen el formulario o la pantalla principal.
2. **Estructura de Tarjetas de 1 Línea**:
   - Botón disparador principal (`💡 ¿Cómo armamos tu rutina?`) con toggle `abierta` e indicador háptico (`hapticoSeleccion()`).
   - Lista interna de items renderizados como tarjetas compactas de 1 línea con badge numérico (`span rounded-full bg-accent/15`), título en `text-xs` y `ChevronDown` animado (`rotate-180`).
3. **Despliegue Bajo Demanda**:
   - Control de estado local (`itemAbierto: number | null`).
   - Al seleccionar un item, se despliega solo su texto explicativo con `animate-fade-in` e iluminación de acento en el icono, disparando `hapticoSeleccion()`.
4. **Ahorro de Espacio**: Reduce el scroll vertical en un **75%**, manteniendo la interfaz limpia y accesible.

---

## 8. Sticky Floating Bar (Barra Flotante de Progreso del Día)

Para el seguimiento de entrenamientos activos sin restar área visible:
- **Ubicación**: Flotante sobre la barra de navegación inferior (`sticky` o `fixed bottom-16 sm:bottom-4`).
- **Superficie Liquid Glass**: `bg-paper-2/85 backdrop-blur-xl border border-rule/50 shadow-lg rounded-[16px]`.
- **Información Compacta**: Porcentaje de avance en tiempo real con barra o micro-anillo SVG, tiempo transcurrido con `font-mono tabular-nums`.

---

## 9. Timer Descanso Flotante & Minimizable (Persistent HUD)

Cronómetro de descansos que no interrumpe la navegación del usuario:
- **Estados**: Desplegado (vista completa de segundos y ajuste rápido +10s / -10s) vs Minimizado (píldora flotante compacta `rounded-full`).
- **Alerta Sensorial**: Dispara `hapticoTimerFin()` + sonido de doble campana sintetizado mediante Web Audio API al llegar a 0.
- **Tipografía**: Siempre `font-mono tabular-nums` para evitar temblor o layout shift durante el conteo.

---

## 10. Anillos de Actividad & Racha (Apple Fitness Rings)

Visualización de progreso diario y constancia de entrenamiento:
- **Renderizado SVG**: Círculos superpuestos utilizando `strokeDasharray` y `strokeDashoffset` con transiciones CSS aceleradas por GPU.
- **Indicadores de Constancia**: Días completados representados por cápsulas/dots con estado activo en color de acento (`bg-accent text-accent-contrast shadow-sm`) e inactivas amortiguadas.

---

## 11. Gate de Bloqueo Elite (Glassmorphism Access Gate)

Para restringir módulos avanzados o planes sin degradar la estética:
- **Capa de Desenfoque**: `backdrop-blur-md bg-paper/60 absolute inset-0 z-20 flex items-center justify-center`.
- **Tarjeta Elevada**: Esquinas squircle `rounded-[22px]`, borde suave `border border-rule/60`, insignia brillante `Sparkles` / `Flame` y botón CTA con degradado distintivo.


