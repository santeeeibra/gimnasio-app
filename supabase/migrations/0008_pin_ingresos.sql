-- Agregar columna para PIN de ingresos (opcional, nullable)
-- El dueño puede configurarlo desde /panel/ingresos/configurar-pin

alter table gimnasios
  add column pin_ingresos text;

comment on column gimnasios.pin_ingresos is 'Hash bcrypt del PIN para acceder a la sección de ingresos (4-6 dígitos). Nullable: si es null, se redirige a configurar-pin en el primer acceso.';