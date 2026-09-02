-- Sexo del cliente: lo carga el dueño en el alta (o edición) desde /panel.
-- Ajusta el volumen del motor de rutinas (ver src/lib/rutina/tipos.ts → SEXOS).
-- null => el dueño todavía no lo cargó: el form de rutina NO muestra el select
-- y el motor recibe 'sin_especificar' por default. Ninguna pantalla cambia de
-- layout por tener o no el dato.

alter table clientes
  add column if not exists sexo text
    check (sexo in ('mujer', 'hombre', 'sin_especificar'));

comment on column clientes.sexo is
  'Sexo cargado por el dueño en el alta. null = sin cargar.';
