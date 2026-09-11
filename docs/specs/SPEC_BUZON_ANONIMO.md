# SPEC — Buzón anónimo de comentarios (socio → dueño)

> Para pasarle directo a Antigravity. Contexto general del proyecto en
> `contex-sysgym.md`. Mismo criterio de "sección protegida" que ya existe en
> Ingresos (PIN), pero acá la protección es de identidad, no de acceso.

## Motivación

Los socios no tienen forma de avisarle al dueño cosas puntuales del gimnasio
(equipo roto, incomodidad, sugerencias) sin que quede su nombre pegado al
reclamo. Un buzón anónimo baja la fricción para que avisen, y le da al dueño
una fuente de feedback que hoy no tiene.

## Decisión de anonimato

- **Anónimo de cara al dueño**: la pantalla del dueño nunca muestra qué socio
  mandó cada comentario.
- **No anónimo internamente**: se guarda igual el `cliente_id` en la fila
  (no se expone en la UI del dueño). Sirve para: (a) poder mandarle el push
  de la respuesta al socio correcto, (b) moderar en el SQL Editor si alguien
  usa el buzón para insultar o spamear — algo que no se puede resolver si el
  dato no existe en ningún lado.

## Espacio en Supabase

No es un problema real: comentarios de texto son livianos (algunos cientos de
bytes cada uno) frente al límite de 500 MB del free tier (ver
`SPEC_MONITOR_SUPABASE.md`). Igual, para no acumular basura indefinidamente,
sumar una purga automática de comentarios ya "resueltos" con más de 60 días
(ver sección Cron más abajo) — opcional pero recomendado.

## Modelo de datos

Migración nueva (próxima libre al escribir esto: `0027_buzon_anonimo.sql`,
confirmar el número real contra `supabase/migrations/` antes de aplicar):

```sql
create table buzon_comentarios (
  id uuid primary key default gen_random_uuid(),
  gimnasio_id uuid not null references gimnasios(id) on delete cascade,
  cliente_id uuid not null references clientes(id) on delete cascade,
  categoria text not null default 'otro', -- 'equipo' | 'limpieza' | 'sugerencia' | 'otro'
  texto text not null,
  estado text not null default 'pendiente', -- 'pendiente' | 'resuelto'
  respuesta text,
  respondido_at timestamptz,
  creado_at timestamptz not null default now()
);

-- RLS: el socio solo puede insertar (y ver los suyos, para ver la respuesta
-- si la hay); el dueño ve todos los de su gimnasio pero sin poder unir
-- cliente_id a un nombre desde la UI (aunque la columna exista en la base).
```

Índice por `gimnasio_id, estado` para el listado del panel.

## Parte 1 — Pantalla del socio (`/mi/buzon`)

- Formulario: categoría (select: Equipo roto / Limpieza / Sugerencia / Otro)
  + textarea de texto libre. Botón "Enviar" (sin confirmación, es liviano).
- Debajo, lista de sus propios comentarios enviados (solo los suyos, vía RLS)
  con estado y, si el dueño respondió, la respuesta visible.
- Link desde `/mi` (menú principal), mobile-first, mismo estilo del resto.

## Parte 2 — Pantalla del dueño (`/panel/buzon`)

- Lista de comentarios del gimnasio, más nuevos primero, filtro rápido
  pendiente/resuelto. **Nunca mostrar nombre ni DNI del socio** — ni siquiera
  con un tooltip o dato oculto en el HTML (evitar filtrarlo en el markup).
- Por cada comentario: categoría, texto, fecha, y tres acciones:
  - **Responder**: textarea corta → guarda en `respuesta` + `respondido_at`,
    dispara push al `cliente_id` de esa fila ("El gimnasio respondió tu
    comentario"), sin identificar al dueño de forma distinta a como ya se
    identifican los mensajes del dueño hoy (mismo criterio que Mensajes).
  - **Marcar resuelto**: cambia `estado` a `resuelto` sin necesidad de
    responder (para reclamos ya solucionados en persona, ej. "se arregló la
    colchoneta").
  - **Borrar**: elimina la fila. Confirmar con `window.confirm` (mismo patrón
    que otros borrados de la app). Sin soft-delete — se pidió borrado real.
- Link desde `/panel` (menú principal del dueño).

## Push

Reusar `enviarPush` (`@/lib/push/enviar`) igual que el resto de la app:
- Al socio, cuando el dueño responde su comentario.
- Al dueño, opcional v1 o v2: aviso de que llegó un comentario nuevo (podría
  generar ruido si hay mucho volumen — evaluar si conviene o si alcanza con
  que el dueño entre a mirar el panel de vez en cuando).

## Cron de purga (opcional, no bloquea el resto)

Sumar a `/api/cron/cuotas` (o un cron propio) el borrado de filas con
`estado = 'resuelto'` y `respondido_at` (o `creado_at` si nunca se respondió)
con más de 60 días. Mantiene la tabla chica sin perder nada relevante —
los reclamos activos nunca se tocan.

## Fuera de alcance v1

- Adjuntar fotos al comentario (ej. foto del equipo roto) — súmale tamaño real
  a Supabase Storage, evaluar aparte si se pide más adelante.
- Reacciones/votos de otros socios sobre el mismo comentario.
- Notificar al dueño en tiempo real (solo push simple, sin panel de "no
  leídos" con contador).
