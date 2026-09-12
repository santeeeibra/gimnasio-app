-- Migración 0067: archivos_cliente (adjuntos en Backblaze B2)
-- Guarda solo metadata + URL pública; el binario vive en B2, no en Supabase Storage.

create table if not exists public.archivos_cliente (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  gimnasio_id uuid not null references public.gimnasios(id) on delete cascade,
  nombre_archivo text not null,
  url_archivo text not null,
  tipo_archivo text not null,
  created_at timestamptz not null default now()
);

create index if not exists archivos_cliente_cliente_idx on public.archivos_cliente (cliente_id);
create index if not exists archivos_cliente_gimnasio_idx on public.archivos_cliente (gimnasio_id, created_at desc);

alter table public.archivos_cliente enable row level security;

-- Lectura: dueño/staff del gimnasio ven todos los adjuntos; el cliente ve los propios.
create policy "archivos_cliente_select" on public.archivos_cliente
  for select to public
  using (
    gimnasio_id = current_gimnasio_id()
    and (is_staff_o_dueno() or cliente_id = current_cliente_id())
  );

-- Inserción: dueño/staff pueden subir para cualquier cliente de su gimnasio;
-- el cliente solo puede subir para sí mismo.
create policy "archivos_cliente_insert" on public.archivos_cliente
  for insert to public
  with check (
    gimnasio_id = current_gimnasio_id()
    and (is_staff_o_dueno() or cliente_id = current_cliente_id())
  );

-- Borrado: solo dueño/staff del gimnasio (el cliente no borra sus propios adjuntos).
create policy "archivos_cliente_delete" on public.archivos_cliente
  for delete to public
  using (
    gimnasio_id = current_gimnasio_id() and is_staff_o_dueno()
  );
