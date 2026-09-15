-- El kiosko offline (IndexedDB checkins_queue) genera un id local por
-- check-in y puede reenviarlo varias veces (reintento de red, doble
-- sincronización, cola procesada en paralelo). client_ref guarda ese id:
-- con el índice único de abajo, reinsertar el mismo check-in es un no-op
-- en vez de una fila duplicada, sin depender de ventanas de tiempo.
alter table registros_entrada
  add column if not exists client_ref text;

create unique index if not exists registros_entrada_cliente_client_ref_key
  on registros_entrada (cliente_id, client_ref)
  where client_ref is not null;
