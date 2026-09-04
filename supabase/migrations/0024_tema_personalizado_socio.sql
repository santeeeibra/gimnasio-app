-- Agregar columna de tema personalizado para socios (clientes)
-- Permite que cada socio elija su propio color de acento u overrides visuales.
-- null => usa el tema por defecto del gimnasio.

alter table public.clientes
  add column if not exists tema_personalizado jsonb;

comment on column public.clientes.tema_personalizado is
  'Override de tema visual del socio (ej: { volt, voltInk }). null = usa el tema del gimnasio.';

-- RLS: el socio puede actualizar su propio registro de cliente (para guardar su tema personalizado)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'clientes'
      and policyname = 'clientes_update_propio'
  ) then
    create policy clientes_update_propio on public.clientes for update
      using (profile_id = auth.uid())
      with check (profile_id = auth.uid());
  end if;
end $$;
