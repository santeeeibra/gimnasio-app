-- Drop Sets: persistencia de bajadas de peso escalonadas dentro de una serie.
-- Reutiliza registro_progreso (ya tiene RLS por cliente_id/gimnasio_id y
-- unique (cliente_id, ejercicio_id, fecha)) en lugar de crear una tabla nueva.
-- Migración 0059.

alter table registro_progreso
  add column serie_index int,
  add column detalles_tecnica jsonb;

comment on column registro_progreso.serie_index is
  'Índice de la serie (0-based) a la que aplica detalles_tecnica, ej. la última serie de un drop set.';
comment on column registro_progreso.detalles_tecnica is
  'Detalle de técnicas avanzadas (drop sets, etc). Forma actual:
   { "tipo": "dropset", "pasos": [{ "peso": number, "reps": number }, ...] }';

-- Consulta rápida del último drop set por ejercicio (obtenerUltimoDropSetCliente).
create index registro_progreso_dropset_idx
  on registro_progreso (cliente_id, ejercicio_id, fecha desc)
  where detalles_tecnica is not null;
