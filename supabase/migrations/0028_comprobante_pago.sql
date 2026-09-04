-- Agrega campo de comprobante/referencia a los pagos del cliente al dueño.
-- El dueño puede pegar ahí el número de operación, referencia de transferencia,
-- o un link externo (Google Drive, etc.). Nullable: pagos existentes no se tocan.

alter table pagos
  add column if not exists comprobante_ref text;
