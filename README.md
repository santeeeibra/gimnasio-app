# Sistema de gestión de gimnasios

SaaS multi-tenant (Next.js + Supabase). Ver `plan-proyecto-gimnasios.md` para el plan maestro.

## Estado

Entregable 1: scaffold + auth + panel del dueño.

- [x] Esquema de base con RLS por gimnasio (`supabase/migrations/0001_init.sql`)
- [x] Login por gimnasio + DNI + contraseña (email sintético interno)
- [x] Cambio de contraseña obligatorio en el primer ingreso
- [x] Panel dueño: resumen, clientes, alta de clientes, planes, registrar pagos
- [x] Vista cliente: estado de cuota
- [ ] Mensajería + push
- [ ] Rutinas (motor de reglas)

## Puesta en marcha

1. `npm install`
2. Crear proyecto en Supabase y correr `supabase/migrations/0001_init.sql` en el SQL editor.
3. Copiar `.env.local.example` a `.env.local` y completar URL + anon key + service role key.
4. Crear el primer gimnasio y su dueño:
   ```bash
   node scripts/seed.mjs "Gimnasio Olimpo" olimpo 30111222 "Juan Perez"
   ```
5. `npm run dev` y entrar en http://localhost:3000

## Notas de diseño

- El cliente se loguea con **DNI**; internamente se mapea a `dni@<slug>.gym.local`.
- Contraseña inicial: `gym` + últimos 4 dígitos del DNI. `debe_cambiar_clave` fuerza el cambio.
- El alta de clientes y el registro de pagos usan `service_role` en Server Actions
  (el dueño ya pasó por `requireDueno()`), el resto respeta RLS con la sesión del usuario.
