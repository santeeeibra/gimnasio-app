Proyecto: SysGym (Next.js + Supabase), repo en D:\SISTEMA GYM.

Ya se corrigió un bug donde al reabrir la PWA (bfcache/background) se veía
el rol/vista vieja (dueño viendo panel de cliente). El fix está en
src/components/offline/revalidar-al-volver.tsx, enganchado en
src/app/panel/layout.tsx y src/app/mi/layout.tsx (fuerza router.refresh()
en pageshow con persisted=true y en visibilitychange). Verificalo antes de
tocar nada relacionado a sesión/rol para no pisarlo.

Necesito dos cosas más:

## 1. Refresh en vivo cuando cambian datos en la base

Cuando el dueño (panel) o un socio (mi) tienen datos desactualizados porque
otro usuario modificó algo en Supabase (ej: el dueño cobra una cuota y el
socio no ve el cambio hasta que recarga a mano), agregar revalidación en
vivo. Evaluar:
- Supabase Realtime (postgres_changes) suscripto a las tablas clave
  (clientes, pagos, rutinas, registros_entrada, caja) filtrado por
  gimnasio_id, disparando router.refresh() o revalidatePath en el cliente.
- O un polling liviano si Realtime complica demasiado el alcance.
No duplicar la lógica de RevalidarAlVolver.tsx, es complementaria (esa
cubre "reabrir app", esto cubre "app abierta y algo cambió en otro lado").

## 2. Modo offline real (el gym se queda sin internet y hay que poder seguir operando)

Hoy la app es 100% online: sin conexión no carga nada (no hay Service
Worker de cache, solo public/sw.js que es únicamente para Web Push). Ya
existe una cola de escrituras pendientes en src/lib/offline/cola.ts
(usada por src/components/offline/provider.tsx) para check-in y alta de
cliente cuando falla la escritura — reutilizarla, no reinventarla.

Falta el lado de LECTURA offline: que el dueño pueda ver la lista de
clientes/rutinas y el socio pueda ver su rutina del día sin conexión.
Evaluar:
- Cache de datos críticos (lista de clientes, rutina activa del socio,
  estado de cuota) en IndexedDB o localStorage, refrescado en cada carga
  online exitosa.
- Un Service Worker con Workbox/Serwist para cachear el shell de la app
  (assets, rutas /mi y /panel) y servir el último dato bueno cuando no hay
  red, mostrando un aviso claro de "datos de hace X" (no ocultar que está
  desactualizado).
- Definir qué pantallas necesitan esto de verdad (rutina del socio y
  check-in del tótem son la prioridad; reportes/caja pueden seguir
  requiriendo conexión).

Priorizar: primero el fix de refresh en vivo (más contenido, menos riesgo),
después diseñar el modo offline de lectura como feature aparte, sin romper
la cola de escritura existente.
