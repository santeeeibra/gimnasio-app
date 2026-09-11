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
- **10% Mensual Recurrente:**
  - Sobre el pago neto de cada gimnasio referido mientras mantenga su suscripción Pro activa.
  - No se paga por gimnasios en plan gratuito (<40 alumnos); la comisión comienza cuando el gimnasio pasa al Plan Pro.

### B. Bonos en Efectivo por Hitos (Pagos Únicos)
Para incentivar la captación activa de múltiples gimnasios:

| Hito | Condición | Bono Único |
|---|---|---|
| **Hito 1** | **5 gimnasios pagos activos** simultáneos | **$30.000 ARS** |
| **Hito 2** | **10 gimnasios pagos activos** simultáneos | **$80.000 ARS** + Merchandising oficial |

*Regla:* Cada bono se paga una única vez por partner y se financia con el propio flujo de las primeras cuotas de esos gimnasios.

### C. Reglas de Billetera y Liquidación
- **Umbral de Retiro:** Mínimo acumulado de **$10.000 ARS**.
- **Medio de Cobro:** CBU, CVU o Alias de Mercado Pago.
- **Ciclo de Liquidación:** Solicitudes procesadas entre el 1 y el 5 de cada mes a mes vencido.
- **Ventana de Seguridad:** Periodo de gracia de 7 días tras el cobro para evitar contracargos/reembolsos.

---

## 4. Esquema de Datos Requerido (Supabase / Postgres)

1. **Tabla `partners`:**
   - `id`, `user_id` (FK auth.users), `referral_code` (único, slug), `cbu_alias`, `created_at`.
2. **Tabla `gyms` (o extensión de tabla existente):**
   - `id`, `name`, `owner_id`, `plan` ('starter' | 'pro'), `referred_by_partner_id` (FK partners.id), `max_members` (default: 40).
3. **Tabla `gym_members`:**
   - Relación gimnasio-alumno para cálculo de conteo activo con validación en backend/trigger.
4. **Tabla `partner_commissions`:**
   - `id`, `partner_id`, `gym_id`, `amount`, `source` ('recurring_10' | 'milestone_5' | 'milestone_10'), `status` ('pending' | 'approved' | 'paid'), `created_at`.
5. **Tabla `partner_payouts`:**
   - `id`, `partner_id`, `amount_requested`, `status` ('requested' | 'completed' | 'rejected'), `payment_details`, `processed_at`.

---

## 5. Próximos Pasos de Implementación

1. **Fase 1 (Backend - Claude):**
   - Migración SQL con RLS, triggers y conteo de alumnos.
   - Server Actions y endpoints para vinculación de referidos, cobro de suscripción y liquidaciones.
2. **Fase 2 (UI / UX / Frontend - Chat Nuevo):**
   - Barra de progreso interactiva de 40 alumnos en el Dashboard del gimnasio.
   - Modal de felicitaciones / upgrade al alumno #41.
   - Panel de control para el Partner (link con copia rápida a WhatsApp, tarjeta de comisiones, progreso al bono de 5/10 gyms y solicitud de retiro con hápticos).
