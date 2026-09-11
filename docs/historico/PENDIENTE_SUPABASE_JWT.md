# PENDIENTE · Subir el JWT expiry en Supabase

**Estado:** sin hacer (requiere acceso al dashboard de Supabase, no se puede por SQL).
**Fecha nota:** 2026-09-02

## Problema

Cada deploy a producción en Vercel deja al usuario deslogueado. Causa: el
access token (JWT) de Supabase dura **1 h por defecto**. Si no se usa la app en
más de una hora y se vuelve justo después de un deploy, el primer load dispara
muchas requests en paralelo (middleware + RSC + prefetch), todas intentan
refrescar con el mismo refresh token, Supabase detecta reuso y **revoca la
sesión entera**. El deploy lo agrava porque limpia el cache de Vercel y todo
arranca en frío a la vez.

## Ya hecho (código)

- `src/middleware.ts`: los requests de prefetch pasan sin refrescar el token
  (guard con `next-router-prefetch` / `purpose: prefetch`). Es refuerzo, no el
  fix de fondo.

## Falta (manual, 1 vez)

Supabase Dashboard → proyecto → **Authentication → Settings**:

1. **Access token (JWT) expiry**: cambiar `3600` → `86400` (24 h).
2. Si aparece **Refresh token reuse interval**: subir a `30`.
3. Guardar.

Costo del cambio: si se revoca/expulsa a un usuario, su token sigue válido
hasta 24 h. Aceptable para esta app.

### Alternativa por Management API (si no se quiere entrar al dashboard)

```bash
curl -X PATCH \
  "https://api.supabase.com/v1/projects/{PROJECT_REF}/config/auth" \
  -H "Authorization: Bearer {SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{ "jwt_exp": 86400 }'
```

- `PROJECT_REF`: el ref del proyecto (parte del `NEXT_PUBLIC_SUPABASE_URL`).
- `SUPABASE_ACCESS_TOKEN`: token personal de https://supabase.com/dashboard/account/tokens

## Verificar que quedó

Después del cambio, esperar >1 h sin tocar la app, hacer un deploy, entrar por
producción: la sesión debe seguir activa.
