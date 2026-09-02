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

## FASE 2 — Adapter real (Ualá Bis / Mercado Pago) + webhook

- `src/lib/pagos/ualabis.ts` (o `mercadopago.ts`): implementa `crearLink()`
  contra la API del proveedor (POST de "preferencia"/"orden" → devuelve la
  URL hosteada) y `leerWebhook()` (verifica firma, mapea a `EventoPago`).
- `src/app/api/pagos/webhook/route.ts`: `pasarela().leerWebhook(req)` → si
  `aprobado`, aprueba la fila y renueva el gym. Idempotente por
  `proveedor_ref`.
- `/panel/plan`: "Generar pago" redirige a la URL hosteada; al volver
  (`?ref=`) muestra "pago recibido / en proceso".
- `PASARELA_PAGO=ualabis` + keys del proveedor en env.
- Sin cambios en `pagos_plataforma` ni en el flujo de aprobación: solo se
  reemplaza quién dispara el "aprobado" (webhook en vez de soporte).

---

## FASE 3 — Recibo + histórico (opcional)

- `/panel/plan`: histórico de pagos del gym (fecha, monto, período).
- Email/onscreen con el comprobante al aprobar.
