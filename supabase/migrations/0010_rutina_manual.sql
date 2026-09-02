-- SPEC_PANEL_AVANZADO_RUTINA.md — modo manual / avanzado de rutina.
-- El cliente que ya entrena arma su rutina a mano (sin pasar por el motor de
-- reglas) y asigna técnicas de intensidad por ejercicio. Flujo paralelo: no
-- reemplaza al generador automático, escribe en la misma estructura.

-- ─────────────────────────────────────────────────────────────
-- rutinas.origen: de dónde salió la rutina activa del cliente
-- ─────────────────────────────────────────────────────────────
alter table rutinas add column if not exists origen text
  not null default 'auto' check (origen in ('auto', 'manual'));

comment on column rutinas.origen is
  'auto = generada por el motor de reglas; manual = armada a mano por el cliente.';

-- ─────────────────────────────────────────────────────────────
-- rutina_items.tecnica: técnica de intensidad opcional por ejercicio
-- null = sin técnica (equivale a ''ninguna'' en el catálogo de tipos.ts)
-- ─────────────────────────────────────────────────────────────
alter table rutina_items add column if not exists tecnica text
  check (tecnica in (
    'dropset', 'rest_pause', 'myo_reps', 'superserie', 'cluster_set'
  ));

comment on column rutina_items.tecnica is
  'Técnica de intensidad (SPEC modo manual). null = ninguna. Catálogo en src/lib/rutina/tipos.ts → TECNICAS.';

-- RLS: sin cambios. El cliente ya tiene insert/update/delete sobre rutinas
-- (0001 + 0005) y write sobre rutina_items (0001).
