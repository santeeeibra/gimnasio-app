-- Agregar columna para PIN de ingresos (opcional, nullable)
-- El dueño puede configurarlo desde /panel/ingresos/configurar-pin

alter table gimnasios
  add column pin_ingresos text;

comment on column gimnasios.pin_ingresos is 'Hash SHA-256 + salt del PIN para acceder a la sección de ingresos (4-6 dígitos), ver src/lib/pin.ts. Nullable: si es null, se redirige a configurar-pin en el primer acceso.';