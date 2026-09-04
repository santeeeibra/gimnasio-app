# SPEC — Cobro automático a socios vía Mercado Pago (solo plan Elite)

> **Estado: NO EMPEZADO.** Feature grande, multi\-archivo → hacer con Claude Code.
> Decisiones de producto ya tomadas con Santiago (2026\-09\-04), ver abajo.

## Qué resuelve

Hoy el socio le paga la cuota al dueño 100% por fuera del sistema (transferencia
o efectivo) y el dueño la registra a mano en `/panel/clientes/[id]` (con
`comprobante_ref` opcional, ya hecho — `0028_comprobante_pago.sql`).

Se agrega un segundo camino, condicionado al plan de plataforma del gimnasio:

| Plan del gimnasio | Cómo paga el socio |
| --- | --- |
| Básico / Pro | Igual que hoy: transferencia por fuera, el dueño la carga a mano. **No se toca nada acá.** |
| Elite | El dueño vincula su propia cuenta de Mercado Pago una vez. El socio toca "Pagar", va al checkout de MP, paga, vuelve — la cuota se confirma sola por webhook. Sin comprobante, sin que el dueño haga nada. |

## Decisiones de producto (confirmadas)

- **Downgrade de Elite a Pro/Básico** (o plan vencido): el cobro automático se
  apaga solo — deja de ofrecerse el botón al socio y vuelve al flujo manual.
  El token de Mercado Pago del dueño **no se borra**\: si vuelve a Elite, se
  reactiva solo, sin pedirle vincular la cuenta de nuevo. El gate es
  simplemente "plan actual \=\= Elite AND hay token guardado", calculado en el
  momento — no hace falta una columna `activo` aparte.
- **Alcance del comprobante manual (Básico/Pro)**\: se deja como está (texto
  de Antigravity). No se agrega foto por ahora.

## Por qué el pago dueño→plataforma no sirve de base tal cual

`src/lib/pagos/mercadopago.ts` ya integra Checkout Pro \+ webhook, pero usa
**un solo `MP_ACCESS_TOKEN`** (el tuyo, el de la plataforma) — sirve para que
el dueño te pague a VOS. Para que el socio le pague al DUEÑO, la plata tiene
que entrar a la cuenta de Mercado Pago de ESE dueño: hace falta que cada
gimnasio tenga su propio `access_token` de MP (OAuth "Mercado Pago Connect"),
y usar ESE token (no el global) al crear la preferencia y al leer el webhook.

## Arquitectura

### 1\) Vinculación de cuenta (OAuth Mercado Pago Connect)

Paso manual único de Santiago antes de programar: crear una aplicación en
[mercadopago.com.ar/developers](https://www.mercadopago.com.ar/developers) →
obtener `MP_CONNECT_CLIENT_ID` y `MP_CONNECT_CLIENT_SECRET` (son distintos del
`MP_ACCESS_TOKEN` que ya existe). Configurar la `redirect_uri` de producción
en esa app.

Flujo:

1. Dueño en plan Elite entra a `/panel/plan` (o `/panel/ajustes`) → card
   "Cobros automáticos con Mercado Pago" → botón "Vincular Mercado Pago".
2. `GET /api/mp-connect/iniciar` redirige a
   `https://auth.mercadopago.com.ar/authorization?client_id=...&response_type=code&platform_id=mp&redirect_uri=...&state=<gimnasio_id firmado>`.
3. Dueño autoriza en Mercado Pago (con SU cuenta).
4. `GET /api/mp-connect/callback?code=...&state=...` canjea el `code` por
   `access_token` / `refresh_token` / `user_id` (`POST https://api.mercadopago.com/oauth/token`) y los guarda en `gimnasios`.
5. Botón "Desvincular" → borra los 3 campos (`mp_access_token`,
   `mp_refresh_token`, `mp_collector_id`).

Los tokens son credenciales sensibles: guardarlos con RLS sin policies (solo
`service_role` los lee), igual que ya hacen `pagos_plataforma` /
`planes_plataforma`. Nunca exponerlos a un client component.

Los `access_token` de MP vencen (\~180 días). El adapter debe refrescar con
`refresh_token` cuando la API devuelva 401, y guardar el token nuevo — si no
se implementa esto, a los 6 meses el cobro automático deja de andar en
silencio para todos los gimnasios Elite vinculados.

### 2\) Cobro al socio

Nuevo botón "Pagar cuota con Mercado Pago" en `/mi/pagos`, visible solo si
`gimnasios.plan_plataforma` (vía `clientes.gimnasio_id`) es Elite y el
gimnasio tiene `mp_access_token` guardado. Si no se cumple, la pantalla se ve
igual que hoy (sin el botón).

Al tocarlo:

1. Server Action crea una fila en `pagos` con `estado = 'pendiente'`,
   `proveedor = 'mercadopago'`, monto \= precio del plan del socio.
2. Crea la preferencia de Checkout Pro usando el `access_token` **del dueño**
   (no el global) — nueva función en el adapter, ej.
   `crearLinkConToken(accessToken, datos)`.
3. Redirige al socio al `init_point` de MP.
4. Socio paga, MP lo vuelve a `/mi/pagos`.

### 3\) Webhook multi\-tenant

Nueva ruta `POST /api/pagos-socio/webhook` (la existente en
`/api/pagos/webhook` sigue siendo solo para dueño→plataforma, no se toca):

1. Lee `type`/`data.id` igual que el webhook actual.
2. Busca en `pagos` la fila `pendiente` por `external_reference` (\=
   `pagos.id`) para saber a qué gimnasio pertenece.
3. Trae el `mp_access_token` de ESE gimnasio y con ese token (no el global)
   hace `GET /v1/payments/{id}` para validar el pago.
4. Si `approved`\: `pagos.estado = 'confirmado'` \+
   `clientes.estado_cuota = 'al_dia'` \+ `clientes.fecha_vencimiento` según
   los días del plan del socio (misma lógica que `registrarPago` hoy en
   `panel/clientes/actions.ts` — reusar esa función en vez de duplicar).
5. Si `rejected`/`cancelled`\: `pagos.estado = 'rechazado'`.
6. Idempotente por `pagos.proveedor_ref` (unique index), igual patrón que
   `pagos_plataforma_prov_ref_idx`.

## Migraciones

**`0029_mp_connect_gimnasio.sql`**

```sql
alter table public.gimnasios
  add column if not exists mp_access_token  text,
  add column if not exists mp_refresh_token text,
  add column if not exists mp_collector_id  text,
  add column if not exists mp_vinculado_at  timestamptz;
-- RLS ya cubierto por las policies existentes de gimnasios (revisar que
-- ningún select desde un client component traiga estas 3 columnas).
```

**`0030_pagos_estado_proveedor.sql`**

```sql
alter table public.pagos
  add column if not exists estado text not null default 'confirmado'
    check (estado in ('pendiente', 'confirmado', 'rechazado')),
  add column if not exists proveedor text not null default 'manual',
  add column if not exists proveedor_ref text;

create unique index if not exists pagos_prov_ref_idx
  on public.pagos (proveedor, proveedor_ref)
  where proveedor_ref is not null;
```

Default `'confirmado'` para no romper el flujo manual actual (el dueño sigue
insertando pagos ya confirmados, sin cambios en `pago-form.tsx` de
`panel/clientes/[id]`).

## Archivos nuevos

- `src/app/api/mp-connect/iniciar/route.ts`
- `src/app/api/mp-connect/callback/route.ts`
- `src/app/api/pagos-socio/webhook/route.ts`
- `src/lib/pagos/mercadopago-connect.ts` (variante de `mercadopago.ts` que
  recibe el `access_token` por parámetro en vez de leerlo de env)
- `src/app/panel/plan/mp-connect-card.tsx` (o dentro de `panel/ajustes`) \+
  server actions vincular/desvincular
- `src/app/mi/pagos/pagar-mp-button.tsx` \+ server action

## Archivos que se tocan

- `src/app/mi/pagos/page.tsx` — mostrar el botón condicional
- `src/app/panel/clientes/actions.ts` — extraer la lógica de "confirmar
  pago → actualizar cuota del cliente" a una función reusable para que la
  llame también el webhook nuevo

## Env vars nuevas

- `MP_CONNECT_CLIENT_ID`
- `MP_CONNECT_CLIENT_SECRET`
- `MP_CONNECT_REDIRECT_URI` (o se arma con `NEXT_PUBLIC_BASE_URL`)

## Fuera de alcance v1

- Cobrar comisión/`marketplace_fee` sobre el pago del socio.
- Reintentos automáticos si el `access_token` del dueño quedó revocado (por
  ahora: si el checkout falla por token inválido, mostrar mensaje y caer al
  flujo manual).
- Notificar al dueño si Mercado Pago le revocó el permiso (queda para
  cuando haya un caso real).
