-- Facturación electrónica AFIP: opcional por gimnasio (opt-in del dueño).
-- Solo guarda datos fiscales y el flag de habilitación; la emisión real
-- contra WSFE se implementa cuando el dueño cargue sus certificados AFIP.

alter table public.gimnasios
  add column if not exists afip_habilitado boolean not null default false,
  add column if not exists afip_cuit text,
  add column if not exists afip_razon_social text,
  add column if not exists afip_condicion_iva text,
  add column if not exists afip_punto_venta integer;

comment on column public.gimnasios.afip_habilitado is
  'Toggle opcional: el dueño decide si emite factura electrónica AFIP por cada cobro.';
comment on column public.gimnasios.afip_cuit is 'CUIT del gimnasio, 11 dígitos sin guiones.';
comment on column public.gimnasios.afip_condicion_iva is
  'Condición frente al IVA: monotributo | responsable_inscripto | exento.';
comment on column public.gimnasios.afip_punto_venta is 'Punto de venta habilitado en AFIP para la factura electrónica.';
