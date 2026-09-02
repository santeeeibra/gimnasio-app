# Aplicar migración de tema y probar

## 1. Migración en Supabase (SQL Editor, proyecto `adrkdortznimrlungwoy`)

`0003` (3 colores) quedó reemplazada por `0004`: un solo campo `tema jsonb` con
7 colores independientes + tipografía. Ejecutá:

```sql
alter table gimnasios drop column if exists color_primario;
alter table gimnasios drop column if exists color_acento;
alter table gimnasios drop column if exists color_fondo;

alter table gimnasios add column if not exists tema jsonb;

comment on column gimnasios.tema is
  'Tema del gimnasio (branding): {paper,paper2,ink,inkSoft,rule,volt,voltInk,fuente}. null = defaults.';

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='gimnasios' and policyname='gim_update'
  ) then
    create policy gim_update on gimnasios for update
      using (id = current_gimnasio_id() and is_dueno())
      with check (id = current_gimnasio_id() and is_dueno());
  end if;
end $$;
```

> Hasta aplicarla, `/panel/ajustes` no muestra el formulario (falta la columna).

## 2. Probar

1. `npm run dev`, login dueño (`migym` / `30111222`).
2. Menú lateral → **Ajustes**.
3. Hay:
   - **Tipografía**: Moderno / Técnico / Neutro / Editorial.
   - **7 colores** independientes: fondo app, fondo tarjetas, texto principal,
     texto secundario, bordes, acento, texto sobre acento.
4. La **Vista previa** de la derecha se actualiza en vivo con cada cambio
   (colores y fuente), sin guardar.
5. **Guardar cambios** → se aplica en `/panel` y en la app del cliente (`/mi`,
   `/mi/mensajes`). Login cliente (`40123456`) para verificar.
6. **Restablecer** vuelve a los valores por defecto (no guarda hasta confirmar).

## 3. Cómo funciona (código)

- `src/lib/tema.ts`: tipo `Tema`, `DEFAULT_TEMA`, `FUENTES`, `CAMPOS_COLOR`,
  `parseTema()` (valida hex + fuente), `temaToVars()` (→ CSS custom properties
  `--paper`, `--paper-2`, `--ink`, `--ink-soft`, `--rule`, `--volt`,
  `--volt-ink`, `--app-font-display`, `--app-font-sans`).
- Fuentes cargadas en `src/app/layout.tsx` (next/font): Bricolage, Inter, Space
  Grotesk, Geist, Fraunces. `globals.css` usa `--app-font-*` con indirección
  para permitir override en runtime.
- Inyección del tema: `src/app/panel/layout.tsx` y `src/app/mi/layout.tsx`
  (nuevo) leen `gimnasios.tema` y aplican `temaToVars` al contenedor. Las
  páginas de `/mi/*` ya no inyectan colores por su cuenta.
- Ajustes: `panel/ajustes/page.tsx` (carga), `ajustes-form.tsx` (form + estado),
  `tema-preview.tsx` (maqueta en vivo), `actions.ts` (`actualizarTema`).

## 4. Siguiente paso: rediseño con `emil-design-eng`

Pantallas a repasar: `/login`, `/panel`, `/panel/clientes`, `/panel/mensajes`,
`/mi`, `/mi/mensajes`.
