# SPEC — Check-in por DNI (modo kiosko) + día de prueba

> Para pasarle a Claude Code. Referencia: `contex-sysgym.md`. Toca modelo de
> datos (tabla nueva + campos en `clientes`), una pantalla nueva de kiosko,
> y el form de alta de cliente. Pasar por `emil-design-eng` para la UI del
> kiosko (tiene que ser legible a distancia / uso rápido en mostrador).

## Objetivo

1. El dueño puede dar de alta un cliente en "1 día de prueba" en vez de
   alta completa con plan y pago.
2. Un dispositivo fijo en la entrada del gym (tablet/PC) permite que
   cualquier cliente marque su ingreso escribiendo solo su DNI — sin
   loguearse con clave, sirve como registro de asistencia general (no
   solo para detectar el fin de la prueba).
3. Cuando un cliente en prueba marca un segundo ingreso, el sistema lo
   marca como "prueba vencida, pendiente de cobro" y avisa al dueño.

## 1) Datos

- `clientes`: agregar `en_prueba boolean default false` y
  `prueba_iniciada_en date` (fecha del primer ingreso en prueba).
- Tabla nueva `registros_entrada`:
  - `id`, `cliente_id` (FK), `gimnasio_id` (FK, mismo patrón RLS que el
    resto), `creado_en timestamptz default now()`.
  - Fila liviana a propósito (esto alimenta también "racha de
    constancia" a futuro, ver conversación de memoria de progreso — no
    confundir con `registro_progreso`, que es series/pesos; esto es solo
    presencia). Incluso con mucho volumen, cada fila pesa pocas decenas
    de bytes — no repetir la simulación de PowerShell para esto, el
    riesgo de espacio es despreciable comparado a la tabla de progreso.
  - RLS: el dueño puede insertar/leer registros de su gimnasio. El
    dispositivo en modo kiosko usa la sesión ya autenticada del dueño
    (ver sección 2) para hacer el insert, no necesita policy nueva para
    "sin sesión".

## 2) Modo kiosko (seguridad del check-in)

- El check-in **no es una pantalla sin autenticación**. El dueño inicia
  sesión normal en el dispositivo de la entrada (una vez), y desde
  `/panel` activa "Modo check-in" — un toggle que navega a una pantalla
  simple (`/panel/checkin` o similar) con un solo input: DNI + botón
  "Marcar ingreso".
- Esa pantalla sigue corriendo dentro de la sesión autenticada del
  dueño (usa su cliente de Supabase, no una ruta pública), pero la UI
  no expone nada del panel — solo el input de DNI. Así cualquiera en el
  mostrador puede usarla sin ver datos de otros clientes.
- Para salir del modo kiosko y volver al panel completo, pedir de nuevo
  la clave del dueño (no un simple botón "volver") — evita que alguien
  en el mostrador se meta al panel completo sin querer o a propósito.
- Al tipear un DNI que no existe en ese gimnasio: mensaje simple
  ("DNI no encontrado, avisá al encargado"), sin dar más detalle.

## 3) Alta de cliente — dos botones

En el form de alta (`panel/clientes/nuevo` o donde esté hoy), dos
botones de submit en vez de uno:
- **"Dar de alta"** (ya existe) — flujo completo actual, con plan y
  pago.
- **"1 día de prueba"** (nuevo) — crea el cliente con `en_prueba = true`,
  `prueba_iniciada_en = hoy`, sin plan ni pago asociado todavía. Mismos
  datos mínimos (nombre, DNI, teléfono) — no pedir plan en este flujo.

## 4) Lógica de conversión

En el insert de `registros_entrada` (cada vez que alguien marca DNI en
el kiosko):
1. Si el cliente tiene `en_prueba = true`:
   - Si es su primer registro en `registros_entrada` → dejarlo pasar
     normal, sin avisos (es el día de prueba).
   - Si ya tiene al menos un registro previo → marcar visualmente en la
     pantalla del kiosko "Prueba vencida — avisar al encargado" (no
     bloquea el insert del registro de todos modos: se sigue guardando
     que entró) y disparar una notificación push al dueño (reusar
     `enviarPush()` que ya existe) del tipo "Cliente de ejemplo — prueba
     vencida, falta cobrar".
2. El dueño resuelve desde `/panel/clientes/[id]`: convierte el cliente
   asignándole un plan real y registrando el pago (mismo flujo que un
   alta normal) — al guardar el plan, setear `en_prueba = false`.
3. Mientras `en_prueba = true` y ya pasó el primer ingreso, mostrar un
   badge "Prueba vencida" en la lista de clientes del panel, mismo
   criterio visual que ya usan para "cuota vencida".

## No-goals

- No es un sistema de asistencia con horarios de clase ni reservas —
  solo marca presencia puntual.
- El check-in no reemplaza el login completo de la app del cliente
  (`/login` con DNI+clave sigue igual, es un sistema aparte).
- No bloquear físicamente el ingreso — el software solo informa, la
  decisión de dejarlo entrar es del encargado.

## Criterio de aceptación

- Alta con "1 día de prueba" crea el cliente sin pedir plan/pago.
- Modo kiosko no expone datos de otros clientes ni navegación al panel
  completo sin volver a pedir la clave del dueño.
- Segundo ingreso de un cliente en prueba dispara el push al dueño y el
  badge "Prueba vencida" en el panel.
- Convertir al cliente (asignarle plan + pago) apaga `en_prueba` y saca
  el badge.
- Typecheck limpio, RLS probado (un dueño no puede ver/insertar
  registros de otro gimnasio).
