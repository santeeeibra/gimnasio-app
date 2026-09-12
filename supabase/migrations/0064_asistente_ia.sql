-- SPEC_ASISTENTE_IA_N8N.md — asistente con IA orquestado por n8n (VM propia,
-- fuera de Vercel). n8n nunca toca Supabase directo: le pega a
-- /api/n8n/notificar con un secreto compartido, y ese endpoint es el único
-- que escribe acá (con service_role). Feature exclusiva de Plan Elite.

-- Activación por gimnasio (mismo criterio que reposoCheckin) + contador de
-- uso mensual con techo duro para evitar una factura sorpresa de IA.
alter table public.gimnasios
  add column if not exists asistente_ia_activo boolean not null default false,
  add column if not exists asistente_ia_llamadas_mes int not null default 0,
  add column if not exists asistente_ia_mes_actual date;

-- Requerido por el workflow de "cumpleaños" (n8n). Nullable: se completa de a
-- poco, no se le exige a los clientes ya cargados.
alter table public.clientes
  add column if not exists fecha_nacimiento date;

-- Log de avisos generados por IA + base del dedupe anti-loop (mismo patrón
-- que ultimo_aviso_morosidad_enviado_en, pero acá por `tipo` porque hay
-- varios workflows). cliente_id nulo = aviso al dueño (ej. resumen_mensual).
create table avisos_ia (
  id          uuid primary key default gen_random_uuid(),
  gimnasio_id uuid not null references gimnasios (id) on delete cascade,
  cliente_id  uuid references clientes (id) on delete cascade,
  tipo        text not null check (tipo in ('riesgo_abandono', 'cumpleanos', 'resumen_mensual')),
  contenido   text not null,
  enviado_en  timestamptz not null default now()
);

-- El dedupe consulta "¿ya se mandó este tipo a este cliente en la ventana X?";
-- este índice cubre esa consulta (incluye el caso cliente_id is null, vía
-- coalesce en la query de la app, no acá).
create index on avisos_ia (gimnasio_id, cliente_id, tipo, enviado_en desc);

alter table avisos_ia enable row level security;

-- Lectura: solo el dueño del gimnasio (card de ajustes / futuro historial).
-- Nada de insert/update/delete por RLS: siempre entra por service_role desde
-- /api/n8n/notificar, nunca desde el cliente.
create policy avisos_ia_select on avisos_ia for select
  using (gimnasio_id = current_gimnasio_id() and is_dueno());
