---
name: sysgym-mascot-skill
description: |
  Guía y estándar supremo para la mascota oficial de SysGym (Pulpo Volt verde #10e7a0 con muñequera deportiva).
  Gobierna el uso de <Pulpo />, <PulpoCard />, indicadores de carga <MascotaLoading />, <PullToRefresh />,
  y tarjetas de logros/racha. Prohíbe imágenes PNG sueltas con cajas blancas y solapamientos sobre headers de la UI.
version: 1.0.0
---

# Mascota Oficial de SysGym (Pulpo Volt — Mascot Design & Usage Skill)

> **Regla de Oro de Usabilidad e Identidad**: La mascota oficial de SysGym es el **Pulpo Verde-Volt (`#10e7a0`) con muñequera deportiva**, símbolo de constancia, fuerza y energía de la plataforma. Este estándar rige la integración visual y comportamiento de la mascota en todas las pantallas de SysGym.

---

## 1. Principios Inviolables de Diseño de Mascota

1. **Cero Cajas Blancas / PNGs Sueltos**:
   - Queda **estrictamente prohibido** usar etiquetas `<img>` con PNGs que posean fondo blanco rectangular o sin transparencia sobre temas oscuros o dinámicos del gimnasio.
   - Toda mascota debe ser renderizada vía componentes **vectoriales SVG** (`<Pulpo />` o `<PulpoCard />` de `src/components/mascota/pulpo.tsx`).

2. **Fondo Fijo de Plataforma (No apoyarse directo en `bg-paper`)**:
   - La mascota **NUNCA** se apoya directamente sobre el fondo del tema del gimnasio (`bg-paper` / `bg-paper-2`).
   - Siempre debe ir resguardada dentro de un contenedor o tarjeta con fondo oscuro fijo de plataforma (`bg-zinc-950` / `bg-slate-950`), resplandor volt ambiental (`#10e7a0` a 15-30% de opacidad), curvatura suave (`rounded-[20px]` o `rounded-full`) y borde sutil (`border border-emerald-500/30`).
   - Usar el componente estándar: `<PulpoCard size={...} pose="festejo" />`.

3. **Color de Plataforma FIJO (No configurable por el gimnasio)**:
   - Color constante: `PULPO_VERDE = "#10e7a0"`.
   - Representa la identidad de SysGym a nivel plataforma; nunca debe mutar con la paleta de colores del gimnasio ni con el tema del cliente.

4. **Detalle de la Ilustración (Flat Vector Athletic Style)**:
   - Ojos glossy nítidos, mejillas deportivas, sonrisa expresiva.
   - Muñequera deportiva (*wristband*) en uno de los tentáculos en todas las variaciones (`festejo` o `neutral`).

---

## 2. Guía de Componentes y Uso en Código

### A. `<Pulpo />` (Vector SVG Puro)
Para integrar la mascota dentro de layouts personalizados (ej. dentro de un badge existente):
```tsx
import { Pulpo } from "@/components/mascota/pulpo";

<Pulpo size={64} pose="festejo" className="animate-pulse" />
```

### B. `<PulpoCard />` (Contenedor Estándar de Fondo Fijo)
Uso recomendado para pantallas de logros, racha, modales y headers:
```tsx
import { PulpoCard } from "@/components/mascota/pulpo";

<PulpoCard
  size={90}
  pose="festejo"
  cardClassName="!rounded-[22px] border-emerald-500/40 shadow-2xl"
/>
```

### C. `<MascotaLoading />` (Loader de Carga)
Reemplaza los spinners genéricos. Muestra a la mascota SVG flotando o rebotando sobre su badge circular con animación 60fps compositor-only:
```tsx
import { MascotaLoading } from "@/components/mascota/mascota-loading";

<MascotaLoading size={48} label="Cargando rutina…" mostrarLabel />
```

### D. `<PullToRefresh />` (Indicador Táctil de Actualización)
- **Bloqueo en reposo (`!esIdle`)**: Cuando la página está en estado `idle`, el indicador NO se monta en el DOM para evitar solapamientos visuales.
- **Desplazamiento Seguro**: Al estirar el documento hacia abajo, el indicador se despliega únicamente en el espacio libre creado arriba del contenido, sin tapar la cabecera ("Hola, ..."), ni botones de acción (`Tutorial`, `Salir`, `Buzón`).
```tsx
import { PullToRefresh } from "@/components/mascota/pull-to-refresh";

<PullToRefresh>{children}</PullToRefresh>
```

---

## 3. Matriz de Aplicación en Pantallas

| Pantalla / Contexto | Componente a Usar | Configuración |
|---|---|---|
| **Racha de Constancia (`/mi`)** | `<PulpoCard />` | `size={52}`, `pose="festejo"`, en badge lateral `w-16 h-16` |
| **Cartel de Récord Personal** | `<PulpoCard />` | `size={90}`, resplandor ámbar/esmeralda + fanfarria háptica |
| **Pull-to-Refresh (`/mi` y `/panel`)** | `<PullToRefresh />` + `<MascotaLoading />` | `size={32}`, despliegue dinámico en espacio superior sin solapes |
| **Splash de Arranque (`SplashScreen`)** | `<PulpoCard />` | `size={110}`, centrado sobre modal `bg-zinc-950` con fade |
| **Hero Landing Page (`/`)** | `<PulpoCard />` | `size={84}`, interactivo con feedback sonoro/háptico |
