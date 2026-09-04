-- Actualiza los precios de los planes de plataforma que quedaron en $0 en la
-- migración 0015. Los precios son orientativos y se pueden cambiar desde
-- /admin/planes. Free sigue siendo $0.
-- Idempotente.

update public.planes_plataforma
set precio_mensual = case nombre
  when 'Free'      then 0
  when 'Base'      then 15000
  when 'Pro'       then 25000
  when 'Ilimitado' then 40000
  else precio_mensual
end
where precio_mensual = 0
  and nombre in ('Free', 'Base', 'Pro', 'Ilimitado');
