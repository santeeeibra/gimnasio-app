# SPEC — Gestor de Morosidad (aviso automático de vencimiento)

> **Estado (2026-09-02): IMPLEMENTADO.** Migración real: `0012_gestor_morosidad.sql`
> (no `0010` como decía abajo — ya iban hasta `0011`). Config en `/panel/ajustes`
> con server action propia `actualizarDiasAvisoMorosidad` (separada de
> `actualizarTema`). Cron: 3ª vía en `src/app/api/cron/cuotas/route.ts` (los
> avisos fijos de 6/1 días siguen igual). Reset en `registrarPago`
> (`src/app/panel/clientes/actions.ts`). Falta aplicar la migración en Supabase.

## Qué hace
Manda un push automático al socio X días antes de que venza su cuota,
con X configurable por gimnasio (por defecto, el mismo valor que ya usa
la alerta roja: 5-6 días).

## Modelo de datos

- Nueva columna en `gimnasios`: `dias_aviso_morosidad` (int, default `5`).
- Nueva columna en `clientes`: `ultimo_aviso_morosidad_enviado_en` (date,
  nullable) — evita mandar el push más de una vez por ciclo de cuota.

Migración SQL nueva (numerar siguiente a `0009_checkin_prueba.sql`, ej.
`0010_gestor_morosidad.sql`).

## Configuración (dueño)

En `/panel/ajustes`, agregar un campo numérico:
"Avisar a los socios X días antes del vencimiento" → guarda en
`gimnasios.dias_aviso_morosidad`. Validar rango razonable (ej. 1-15).

## Lógica (cron diario)

Extender el cron existente (el mismo que corre `recalcular_estado_cuota()`,
Entregable 5) o correr en el mismo job:

1. Por cada cliente activo, calcular días restantes de cuota (igual que la
   alerta roja actual).
2. Si `días_restantes == gimnasios.dias_aviso_morosidad` DEL GIMNASIO de ese
   cliente Y `ultimo_aviso_morosidad_enviado_en` no es de este ciclo →
   enviar push ("Tu cuota vence en X días") + actualizar
   `ultimo_aviso_morosidad_enviado_en = hoy`.
3. Al registrarse un pago nuevo / renovación de cuota, resetear
   `ultimo_aviso_morosidad_enviado_en` a `null` para el próximo ciclo.

Reusar la infraestructura de Web Push ya existente (Entregable 3) — mismo
mecanismo que las notificaciones actuales, no crear un canal nuevo.

## Texto del push (v1, fijo, no personalizable)

"Tu cuota vence en {X} días. Recordá renovarla para seguir entrenando."

## Fuera de scope (v1)

- Envío por WhatsApp (queda como posible upsell futuro, requiere API externa
  con costo por mensaje).
- Múltiples avisos por ciclo (solo uno).
- Texto del mensaje personalizable por el dueño.

## Reglas generales del proyecto (recordar)

- Mobile-first, pasar por skill `emil-design-eng` si se toca UI.
- No usar `--volt` genérico si el campo de ajustes ya sigue un patrón
  existente en `/panel/ajustes` — mantener consistencia visual con lo que
  ya hay ahí.
- Nada de escritura libre sin validar rangos en el input de días.
