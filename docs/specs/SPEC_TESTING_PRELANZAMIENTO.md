# SPEC — Testing completo pre-lanzamiento

> Para pasarle directo a Antigravity. Contexto general en `contex-sysgym.md`,
> índice de features en `MAPA_PROYECTO.md`. Objetivo: recorrer toda la app
> como lo haría un dueño y un socio reales, antes de que Santiago siga
> saliendo a ofrecerla a gimnasios, y dejar un reporte de qué anda y qué no.

## Cómo trabajar esto

1. Recorrer cada sección en orden (están ordenadas por lo que un dueño nuevo
   toca primero → lo más nuevo/riesgoso → lo periférico).
2. Por cada ítem: probarlo de verdad (no solo leer el código) — completar el
   flujo en el navegador/dev server, con datos de prueba reales.
3. Si algo falla: **fixes chicos y evidentes (1 archivo, sin ambigüedad) se
   arreglan directo.** Si el fix implica una decisión de producto o toca
   varios archivos, NO tocar — anotarlo en el reporte final para que decida
   Santiago.
4. Al terminar, entregar un reporte corto: ✅ lo que anda, ⚠️ lo que anda con
   peros, ❌ lo que está roto (con el error tal cual, sin interpretarlo), y
   qué se arregló solo vs. qué queda pendiente de decisión.
5. No perder tiempo probando lo marcado como 🔲 "no empezado" en
   `MAPA_PROYECTO.md` (cron `recalcular_estado_cuota`, memoria de progreso,
   panel avanzado de rutina) — no está construido, no hay nada que probar.

## Datos de prueba

- Gimnasio de prueba: `migym`, dueño DNI `30111222`.
- Cliente de prueba: Lucía Fernández, DNI `40123456`, plan Mensual.
- Hay 5 gimnasios "genéricos" precargados (`disp1`–`disp5`, ver
  `/admin/gimnasios`) reservados para altas reales en gimnasios — **no
  usarlos para testing**, usar `migym` o crear uno nuevo de prueba con
  `node scripts/seed.mjs`.

---

## 1) Alta y login (lo que Santiago hace en vivo frente a un dueño)

- [ ] Alta de gimnasio + dueño desde cero (`scripts/seed.mjs`), login con
      DNI + clave inicial (`gym` + últimos 4 del DNI).
- [ ] Cambio de clave forzado en el primer ingreso (`debe_cambiar_clave`).
- [ ] Alta de un socio desde `/panel/clientes` (modo normal y modo "prueba").
      Verificar: queda `estado_cuota = vencido`, sin fechas, sin pago
      registrado, y **puede entrar igual** (`acceso_habilitado = true`).
- [ ] Login del socio recién dado de alta, cambio de clave forzado.
- [ ] Editar datos del socio ya creado (`panel/clientes/[id]/editar-datos.tsx`)
      — marcado en el mapa como "falta probar end-to-end".

## 2) Pagos de plataforma (lo más nuevo, tocado hoy)

- [ ] Elegir un plan desde `/panel/plan`: cupos, precios reales, descuento
      early-bird si corresponde al día de prueba del gimnasio.
- [ ] Completar un pago (plan mensual): no debe dejar duplicar un pago
      pendiente del mismo concepto.
- [ ] Aprobar el pago desde `/admin/gimnasios/[id]`: sin fecha manual (debe
      dar +30 días desde hoy o desde el vencimiento vigente si es futuro) y
      **con** fecha manual (checkbox "Fecha manual" → debe respetar la fecha
      elegida, no sumar los 30 días).
- [ ] Probar un cargo único (Setup o Premium): confirmar que NO cambia
      `plan_plataforma_vence_el` ni el estado del gimnasio.
- [ ] Botón "Rechazar" con motivo: el dueño recibe push/email y puede generar
      un pago nuevo.
- [ ] Tour flotante en `/panel/plan` (3 pasos) y en
      `/admin/gimnasios/[id]/pagos-plataforma` (para Santiago): que el
      resaltado no se desincronice al hacer scroll (bug ya arreglado hoy,
      confirmar que sigue OK).
- [ ] Sección "Gimnasios disponibles para activar" en `/admin/gimnasios`:
      activar uno de los `dispN` con datos de prueba (no reales) y confirmar
      que el login final funciona con el DNI/clave nuevos.

## 3) Cuotas y avisos de socios

- [ ] Registrar un pago de socio desde la ficha (`/panel/clientes/[id]`):
      sin fecha manual (1 mes automático) y **con** fecha manual (checkbox
      nuevo, debe ignorar el cálculo automático).
- [ ] Crear un plan nuevo en `/panel/planes`: por defecto sin tocar nada
      queda en 30 días; tildar "Personalizar duración" y poner otro valor,
      confirmar que se guarda como se cargó.
- [ ] Forzar estado de un socio desde `/admin/gimnasios/[id]` (preset
      `cuota_por_vencer` / `cuota_vencida` / `trial_activo` /
      `trial_expirado`) y confirmar que el push sale en la corrida del cron
      de cuotas (o simular la corrida manual si el cron no está andando en
      el entorno de prueba).
- [ ] Ingresos (`/panel/ingresos`): PIN, listado por mes, buscador por
      nombre de socio — marcado como "falta probar" en el mapa.

## 4) Rutinas

- [ ] Generar rutina nueva desde `/mi/rutina` (o el flujo del dueño) con
      distintas combinaciones: sexo, nivel, objetivo, días de entrenamiento,
      hasta 2 zonas de énfasis, zonas a evitar por dolor.
- [ ] Editor de rutina del socio: cambiar series/reps, que respete los
      límites de `SERIES_OPCIONES`/`REPS_OPCIONES`.
- [ ] Panel del dueño sobre la rutina de un socio (`rutina-panel.tsx`).
- [ ] Confirmar que ninguna pantalla de rutina quedó con `bg-white`
      hardcodeado (barrido ya hecho, pero revisar si se tocó algo nuevo).

## 5) Check-in y pantalla de reposo

- [ ] Check-in por DNI en `/checkin`, con y sin día de prueba activo.
- [ ] Pantalla de reposo (screensaver) configurable desde `/panel/ajustes`:
      activar/desactivar, segundos de inactividad, mensaje, mostrar
      reloj/logo, intensidad.

## 6) Mensajería y notificaciones

- [ ] Mandar un mensaje del dueño a un socio y viceversa, hilo completo.
- [ ] Push real (no solo el código): probar desde `/admin/push-prueba` que
      llegue al dispositivo del superadmin. Si las VAPID keys no están
      configuradas en este entorno, dejarlo marcado como pendiente manual,
      no como bug.
- [ ] Reset de clave "olvidé mi contraseña", ambos caminos: (A) si hay
      dominio verificado en Resend, que llegue el mail; (B) si no, que el
      socio dispare el flujo asistido (push a los dueños) y el dueño el
      flujo a superadmin.
- [ ] Avisos al superadmin (errores, acciones de auditoría, "Contactar
      soporte" desde `/panel/ajustes`).

## 7) Branding, temas y responsive

- [ ] Los 3 temas (Obsidian / Titanium / Crimson) en las pantallas clave:
      `/mi`, `/panel`, `/mi/mensajes`, `/panel/plan`,
      `/admin/gimnasios/[id]/pagos-plataforma`.
- [ ] Contraste: el bloqueo de `chequearBloqueos()` en `src/lib/contraste.ts`
      debe impedir guardar una paleta ilegible.
- [ ] Logo del gimnasio + paleta derivada del logo.
- [ ] Todo en el celular real (no solo devtools) — mobile-first, targets
      táctiles de 44px, sin nada que dependa de hover.

## 8) Resiliencia y build

- [ ] Fallback offline: cortar la conexión a Supabase (o simularlo) en
      `/mi` y `/panel/clientes`, confirmar el banner y que no rompe la app.
- [ ] `npm run build` completo sin errores (no solo `npm run dev`).
- [ ] `npx tsc --noEmit` limpio.
- [ ] Deploy de Vercel actualizado con el último commit, variables de
      entorno (Supabase, Resend, VAPID, `CRON_SECRET`) presentes.

## 9) Panel admin / soporte (Santiago)

- [ ] Impersonación: entrar como dueño o socio desde
      `/admin/gimnasios/[id]`, banner "Volver a soporte", salir limpio.
- [ ] Semáforo de errores por gimnasio en `/admin/gimnasios` (últimas 24 h).
- [ ] Monitor de uso de Supabase (`/admin`, % del límite de 500 MB).

---

## Reporte final (formato)

Al terminar, entregar en texto plano (no hace falta doc aparte):

```
✅ Anda bien: [lista corta]
⚠️ Anda con peros: [qué y por qué]
❌ Roto: [pantalla + error tal cual apareció]
🔧 Arreglado solo: [qué se tocó, en qué archivo]
🤔 Necesita decisión de Santiago: [qué y las opciones, si hay]
```
