# Pendientes — Vista Dev / Consola de soporte (`/admin`)

> Estado al 2026-09-02. La impersonación real ya está hecha y en producción
> (commits `ea59d85`, `9d990c7`): el superadmin entra como dueño o socio desde
> `/admin/gimnasios/[id]`, banner "Volver a soporte" en `/panel` y `/mi`, y link
> "Soporte (dev)" en el panel visible solo para `SUPERADMIN_ID`.

Lo que falta, por orden sugerido:

## 1. Disparadores de estado por socio
Botones en el detalle del gym (`/admin/gimnasios/[id]`) para forzar en un socio
de prueba:
- cuota **por vencer** (dispara aviso de morosidad)
- cuota **vencida**
- **trial por expirar** (faltando pocos días)
- **trial expirado**

Hoy solo se puede el toggle `estado` del gym completo (`activo` /
`solo_lectura`). Falta lo granular: setear `clientes.fecha_vencimiento` /
`clientes.en_prueba` de una fila puntual vía `service_role`, auditado.

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
