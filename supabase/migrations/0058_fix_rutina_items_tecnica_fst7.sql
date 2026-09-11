-- Permite la técnica 'fst7' (FST-7 de Hany Rambod) en rutina_items
alter table rutina_items drop constraint if exists rutina_items_tecnica_check;

alter table rutina_items add constraint rutina_items_tecnica_check
  check (tecnica in (
    'dropset', 'rest_pause', 'myo_reps', 'superserie', 'cluster_set', 'fst7'
  ));
