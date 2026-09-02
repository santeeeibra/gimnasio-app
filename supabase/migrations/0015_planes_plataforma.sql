-- Planes de plataforma: la plataforma le asigna a cada gimnasio un plan con
-- un tope de socios y un precio (informativo por ahora). Ortogonal a
-- gimnasios.estado (prueba/activo/solo_lectura), que sigue manejando el trial.
-- Idempotente: se puede correr más de una vez.

-- ─────────────────────────────────────────────────────────────
-- 1) Catálogo global de planes
-- ─────────────────────────────────────────────────────────────
create table if not exists public.planes_plataforma (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null,
  max_socios     int,                              -- null = ilimitado
  precio_mensual numeric(12,2) not null default 0,
  activo         boolean not null default true,
  orden          int not null default 0,
  creado_at      timestamptz not null default now()
);

comment on table public.planes_plataforma is
  'Planes que la plataforma le cobra a cada gimnasio. max_socios null = ilimitado.';

-- ─────────────────────────────────────────────────────────────
-- 2) Asignación del plan a cada gimnasio
-- ─────────────────────────────────────────────────────────────
alter table public.gimnasios
  add column if not exists plan_plataforma_id uuid
    references public.planes_plataforma (id) on delete set null,
  add column if not exists plan_plataforma_vence_el date;

comment on column public.gimnasios.plan_plataforma_vence_el is
  'Fin del período pago del gimnasio. Vencido => candidato a solo_lectura (fase 5).';

-- ─────────────────────────────────────────────────────────────
-- 3) Seed inicial (solo si la tabla está vacía)
-- ─────────────────────────────────────────────────────────────
insert into public.planes_plataforma (nombre, max_socios, precio_mensual, orden)
select v.nombre, v.max_socios, v.precio_mensual, v.orden
from (values
  ('Free',      30,          0::numeric, 1),
  ('Base',      150,         0::numeric, 2),
  ('Pro',       400,         0::numeric, 3),
  ('Ilimitado', null::int,   0::numeric, 4)
) as v(nombre, max_socios, precio_mensual, orden)
where not exists (select 1 from public.planes_plataforma);

-- ─────────────────────────────────────────────────────────────
-- 4) RLS: solo service_role (consola de soporte). Sin policies => nadie más
--    lee ni escribe. Cuando la vista del dueño necesite leer su plan
--    (fase 4) se agrega una policy de SELECT acotada.
-- ─────────────────────────────────────────────────────────────
alter table public.planes_plataforma enable row level security;
