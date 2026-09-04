# SPEC — Guía flotante (tour) del flujo de pago del plan

> Para pasarle directo a Claude Code. Contexto general del proyecto en `contex-sysgym.md`.
> Contexto del flujo de pago ya implementado: ver "Apartado de pago / plan de máximo
> de usuarios" en `PENDIENTES_VISTA_DEV.md` y sección "Cerrado en esta sesión" de
> `pendientes-estado-actual.md`.

## Motivación

El flujo de pago de planes de plataforma (elegir plan → pagar → aprobar) es nuevo
(auditado por Antigravity, testeado end-to-end OK). Para el lanzamiento, agregar una
guía flotante tipo tour que ayude a:
1. **El dueño del gimnasio** — a entender los pasos del pago desde su panel.
2. **Santiago (superadmin)** — a no olvidarse los pasos de revisión/aprobación en el
   panel dev, sobre todo mostrándoselo en vivo a un dueño nuevo.

## Comportamiento general

- Componente reutilizable de tour: 3 burbujas numeradas, una por paso, con botón
  "Siguiente" / "Cerrar" y overlay liviano que resalta el elemento de la pantalla
  al que corresponde cada paso (si no hay selector claro, mostrar la burbuja fija
  arriba de la pantalla sin resaltar nada).
- Se muestra automáticamente la primera vez que el usuario entra a la pantalla
  correspondiente. Al cerrarlo (con "Cerrar" o completando el último paso), no
  vuelve a aparecer solo.
- Queda un botón "?" flotante (esquina inferior derecha, mismo estilo en ambas
  vistas) para reabrir el tour manualmente en cualquier momento — este no depende
  de si ya fue visto o no.
- Reutilizar el sistema de temas (`bg-paper`, `text-ink`, `bg-volt`, `border-rule`,
  etc.) — nada de colores fijos, así se ve bien en Obsidian/Titanium/Crimson.
- Mobile-first: las burbujas no deben tapar el CTA principal de la pantalla ni
  requerir hover.

## Parte 1 — Tour para el dueño

**Dónde**: `/panel/plan` (elegir/comparar plan) y la pantalla donde confirma el pago
(cargar comprobante).

**Pasos**:
1. "Elegí tu plan" — cupos, precios y el descuento early-bird si corresponde.
2. "Confirmá el pago" — transferí y cargá el comprobante.
3. "Esperá la aprobación" — te avisamos (push) cuando quede activo.

**Persistencia**: no depender de localStorage (el dueño puede entrar desde otro
dispositivo). Migración nueva `0025_tour_pago_dueno.sql`:
- `gimnasios.tour_pago_visto` (boolean, default `false`).
Server action `marcarTourPagoVisto` (service_role o RLS del dueño sobre su propio
gimnasio) que setea `true` al cerrar el tour. El botón "?" muestra el tour sin
tocar este campo.

## Parte 2 — Tour para Santiago (panel dev)

**Dónde**: `/admin/gimnasios/[id]/pagos-plataforma`.

**Pasos**:
1. "Revisá el pago pendiente" — monto y comprobante cargado.
2. "Confirmalo" — ya está el bloqueo de duplicados aplicado.
3. "Verificá" — que el plan y el período se actualizaron en la ficha del gimnasio.

**Persistencia**: alcanza con `localStorage` (`tour_pago_dev_visto`), es un único
usuario (`SUPERADMIN_ID`) en su propio navegador. Sin migración para esta parte.

## Fuera de alcance v1

- Traducir el tour a otros roles (ej. empleados del gimnasio, si existieran).
- Analítica de cuántos dueños completan/cierran el tour.
- Versionar el contenido del tour (si se edita el texto más adelante, simplemente
  se reemplaza — no hace falta resetear `tour_pago_visto` salvo que se decida
  explícitamente volver a mostrarlo a todos).
