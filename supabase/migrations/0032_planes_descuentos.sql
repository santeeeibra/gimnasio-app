-- Agrega columna descuentos a la tabla planes para soportar tarifas
-- especiales personalizadas por el dueño (estudiantes, jubilados, etc.)
-- Estructura de cada elemento: { "id": string, "nombre": string, "porcentaje": number }
alter table public.planes
  add column if not exists descuentos jsonb not null default '[]'::jsonb;

comment on column public.planes.descuentos is
  'Descuentos porcentuales opcionales configurados por el dueño para este plan (ej. estudiantes, jubilados).';
