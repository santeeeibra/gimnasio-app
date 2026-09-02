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

## 4. Rediseño con `emil-design-eng` — estado

Pantallas: `/login` ✅ · `/panel` ✅ · `/panel/clientes` 🔜 · `/panel/mensajes` ·
`/mi` · `/mi/mensajes`.

> Pendiente global: `components/ui.tsx` (`Panel`, `Field`) usan `bg-white` literal
> y no fuerzan `text-ink`, así que en gimnasios con tema oscuro el texto sale
> negro sobre blanco. Se ve en el card "Nuevo cliente" de `/panel/clientes`.
> Arreglar al pasar por esa pantalla (usar `bg-paper-2` + heredar `text-ink`).

### `/login` (hecho)

`src/app/login/page.tsx` + utilidades en `globals.css`: `.stagger` (entrada
escalonada, 45 ms por fila), `.animate-error` (180 ms, snappy), `.spin-fast`
(spinner en el submit). Hero mobile comprimido para que el form entre sin scroll.
Toggle de contraseña con ancho fijo + `aria-pressed`.

### `/panel` Resumen (hecho)

`layout.tsx` + `panel-nav.tsx` (nuevo, client): sidebar solo en `md:`, cabecera
compacta + **bottom nav fija** en mobile (5 items, barra volt en el activo,
instantánea). `text-ink` en el contenedor con `temaVars` para que el color del
tema cascadee (antes solo lo tomaban los elementos con clase `text-*`).
`page.tsx`: se mató la grilla de 4 cards → número héroe en `font-display`
(`clamp` hasta 7rem, el que importa según urgencia) + línea de stats inline +
estado vacío con carácter. `cliente-row.tsx`: contador de días dominante
(`font-display text-2xl`, kicker chico arriba), riel izquierdo volt/danger,
target `py-4`, `bg-paper-2` en el `<ul>` para que herede el tema.

### notas de dirección originales

Archivos: `src/app/panel/page.tsx`, `layout.tsx`, `clientes/cliente-row.tsx`.

Problema: se ve genérico = card-kit de template. La fila de 4 stat cards iguales
y las filas de lista planas no tienen jerarquía ni personalidad.

Ideas (mismo lenguaje que login: Bricolage display, ink/volt/paper, editorial):

- **Matar la grilla de 4 cards iguales.** Un número héroe grande en `font-display`
  (el que importa: "por vencer" o "vencidos" si hay; si no, "al día"), y el resto
  como línea de stats compacta inline debajo. Jerarquía, no 4 cajas.
- **"Atención esta semana":** las filas deben sentirse físicas. El contador de
  días (`quedan 2 d`) es el elemento dominante, no texto rojo chico. Riel de
  color a la izquierda (volt / danger) según urgencia. Target táctil grande,
  toda la fila es `Link` al cliente.
- **Estado vacío** con carácter, no un `<p>` gris.
- Entrada: `.stagger` en el bloque de stats + lista.
- Mobile-first: en el screenshot el sidebar tapa contenido; revisar el layout de
  `aside` en mobile (hoy es una barra horizontal con scroll).
- Pasar por la skill `emil-design-eng` antes de tocar.
