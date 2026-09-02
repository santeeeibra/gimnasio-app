-- Tema del gimnasio como jsonb (reemplaza los 3 colores de 0003).
-- Estructura: { paper, paper2, ink, inkSoft, rule, volt, voltInk, fuente }
-- null => la app usa los valores por defecto.

alter table gimnasios drop column if exists color_primario;
alter table gimnasios drop column if exists color_acento;
alter table gimnasios drop column if exists color_fondo;

alter table gimnasios add column if not exists tema jsonb;

comment on column gimnasios.tema is
  'Tema del gimnasio (branding): {paper,paper2,ink,inkSoft,rule,volt,voltInk,fuente}. null = defaults.';

-- La policy gim_update (UPDATE solo para el dueño del gimnasio) ya existe desde 0003.
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
