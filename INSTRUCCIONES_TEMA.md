# Aplicar migración 0003 y probar colores personalizables

## 1. Aplicar la migración en Supabase

Ve al SQL Editor de tu proyecto Supabase (`adrkdortznimrlungwoy`) y ejecutá:

```sql
-- Agregar columnas de tema personalizable a gimnasios
-- Cada gimnasio puede definir su paleta de colores (branding).

alter table gimnasios add column color_primario text;
alter table gimnasios add column color_acento text;
alter table gimnasios add column color_fondo text;

comment on column gimnasios.color_primario is 'Color principal del gimnasio (hex), mapea a --ink';
comment on column gimnasios.color_acento is 'Color de acento (hex), mapea a --volt';
comment on column gimnasios.color_fondo is 'Color de fondo (hex), mapea a --paper';

-- RLS: la tabla gimnasios ya tiene policy gim_select (lectura para todo el gimnasio)
-- y gim_update solo para dueño. Verificamos que exista la de UPDATE.

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' 
    and tablename = 'gimnasios' 
    and policyname = 'gim_update'
  ) then
    create policy gim_update on gimnasios for update
      using (id = current_gimnasio_id() and is_dueno())
      with check (id = current_gimnasio_id() and is_dueno());
  end if;
end $$;
```

## 2. Probar la funcionalidad

1. Abrí http://localhost:3000 (o el puerto que esté corriendo)
2. Logueate como dueño: gimnasio `migym`, DNI `30111222`, clave inicial
3. Navegá a la nueva sección **"Ajustes"** en el menú lateral
4. Vas a ver 3 color pickers:
   - **Color principal**: mapea a `--ink` (texto y elementos principales)
   - **Color de acento**: mapea a `--volt` (botones y destacados)
   - **Color de fondo**: mapea a `--paper` (fondo de la app)
5. Cambiá algún color y guardá
6. Los cambios se aplican inmediatamente en todo el panel del dueño
7. Logueate como cliente (DNI `40123456`) y verificá que también se vean los colores personalizados en `/mi`

## 3. Verificar que funciona

- El panel del dueño (`/panel`) debe reflejar los colores personalizados
- La vista del cliente (`/mi`) debe reflejar los colores personalizados
- Los mensajes (`/panel/mensajes` y `/mi/mensajes`) también deben usar los colores
- Si no se configuran colores, usa los defaults (papel/tinta/volt originales)

## 4. Siguiente paso: Rediseño con frontend-design

Ahora que la infraestructura de colores está lista, el próximo paso es usar la skill `frontend-design` para repasar y mejorar las pantallas clave:
- `/login`
- `/panel` (resumen)
- `/panel/clientes`
- `/panel/mensajes`
- `/mi`
- `/mi/mensajes`
