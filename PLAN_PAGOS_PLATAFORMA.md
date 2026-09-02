# Pagos gimnasio → plataforma (link de pago por período)

> Continuación de `PLAN_PLANES_PLATAFORMA.md`. El dueño paga su plan de
> plataforma. Modalidad: un pago por período (sin débito automático). La
> pasarela está detrás de una interfaz para poder cambiarla sin tocar el
> resto (`src/lib/pagos/`).

## Diseño

- **Interfaz** `PasarelaPago` (`src/lib/pagos/tipos.ts`): `crearLink()` +
  `leerWebhook()`. Un adapter por proveedor. Se elige por env
  `PASARELA_PAGO` (`manual` por defecto).
- **`pagos_plataforma`**: una fila por intento de pago. `estado ∈
  {pendiente, aprobado, rechazado}`. Al aprobar: se empuja
  `gimnasios.plan_plataforma_vence_el` += `dias` y `estado = 'activo'`
  (misma lógica que `renovarPlanPlataforma`, ahora disparada por el pago).
- Nada de tarjetas/credenciales en el código. Las keys del proveedor van en
  env, las carga el humano.

---

## FASE 1 — Interfaz + adapter `manual` + confirmación desde soporte  ✅

- `0017_pagos_plataforma.sql`: tabla + RLS service_role.
- `src/lib/pagos/{tipos,manual,index}.ts`: interfaz + adapter que no llama a
  ningún proveedor (el dueño transfiere y soporte confirma).
- `/panel/plan`: botón "Generar pago" → crea `pagos_plataforma` pendiente,
  manda mail a `ADMIN_EMAIL`, muestra los datos de transferencia
  (`PAGO_ALIAS` / `PAGO_TITULAR` de env) y el estado del último pago.
- `/admin/gimnasios/[id]`: lista de `pagos_plataforma` + botón "Confirmar"
  (`confirmarPagoPlataforma`) que aprueba y renueva. Auditado.

Env nueva (opcional, solo texto informativo): `PAGO_ALIAS`, `PAGO_TITULAR`.

---

## FASE 2 — Adapter Mercado Pago (Checkout Pro) + webhook  ✅

- `src/lib/plataforma/aprobar-pago.ts`: `aprobarPagoPlataforma(db, pagoId,
  proveedorRef?)` — aprobar la fila + renovar el gym. Idempotente por
  `estado`. La usan la confirmación manual y el webhook.
- `src/lib/pagos/mercadopago.ts`: `crearLink()` crea una *preference*
  (`POST /checkout/preferences`) con `external_reference = pago.id` y
  `notification_url = <origin>/api/pagos/webhook`; devuelve `init_point`.
  `leerWebhook()` toma `type=payment` + `data.id`, trae el pago
  (`GET /v1/payments/:id`) y lo mapea a `EventoPago`. Firma `x-signature`
  como control extra (la autenticidad la da el fetch autenticado).
- `src/app/api/pagos/webhook/route.ts`: si el evento es `aprobado`, llama a
  `aprobarPagoPlataforma`. 400 => MP reintenta.
- `index.ts`: `case "mercadopago"`. `/panel/plan` "Generar pago" ya redirige
  a `redirect` (init_point) cuando el adapter es `automatica`.

**Env para activar:**
- `PASARELA_PAGO=mercadopago`
- `MP_ACCESS_TOKEN` — Access Token de la app en el panel de MP (prod/test).
- `MP_WEBHOOK_SECRET` — *Firma secreta* de Webhooks en el panel de MP
  (opcional; si falta, el webhook igual valida contra la API de MP).

**Configurar en el panel de Mercado Pago** (Tus integraciones → tu app →
Webhooks): URL `https://TU-DOMINIO/api/pagos/webhook`, evento **Pagos**.
`notification_url` también va en cada preference, así que alcanza con
cualquiera de las dos, pero dejar la del panel para el modo test.

---

## FASE 3 — Recibo + histórico  ✅

- `/panel/plan`: card "Historial de pagos" (últimos 12: fecha, monto, días,
  estado).
- `aprobarPagoPlataforma` → `avisarRenovacion()`: al aprobar, push al dueño
  ("Plan renovado hasta …") + email a `ADMIN_EMAIL` con el comprobante
  (gimnasio, monto, período, vencimiento). Best-effort, no rompe la
  aprobación. Sirve tanto para el webhook como para la confirmación manual.
