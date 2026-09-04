-- Pagos del socio al gimnasio: hasta ahora todos eran manuales y ya
-- confirmados (los carga el dueño). Con el cobro automático aparece el estado
-- 'pendiente' (se creó la preferencia de MP, falta que el socio pague).
-- Default 'confirmado' / 'manual' para no tocar el flujo existente.

alter table public.pagos
  add column if not exists estado text not null default 'confirmado'
    check (estado in ('pendiente', 'confirmado', 'rechazado')),
  add column if not exists proveedor text not null default 'manual',
  add column if not exists proveedor_ref text;

-- Idempotencia del webhook: un pago de la pasarela se procesa una sola vez.
create unique index if not exists pagos_prov_ref_idx
  on public.pagos (proveedor, proveedor_ref)
  where proveedor_ref is not null;
