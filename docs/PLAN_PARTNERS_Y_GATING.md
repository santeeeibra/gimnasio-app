# Plan de Arquitectura y Negocio: SysGym Partner & Gating Plan Inicial

Documento consolidado de especificaciones, reglas de negocio y arquitectura acordadas para el crecimiento viral de SysGym y protección de márgenes.

---

## 1. Visión y Objetivos Clave

1. **Adopción Masiva de Gimnasios sin Fricción:**
   - Evitar que los dueños sientan que "pierden tiempo" probando una app que se desactiva a las 2 semanas.
   - Migración llave en mano en 24hs desde Excel/software anterior.
2. **Candado de Crecimiento (Cap de 40 Alumnos):**
   - Un gimnasio de barrio (<40 alumnos) puede operar de forma gratuita.
   - Un gimnasio estándar/mediano prueba la app con un turno completo (~40 alumnos). Al llegar al alumno #41, el salto a cuenta paga es natural e inevitable porque ya tienen el gimnasio digitalizado y los alumnos fidelizados.
3. **Programa de Embajadores/Partners Rentable (10% + Bonos):**
   - Garantizar el 90% de margen recurrente para SysGym.
   - Premiar fuertemente a los colaboradores que logren hitos comerciales (5 y 10 gimnasios pagos).

---

## 2. Gating del Plan Inicial (Límite de 40 Alumnos Activos)

### A. Reglas de Negocio
- **Cap Máximo:** 40 alumnos activos por gimnasio en plan gratuito.
- **Acción al Alumno #41:** Rechazo de alta con código `LIMIT_EXCEEDED_UPGRADE_REQUIRED` y llamada a la acción para pasar al Plan Pro (alumnos ilimitados).
- **Restricciones en Cuentas Gratuitas:**
  - Máximo 1-2 rutinas mensuales generadas con motor científico en cuentas individuales para evitar explotación de rutinas gratuitas.
  - No exportación masiva en PDF o texto plano.
  - La rutina solo vive y se ejecuta en la app (pesos, RIR, descansos, hápticos, récords).

### B. Métrica Visible en Dashboard
- Barra de estado permanente para el dueño: `Alumnos activos: X / 40`.
- Alerta proactiva al superar los 35 alumnos para anticipar la suscripción.

---

## 3. Programa SysGym Partner (Afiliados B2B)

### A. Estructura de Comisiones
- **10% Mensual Recurrente (Topado a 24 meses):**
  - Sobre el pago neto de cada gimnasio referido durante sus primeros 24 meses de suscripción Pro activa. Protege el margen a largo plazo.
  - No se paga por gimnasios en plan gratuito (<40 alumnos); la comisión comienza cuando el gimnasio pasa al Plan Pro.

### B. Bonos en Efectivo por Hitos (Pagos Únicos)
Para incentivar la captación activa de múltiples gimnasios:

| Hito | Condición | Bono Único |
|---|---|---|
| **Hito 1** | **5 gimnasios pagos** (Histórico, con min. 2 meses activos) | **$30.000 ARS** |
| **Hito 2** | **10 gimnasios pagos** (Histórico, con min. 2 meses activos) | **$80.000 ARS** + Merchandising oficial |

*Regla:* Los hitos se miden sobre altas históricas acumuladas. Para evitar estafas (colusión donde el gimnasio se da de alta, cobra el bono y se da de baja al mes 1), cada gimnasio solo computa para el bono si renueva al menos su segundo mes. Cada bono se paga una única vez por partner.

### C. Reglas de Billetera, Liquidación y Antifraude
- **Umbral de Retiro:** Mínimo acumulado de **$10.000 ARS**.
- **Medio de Cobro:** CBU, CVU o Alias de Mercado Pago.
- **Ciclo de Liquidación:** Solicitudes procesadas entre el 1 y el 5 de cada mes a mes vencido.
- **Ventana de Seguridad:** Período de gracia de 7 días tras el cobro (aplica también para el pago de bonos al partner) para evitar contracargos/reembolsos.
- **Prevención de Self-referral:** Un `referral_code` no puede vincularse a un gimnasio cuyo `owner_id` coincida con el usuario del partner (o cuentas vinculadas).

---

## 4. Esquema de Datos Requerido (Supabase / Postgres)

1. **Tabla `partners`:**
   - `id`, `user_id` (FK auth.users), `referral_code` (único, slug), `cbu_alias`, `created_at`.
2. **Tabla `gimnasios` (extensión de la tabla existente):**
   - Añadir columnas: `plan` ('starter' | 'pro'), `referred_by_partner_id` (FK partners.id), `max_members` (default: 40).
3. **Tabla `clientes` (existente):**
   - El conteo de "alumnos activos" se consulta directamente de esta tabla filtrando por estado o acceso habilitado. No se crean tablas paralelas.
4. **Tabla `partner_commissions`:**
   - `id`, `partner_id`, `gym_id`, `amount`, `source` ('recurring_10' | 'milestone_5' | 'milestone_10'), `status` ('pending' | 'approved' | 'paid'), `created_at`.
5. **Tabla `partner_payouts`:**
   - `id`, `partner_id`, `amount_requested`, `status` ('requested' | 'completed' | 'rejected'), `payment_details`, `processed_at`.

---

## 5. Anti-Fraude del Programa Partner

Reglas duras que tienen que quedar en el esquema/lógica antes de mover plata real.

### A. Vectores identificados y mitigación

1. **Auto-referido** (partner se da de alta su propio gym o el de un conocido
   para cobrar comisión/bonos de sí mismo).
   - Al vincular `referred_by_partner_id`, comparar DNI / email / teléfono del
     dueño del gym contra los del partner (`profiles`). Match exacto → no
     bloquear (hay falsos positivos con familia), pero la comisión nace en
     `revision_pendiente` y no se auto-aprueba.
2. **Comisión sobre "firma", no sobre plata real** (se dispara con
   `plan='pro'` en vez de con el pago liquidado).
   - La comisión se genera únicamente desde `pagos.estado='confirmado'`,
     nunca desde el flag de plan.
3. **Cobro + contracargo/reembolso posterior en MP** (ya se pagó la comisión
   sobre plata que después se devolvió).
   - Hold de **7-14 días** antes de que la comisión pase de `pending` a
     `approved`/pagable (mismo criterio que la ventana de seguridad de
     retiro del punto 3.C). Si el pago original se revierte en ese lapso →
     la comisión pasa a `reversed` automáticamente y se descuenta del
     próximo payout, nunca queda como número negativo suelto.
4. **Ciclo de altas/bajas para juntar hitos** (gyms de 1 mes que se reciclan
   para farmear el bono de "5/10 simultáneos" varias veces).
   - El hito se calcula sobre **acumulado histórico de gyms distintos**, no
     "activos ahora". Y un gym solo cuenta para el hito si acumuló **60-90
     días de pagos confirmados sin reversión** (no sirve un gym que paga un
     mes y se cae).
5. **Ráfaga de referidos** (muchos gyms nuevos del mismo partner en poco
   tiempo → patrón de granja de cuentas).
   - Más de 3-4 referidos en 24-48h → esas comisiones nacen con flag de
     revisión manual, no se auto-aprueban. No bloquea el alta del gym, solo
     retiene el pago hasta revisión.
6. **Robo de sesión / cambio de cuenta de cobro** (alguien compromete la
   sesión del partner y redirige el próximo retiro a su propio alias/CBU).
   - Cambiar alias/CBU requiere reautenticar con contraseña (mismo patrón que
     `resetearPinConContrasena` de Ingresos) + cooldown de **48h** antes de
     que ese alias nuevo pueda usarse para pedir un retiro. Primer payout de
     cada partner y cualquiera sobre un monto umbral → aprobación manual
     tuya al principio, no 100% automático.
7. **Sin trazabilidad ante disputa** (reclamo de "no me pagaron" sin logs).
   - Reusar el patrón de `admin_audit_log`: toda creación/reversión/
     aprobación/pago de `partner_commissions` y `partner_payouts` queda
     auditada, igual que `cambiar_estado_gym`.

### B. Reglas duras a nivel esquema

- Comisión nace de `pagos.estado='confirmado'`, nunca de `plan`.
- Hold de 7-14 días antes de ser pagable + reversión automática ante refund/
  chargeback del pago original.
- Hito = acumulado histórico + antigüedad mínima por gym (60-90 días
  pagando), no "simultáneos".
- Match DNI/teléfono/IP partner↔dueño referido → revisión manual, no bloqueo
  automático.
- Cambio de alias de cobro → reautenticación + cooldown 48h.
- Todo movimiento de plata queda auditado (mismo patrón `admin_audit_log`).

---

## 6. Próximos Pasos de Implementación

1. **Fase 1 (Backend - Claude):**
   - Migración SQL con RLS, triggers y conteo de alumnos.
   - Server Actions y endpoints para vinculación de referidos, cobro de suscripción y liquidaciones.
2. **Fase 2 (UI / UX / Frontend - Chat Nuevo):**
   - Barra de progreso interactiva de 40 alumnos en el Dashboard del gimnasio.
   - Modal de felicitaciones / upgrade al alumno #41.
   - Panel de control para el Partner (link con copia rápida a WhatsApp, tarjeta de comisiones, progreso al bono de 5/10 gyms y solicitud de retiro con hápticos).
