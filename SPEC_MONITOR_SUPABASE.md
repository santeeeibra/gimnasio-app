# SPEC — Monitor de uso de la base (límite de Supabase)

> Para pasarle a Claude Code. Referencia: `contex-sysgym.md` (sección
> "Memoria de progreso" ya anticipaba esto). Es un aviso para el ADMIN de
> la plataforma (vos), no para cada dueño de gym — el límite es del
> proyecto Supabase entero, compartido entre todos los gimnasios.

## Objetivo

Saber con tiempo cuándo el proyecto Supabase se acerca al límite del
plan (free tier: 500 MB de base de datos), antes de que un gimnasio se
quede sin poder registrar datos.

## 1) Medición

- Query `select pg_database_size(current_database());` — ya estaba
  contemplada en el contexto del proyecto para correr en un cron.
- Umbrales: aviso en 70% y en 90% del límite del plan actual (dejar el
  límite como constante fácil de cambiar si se sube de plan).
- Evitar spam: guardar en una tabla chica (ej. `monitor_db_estado`, una
  fila) el último umbral ya avisado, para no mandar el mismo aviso cada
  día — solo avisar de nuevo si sube de umbral (70→90) o si se resetea
  manualmente.

## 2) Aviso — dos canales (elegido: ambos)

- **Email**: el cron (nuevo endpoint `/api/cron/monitor-db`, mismo
  patrón que `/api/cron/cuotas` en `vercel.json`) manda un email a tu
  dirección cuando se cruza 70% o 90%. Usar un servicio simple con free
  tier (ej. Resend) — variable de entorno nueva para la API key +
  tu email de destino (`ADMIN_EMAIL` en `.env.local`/Vercel).
- **Panel admin**: pantalla nueva, separada del panel de cada gimnasio
  (no cuelga de `/panel/...` que es por-gimnasio) — ej. `/admin` o
  `/superadmin`, protegida por un check aparte (no alcanza con
  `is_dueno()`, que es por-gimnasio; puede ser tan simple como comparar
  tu propio `auth.uid()` contra un ID fijo en variable de entorno, o un
  rol nuevo `superadmin` en `profiles`). Muestra el % actual, tamaño en
  MB, y últimеo aviso disparado.

## 3) Cron

- Agregar a `vercel.json` → `crons`: nueva entrada apuntando a
  `/api/cron/monitor-db`, corre 1 vez por día (no hace falta más
  frecuencia, el crecimiento es lento).
- Mismo mecanismo de auth que el cron de cuotas (`CRON_SECRET` ya
  existe en el proyecto — reusar, no crear uno nuevo).

## No-goals

- No es un dashboard de métricas de negocio (eso es el ítem separado
  "Métricas resumen en el dashboard del dueño" que ya está en la cola
  para Claude Code, y es por-gimnasio, no de la plataforma).
- No purga ni borra datos automáticamente — solo avisa. La decisión de
  qué hacer al llegar al límite (subir de plan, purgar `registro_progreso`
  viejo, etc.) la tomás vos a mano.

## Criterio de aceptación

- Cron corre diario, calcula % de uso real contra el límite del plan.
- Al cruzar 70% o 90% por primera vez: llega el email y queda reflejado
  en `/admin` (o donde termine viviendo el panel admin).
- No se repite el mismo aviso por email día a día una vez ya notificado
  el umbral.
- La ruta admin no es accesible por un dueño de gimnasio común (probar
  con una cuenta de dueño normal, tiene que dar 403/redirect).
- Typecheck limpio.
