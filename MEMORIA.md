# MEMORIA DE CORTO PLAZO (Agentes)

> **Regla de Cierre:** Al finalizar cada feature o sesión, el agente debe actualizar este archivo con 1 o 2 viñetas telegráficas sobre lo que acaba de hacer (en UTF-8). NO leas el contexto completo para actualizar esto.

## Últimos Cambios

- **Kit Comercial & Arsenal Partner**: Añadidas guías completas en `/panel/partner`: comparativa de planes (Inicial, Pro, Elite con AFIP), pitch 'Por qué SysGym', paso a paso de alta de dueño, matriz mata-objeciones, calculadora interactiva de ganancias, demo en vivo de alumno y ficha comercial descargable.
- 2780386 fix(partner): sacar referencias a sysgym.app sin DNS configurado
- c8bdb6b fix(rutina): sacar el bump de mav del techo por rol + reestructurar PULL
- b6d34e3 fix(login): tapar el cartel final quemado del video con blur + degradado
- fd8169c fix(rutina): 3 bugs biomecánicos reales + crédito sinergista faltante
- 2ed85a5 feat: add E2E test for SysGym Partner program and fix gating issues
- **Partner (Detalles)**: Registro, códigos referidos, Fast-Start Bonus, rangos, link en top bar, etc.
- **Login Directo**: Soporte para login por nombre, email o teléfono en cuentas individuales.
- **Gestión Gimnasios**: Hard delete de gimnasios.
- Fix login: Se quitó el blur del video para mostrar el texto y se invirtió el orden de los tabs, dejando Cuenta Individual por defecto con mensaje de afiliación.
- Auth: Se agregó soporte de login mediante OAuth para Apple, Facebook y X (Twitter) junto con Google, usando un nuevo grid de botones en la UI.
- Migración 0054: fix performance advisors RLS (auth.uid() -> select) + índices duplicados registros_entrada, falta aplicar
- Migración 0055: fusiona/achica RLS policies duplicadas (multiple_permissive_policies, 12 tablas), falta aplicar
- Migración 0055 aplicada: multiple_permissive_policies 98->0, confirmado con advisors
- Migración 0056: 22 índices para FKs sin cubrir (unindexed_foreign_keys), falta aplicar
- Migración 0056 aplicada: unindexed_foreign_keys resuelto (22 idx). Advisors performance/security limpios salvo leaked-password (requiere Pro) y unused_index (esperable, sin trafico aun)
- Fix: Cambiado object-center a object-bottom en el video/imagen del login para evitar el corte feo del texto y el degradado al cambiar tamaño de pantalla.
- Actualizado PLAN_PARTNERS_Y_GATING.md incorporando mejoras de comisiones, topes y antifraude.
- Fix (Refinement): El video renderizado tenía un borde sucio quemado en la parte inferior. Se extendió el DOM element 32px hacia abajo para que el overflow-hidden lo recorte limpiamente.
- Implementación completa y cierre de PLAN_PARTNERS_Y_GATING.md: banner y métrica X/40 en Dashboard, gating estricto #41 con rollback y CTA en alta de cliente, y tope de 2 rutinas/mes en cuentas gratuitas (E2E 13/13 OK).
- **Consola Admin /admin/partner & Simulación E2E (2026-09-11)**: Agregada vista dev para listar partners activos con balance RPC y links de referidos, simulación protegida de gimnasios/pagos (prefijo SIM_/DEMO_) y botón de limpieza masiva de datos de prueba.
- feat(admin/partner): cola de retiros pendientes + marcar pagado/rechazado (marcarPayoutAction), sin mover plata real
- **Gestión de Retiros de Partners en /admin/partner (2026-09-11)**: Cola de liquidación con copia directa de CBU/Alias, procesamiento de solicitudes (marcar pagado con comprobante o rechazar), notificación interna 'retiro_pagado' al embajador y recálculo inmediato de balances.
- feat(cron): recalcular_estado_cuota() ahora corre a diario en /api/cron/cuotas (antes solo on-demand)
- Migraciones 0039 (gestion gimnasios) y 0042 (alerta abandono) aplicadas en Supabase
- feat(partner): anti-fraude sección 5 — hold 10 días en comisiones (estado pendiente/aprobada/revertida), reversión automática si el pago_plataforma deja de estar aprobado, reautenticación con contraseña + cooldown 48h para cambiar CBU/alias de cobro, auditoría en admin_audit_log. Migración 0057, falta aplicar.
- Flujo /panel/plan (pre-fill email Checkout Pro y CTA de upgrade dinámico), detección anti-fraude partners /admin/partner (auto-referido y ráfaga <48h con alertas dev/UI) y hápticos táctiles en tracking de series /mi/rutina.
- Optimización de tokens (2026-09-11): Limpieza de encoding UTF-16 corrupto en MEMORIA.md, creación de .claudeignore, actualización de .gitignore (build-output.txt) y cambio de imports forzados (@) por consultas on-demand en CLAUDE.md.
- Skill de Arquitectura (2026-09-11): Creada skill GPS compartida en .agents/skills/sysgym-architecture/SKILL.md para ubicación instantánea de rutas, server actions y tablas sin quemar tokens buscando en el repo.
- Auditoría schema sysgym-architecture (2026-09-11): Corregidas tablas profiles, pagos, partner_payouts, rutina_plantillas y cuotas (clientes.estado_cuota) verificadas contra las 57 migraciones de Supabase.

## URLs del Proyecto

- **URL Producción (Vercel):** https://gimnasio-app-rose.vercel.app
- **Supabase Auth Callback:** https://adrkdortznimrlungwoy.supabase.co/auth/v1/callback- Diagnóstico y fix error rutina_items_tecnica_check (2026-09-11): Creada migración 0058 para incluir 'fst7' en el CHECK constraint de rutina_items.tecnica.
- Humanización de avisos y errores (2026-09-11): Se reemplazó el JSON crudo en alertas de errores con humanizarError en lib/admin/errores.ts, mejorando títulos en español claro, desglose de causas técnicas, notificaciones push directas y desplegable en /admin/errores y /admin/salud.

- Drop Sets: migración 0059 (registro_progreso.detalles_tecnica jsonb + serie_index), src/lib/progreso/tipos.ts (DropPaso, calcularPasosSugeridos), src/lib/rutina/dropset-actions.ts (guardarDropSetCliente, obtenerUltimoDropSetCliente). UI a cargo de Gemini en rutina-editor.tsx.
- UI de Drop Sets: Creado PanelDropSet táctil con cálculo automático de reducciones del 20-25%, botones + / - y confirmación en 1 toque integrado en el tracker de series de rutina-editor.tsx con feedback háptico y persistencia local/remota.
- Soporte multi-usuario staff (rol 'staff', migración 0062, requireStaffODueno, panel reducido, alta/desactivación en /panel/ajustes y protección de bajas).
