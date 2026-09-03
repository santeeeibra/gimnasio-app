-- Email real de contacto para recuperar la contraseña. NO es el login:
-- dueño y cliente siguen entrando con gimnasio + DNI + clave (email sintético
-- interno en auth.users). Estos campos son solo para mandar el link de reset.

-- Cliente: lo carga el dueño en el alta o al editar la ficha del socio.
alter table public.clientes
  add column if not exists email text;

-- Dueño: lo carga él mismo desde /panel/ajustes (o el seed al crearlo).
alter table public.profiles
  add column if not exists email_recuperacion text;
