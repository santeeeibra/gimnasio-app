# SPEC — Logo del gimnasio + sugerencia de colores desde el logo

> Para pasarle a Claude Code. Referencia de contexto general: `contex-sysgym.md`.
> Reutiliza el sistema de tema existente (`src/lib/tema.ts`, `src/lib/contraste.ts`).
> No duplicar `derivarPaleta()` ni `chequearBloqueos()` — extenderlos, no reescribirlos.

## Objetivo

El dueño sube el logo de su gimnasio desde `/panel/ajustes`. La app:
1. Comprime el logo antes de subirlo (evitar gastar Storage).
2. Muestra el logo en las pantallas clave de la app.
3. Sugiere 2-3 paletas de color derivadas del color dominante del logo,
   reusando el motor de tema que ya existe (mismo patrón visual que
   `PRESETS_TEMA`: un tap y listo, "Personalizar a mano" queda como fallback).

## 1) Datos

- Migración: agregar columna `logo_url text` (nullable) a `gimnasios`.
  No tocar la columna `tema` (jsonb) existente.
- Storage: bucket nuevo `logos` (público de lectura, escritura restringida).
  - Path por archivo: `logos/<gimnasio_id>.webp` (un solo archivo, se
    sobreescribe al subir uno nuevo — **no versionar**).
  - RLS del bucket: solo el dueño del gimnasio (`is_dueno()` +
    `current_gimnasio_id()`, mismo patrón que ya usan las policies de
    `mensajes`) puede subir/reemplazar su propio path. Lectura pública
    (el logo se muestra a clientes sin sesión de dueño).

## 2) Compresión client-side (antes de subir — obligatorio)

En el input de archivo de `/panel/ajustes`:
1. Cargar el archivo elegido en un `<canvas>`.
2. Redimensionar a máx. 512×512 (mantener aspect ratio, sin recorte forzado).
3. Exportar como WebP, calidad ~0.8.
4. Si el resultado supera 300 KB, bajar calidad en escalones (0.7, 0.6...)
   hasta entrar. Si ni así entra, rechazar con mensaje simple ("probá con
   una imagen más simple") — no forzar el upload.
5. Recién ahí subir el blob comprimido al bucket `logos`.

No usar librerías de compresión server-side ni Edge Functions para esto —
todo en el navegador, es más rápido y no gasta cómputo.

## 3) Extracción de color dominante (mismo canvas, mismo momento)

- Usar una lib chica de extracción de color por canvas (ej. `colorthief`,
  MIT license, sin dependencias pesadas) sobre el canvas ya redimensionado
  del paso 2 (no hace falta reprocesar la imagen original).
- Descartar candidatos casi blancos/negros/grises (saturación muy baja) —
  quedarnos con el color más vibrante como candidato a "acento".
- Pasar ese color como base a `derivarPaleta()` (ya existe en
  `src/lib/contraste.ts`) para generar las 7 variables de tema.
- Correr `chequearBloqueos()` sobre el resultado. Si falla contraste,
  usar el mismo ajuste automático de luminosidad que ya aplica el flujo
  de "Calcular desde la base".
- Generar 2-3 variantes (ej: acento tal cual / acento +luz / con fondo
  oscuro) y mostrarlas como chips seleccionables, mismo componente visual
  que `PRESETS_TEMA` en el editor de tema. Elegir una = mismo flujo de
  guardado que ya existe para los presets. "Personalizar a mano" sigue
  disponible como está hoy.

## 4) Dónde se muestra el logo (agregar `logo_url` a los queries que ya
   traen `gimnasios.tema`, mismo lugar donde se inyecta el tema)

En este orden de prioridad:
1. `/login` — arriba del formulario, en vez del nombre solo.
2. Header de `/mi` (vista cliente).
3. Header de `/panel` (vista dueño).
4. Avatar de "Gimnasio" en mensajes (donde hoy el remitente sale genérico
   para el cliente — ver "Detalles conocidos" en `contex-sysgym.md`).
5. Íconos de PWA (`icon-192`, `icon-512`, `badge-72`) generados a partir
   del logo en vez de los genéricos actuales — puede ir en una iteración
   aparte si complica el scope.

Si `logo_url` es null, todas las pantallas caen al estado actual (nombre
de texto, ícono genérico) — no debe romper nada para gimnasios sin logo.

## 5) No-goals / restricciones

- No versionar logos históricos.
- No guardar el logo como base64 en `tema` jsonb (compite con el cupo de
  DB de 500 MB en vez del cupo de Storage de 1 GB, que es aparte).
- No servidor/Edge Function para procesar imagen — todo en cliente.
- Mobile-first: el flujo de subida y elección de paleta tiene que andar
  cómodo en pantalla chica (mismo criterio que el resto del editor de
  tema, ver `REGLAS_UI_EMIL.md`).

## 6) Criterio de aceptación

- Subir un logo pesado (foto de celu, varios MB) y verificar que lo que
  llega al bucket pesa <300 KB.
- Gimnasio sin logo sigue funcionando igual que hoy en las 5 pantallas.
- Elegir una paleta sugerida pasa `chequearBloqueos()` sin fallar (o el
  ajuste automático la corrige antes de mostrarla como opción).
- Typecheck limpio, sin tocar la lógica de `derivarPaleta()` /
  `chequearBloqueos()` existente, solo consumirla.
