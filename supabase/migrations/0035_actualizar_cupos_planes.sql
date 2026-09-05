-- Migración 0035: Actualizar capacidades de socios en planes_plataforma
-- Básico: 50 socios (antes 30)
-- Pro: 150 socios (antes 45)
-- Elite: 350 socios (antes 300)

update public.planes_plataforma
  set max_socios = 50, precio_mensual = 25000
  where nombre = 'Básico';

update public.planes_plataforma
  set max_socios = 150, precio_mensual = 38000
  where nombre = 'Pro';

update public.planes_plataforma
  set max_socios = 350, precio_mensual = 55000
  where nombre = 'Elite';
