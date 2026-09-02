# Pendientes — Vista Dev / Consola de soporte (`/admin`)

> Estado al 2026-09-02. La impersonación real ya está hecha y en producción
> (commits `ea59d85`, `9d990c7`): el superadmin entra como dueño o socio desde
> `/admin/gimnasios/[id]`, banner "Volver a soporte" en `/panel` y `/mi`, y link
> "Soporte (dev)" en el panel visible solo para `SUPERADMIN_ID`.

Lo que falta, por orden sugerido:

## 1. Disparadores de estado por socio  ✅

`/admin/gimnasios/[id]` → card "Forzar estado de un socio (pruebas)":
`<select>` de socio + preset (`cuota_por_vencer` / `cuota_vencida` /
`trial_activo` / `trial_expirado`) → `forzarEstadoSocio` (service_role,
auditado). Setea `clientes.{en_prueba, prueba_iniciada_en, fecha_vencimiento,
estado_cuota, ultimo_aviso_morosidad_enviado_en}` y, para `trial_expirado`,
inserta un `registros_entrada`. Los push salen en la próxima corrida del cron
`cuotas`. `cuota_por_vencer` usa `dias_aviso_morosidad` del gym para que el
aviso dispare.

## 2. Probar cada tipo de push / mensaje
`/admin/push-prueba` hoy manda texto libre solo a los devices del superadmin.
Agregar un selector de plantilla para previsualizar cada notificación tal cual
le llega al cliente:
- bienvenida
- aviso de cuota por vencer / vencida
- rutina nueva asignada
- mensaje del dueño

## 3. Apartado de pago / plan de máximo de usuarios  (el más grande)
No existe ningún flujo de planes-de-plataforma todavía.
- tabla de planes de plataforma (límite de socios, precio)
- límite de socios por gym aplicado al dar de alta clientes
- pantalla de upgrade / "activar plan"
- estado de pago del gym

## 4. "Ver como" desde el panel del dueño impersonado  (chico)
Saltar a la vista de un cliente sin volver primero a `/admin`. Un "ver como" en
la lista de `/panel/clientes` que solo aparece cuando hay impersonación activa
(cookie `imp-activa`).
