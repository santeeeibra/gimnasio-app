# MEMORIA DE CORTO PLAZO (Agentes)

> **Regla de Cierre:** Al finalizar cada feature o sesión, el agente debe actualizar este archivo con 1 o 2 viñetas telegráficas sobre lo que acaba de hacer (en UTF-8). NO leas el contexto completo para actualizar esto.

## Últimos Cambios
- **Arquitectura Offline-First (100% Funcional sin Internet) (2026-09-15)**: Implementada la precarga automática de la pantalla `/checkin` en `sw.js` (`sysgym-shell-v2`), junto con el almacenamiento masivo de socios en `IndexedDB` (`src/lib/offline/indexeddb.ts`) y la sincronización background en `padron.ts` para permitir el check-in local instantáneo con resincronización automática de asistencias.
- **Exportación Global PDF/Excel con Logo SysGym e Imagen de Gráfico (2026-09-15)**: Integrada la marca oficial SysGym (`/logo-sysgym.png`) en los PDFs de comprobantes, ingresos, socios y caja diaria. Incorporada la captura de gráfico SVG interactivo dentro del PDF de Ingresos y creados los módulos `DescargarClientesPdf`, `DescargarClientesExcel`, `DescargarCajaPdf` y `DescargarCajaExcel`.
- **Reordenamiento Jerárquico /mi/rutina**: Reestructurado el layout visual exactamente en 7 pasos (Header -> Aforo -> Título -> Selector Día + Modo Foco -> Hero Card de Sesión Activa con badge Pulpo Volt `#10e7a0` -> Lista Ejercicios -> Acordeón suave `MasOpcionesAcordeon` colapsado con Agendar, Descargar PDF, Frase motivacional y Opciones de personalización con haptics).
- **Rediseño Topbar /mi**: Reestructurada la cabecera del alumno con avatar badge de Pulpo Volt (`#10e7a0`), botón primario "Mi QR de Ingreso" full-width destacado, menú de iconos ghost a la derecha (Actualizar + Tutorial) con feedback háptico y traslado del botón "Salir" a la vista de perfil (`/mi/perfil`).
- **Opciones y Personalización de Rutina**: Se movió el acordeón desplegable `Opciones y personalización de rutina` arriba de todo en el cliente (`src/app/mi/rutina/page.tsx`), ubicándolo antes del visor `<RutinaEditor>` para fácil acceso sin entorpecer la vista.
- **Aforo Dinámico Completo Pulpo Volt**: Integrada la trilogía de ilustraciones 3D de Pulpo Volt (`aforo-tranquilo.jpg`, `aforo-moderado.jpg`, `aforo-concurrido.jpg`) en `<BarraAforoAnimada />` cambiando dinámicamente según el % de aforo (`src/components/mi/barra-aforo-animada.tsx`).
- **Reordenamiento Rutina Cliente**: Se priorizó el visor de rutina (`<RutinaEditor>`) al inicio de la pantalla y se colapsaron todas las tarjetas de configuración (Regenerar, Armado Manual, Código Entrenador) en una sección desplegable inferior `Opciones y personalización de rutina` (`src/app/mi/rutina/page.tsx`).
- **Modo Foco Gym**: Renombrado "Modo Zen" a "Modo Foco Gym", agregando estado claro `☀️ Pantalla Encendida`, banner explicativo de Wake Lock + botones XL y haptic de éxito al activar (`src/app/mi/rutina/rutina-editor.tsx`).
- **Botón Compartir App**: Creado e integrado el componente `BotonCompartirApp` (`src/components/ui/boton-compartir-app.tsx`) con Web Share API nativa iOS/Android y fallback a portapapeles en `/mi`.
- **Splash Screen 9:16 oficial de Volt**: Reemplazada la pantalla de arranque simple por la portada 9:16 oficial de Volt (con animación 60fps de barra neón, pulso brillante y transición con micro-zoom GPU `scale(1.03)`).
- **Mascota Racha Activa**: Reemplazado el icono de racha activa por la nueva ilustración de Pulpo Volt muscular en `public/mascota/racha-activa.png`, integrado en `RachaCard`, `FeedLogros` y `CartelLogro`.
- **Credencial Digital 3D con QR Centrado (2026-09-15)**: Mapeado con precisión UV del atlas de `card.glb` en `lanyard.tsx` para proyectar el código QR de acceso perfectamente centrado tanto en el frente (`U ∈ [0, 0.5]`) como en el reverso (`U ∈ [0.5, 1.0]`), con acabado PVC blanco de alto contraste y enlace directo con `CredencialQRModal`.
- **Check-in QR & Racha Inteligente Adaptativa (2026-09-13)**: Implementada Credencial Digital QR del alumno (`CredencialQRModal`), pestaña Escáner QR con cámara WebRTC/BarcodeDetector nativa en tótem (`/checkin`), y recálculo de Racha Inteligente en `deteccion.ts` respetando los días programados por semana de la rutina (`dias_por_semana`).
- **Fix Identificador Claude Haiku (2026-09-14)**: Corregido el nombre del modelo de Anthropic de `claude-haiku-4-5-20251001` (inexistente, producía error HTTP 400) a `claude-3-5-haiku-20241022` en `src/lib/ia/llm-fallback.ts`.
- **Pulpo Volt Mareado en Errores UI (2026-09-14)**: Guardada la ilustración oficial `public/mascota/pulpo-mareado.png` generada con ChatGPT e integrada dentro de la tarjeta de error del alumno (`PulpoAsistenteChat`) con fondo oscuro e iluminación radial volt.
- **Ícono de App / PWA (2026-09-14)**: Configurado el ícono oficial (Opción 2: tentáculo con mancuerna y logo SYSGYM) en `public/icon-512.png`, `public/icon-192.png` y `public/apple-icon.png` e integrado en `src/app/layout.tsx` y `manifest.webmanifest`.
- **Sección Perfil en Nav Inferior y Aclaración Mis Archivos (2026-09-13)**: Agregada pestaña Perfil (`/mi/perfil`) a la barra de navegación inferior del cliente (`MiBottomNav`) y sumada explicación explícita (aptos médicos, certificados, dietas/nutrición) en la sección "Mis archivos y documentos".

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
- Marca de agua sutil SysGym (Hecho con SysGym • Gestioná tu progreso así • sysgym.app) en cartel de logro compartido por el socio, con Web Share nativo y branding de gimnasio intacto.
- feed-logros.tsx estilizado con Apple HIG, variantes record/racha (ámbar/trofeo y esmeralda/llama), PulpoCard y hápticoSeleccion.
- Celebración en vivo de récord personal en /mi/rutina: componente ConfetiCelebracion nativo en Canvas 60fps/120fps, aura lumínica, fanfarria inmediata y apertura garantizada de CartelLogro.

- 2026-09-12: feature/asistente-ia-n8n — migración 0064, card Asistente IA en /panel/ajustes, endpoint /api/cron/asistente-ia y workflow diario en GitHub Actions (0 costo, sin Oracle ni tarjetas).
- Implementado Módulo de Control de Caja Diaria, Turnos y Arqueo Ciego (Plan Elite): migración 0065, gating en plan-gate.ts, actions en /panel/caja y vinculación automática con cobros manuales de cuotas.

- Login rediseñado "SysGym Motion" (src/app/login/login-form.tsx): tabs Cuenta individual/Con DNI, login social Google/Facebook/X y boton "Probar app (demo)" sin registro; ya estaba en produccion, se documento recien ahora en MAPA_PROYECTO.md.
- Consola Dev Cockpit en /admin (superadmin, gimnasio sante): switcher 1-click Duenio/Socio, credenciales de testing, reset rapido de claves, selector de plan Elite/Pro/Basico y diagnostico de uso de Supabase; ya estaba en produccion, se documento recien ahora en MAPA_PROYECTO.md.
- Rediseño Mostrador Operativo y Navegación PC (2026-09-12): /panel transformado en Centro de Operaciones sin gráficos pesados (estado en vivo de caja del turno, grid de atajos rápidos con iconos de 20px [Cobrar Cuota, Nuevo Socio, Caja, Modo Check-in], métricas operativas del día y distribución en 2 columnas); menú lateral en PC ensanchado a 256px con iconos grandes y categorías semánticas (Mostrador, Gestión, Configuración).
- **Ajustes y Switch Asistente IA (2026-09-12)**: Corregida detección de Plan Elite en `plan-gate.ts` y `actions.ts` consultando con admin client (evitando que RLS en `planes_plataforma` devuelva null). Rediseñado switch `<Toggle>` con thumb blanco visible estilo iOS, badge de estado Activo/Inactivo, botón "Guardar cambios" al tope sin scroll y feedback de éxito/error inmediato con hápticos.
- **Mostrador Operativo y TV Live (1920x1080)**: Adaptabilidad total para monitores Full HD (2xl: max-w-[1720px], tipografía y cards escaladas) asegurando legibilidad a distancia y sin scroll innecesario.

- 2026-09-12: Fondo personalizado en pantalla de check-in (kiosko): migracion 0066 (bucket checkin-fondos), tema.checkinFondo (activo/imagenUrl/origen/oscurecido) en src/lib/tema.ts, card en /panel/ajustes (checkin-fondo-uploader.tsx) con galeria de presets (src/lib/checkin/fondos-preset.ts, vacia, agregar WebP en public/checkin-fondos/) + subida propia del dueno, renderizado en checkin/layout.tsx con overlay de oscurecido + watermark "Gestionado con SysGym". Migracion 0066 aplicada en Supabase (bucket checkin-fondos). Falta sumar imagenes precargadas.
- 2026-09-12: Fix CartelLogro de récord personal (src/components/logros/cartel-logro.tsx): portal a document.body con createPortal para evitar que quede atrapado y recortado dentro de elementos con CSS transform/overflow-hidden (como stagger-in en la lista de ejercicios); incluye bloqueo de scroll de fondo, soporte tecla Escape y z-[120].

- Fix de sintaxis en filtro de asistente-actions.ts y estrechado de tipos en pulpo-asistente-chat.tsx para desbloquear build de Vercel.
- **Misión E2E completada (2026-09-12)**: 5/5 tests verdes en Playwright (~29s) cubriendo login (cliente/dueño/inválido), cobro-socio (pago manual post-fix IDOR/N+1) y generar-rutina (motor científico desde panel de dueño).
- **Refactor UI/UX SysGym Standards (2026-09-13)**: Corrección de squircles (`rounded-[10px]/[12px]`), hápticos (`hapticoImpactoMedio`), touch targets (44px `h-11`) y números tabulares (`tabular-nums font-mono`) en `registro-partner`, `vista-switcher`, `onboarding-dueno`, `cliente-row` y modales de caja.



- **Aforo en Tiempo Real (2026-09-13)**: Medidor de aforo animado Liquid Glass en `/mi` y `/mi/rutina` (ventana 90min sobre `registros_entrada`) + control de `capacidad_maxima` con stepper táctil en `/panel/ajustes`.
- **Trilogía de Features Táctiles para Socio (2026-09-13)**:
  1. *Calculadora Visual de Discos* (`calculadora-discos.tsx`): Desglose gráfico de discos por lado para barra olímpica/liviana/W/Smith.
  2. *ATP Recovery Engine* (`timer-descanso.tsx`): Timer de descanso dinámico adaptado por RIR (0/fallo=180s, RIR 1-2=120s, RIR 3+=60s) con barra 60fps de recuperación de potencia.
  3. *Sustituto Express 1-Tap* (`modal-sustituto-express.tsx`): Reemplazo instantáneo de máquina ocupada por alternativas biomecánicas equivalentes.
- **Calculadora de Discos & Prensa de Piernas (2026-09-13)**: Fix físico de montado de discos (ahora encastran exactamente sobre el manguito cromado y empujan al tope central de la barra), más curvas realistas para Barra EZ y carro de Prensa 45°.






- **Fundamentación Científica y Entrenadores Profesionales en Rutinas (2026-09-13)**: Actualizado `src/lib/rutina/explicar.ts` integrando citas científicas explícitas (Schoenfeld, Israetel/RP, Beardsley, Grgic/PowerExplosive, Pradells, Glass, Nippard, Saladino) y dinamizado el desglose por día para eliminar frases genéricas repetitivas.

- **Zero-Bloat Social Loop (2026-09-13)**: Creada sección `ComunidadSeccion` (`src/components/logros/comunidad-seccion.tsx`) en `/mi` con 3 pestañas: Feed en vivo de récords con aplausos 👏 (`FeedLogros`), Ranking de Asistencia mensual (Top 5 + puesto personal con medallas 🥇 🥈 🥉) y Reto Mensual con avance de clases (0 tablas extras de Supabase, 0 MB de bloat, consultas agrupadas directo sobre `registros_entrada` y `logros_gimnasio`).

## Backlog de Features Innovadoras (Socio ↔ Gimnasio)
1. **Mapa de Ocupación por Zona & Espera en Máquinas (Equipment Live Radar)**: Disponibilidad estimada por áreas del gym basada en series registradas en tiempo real.
2. **Leaderboard & Desafíos Semanales del Gimnasio (Gym Challenges)**: Puntos automáticos por series/asistencia con ranking en vivo y medallas vectoriales del Pulpo Volt.
3. **Gym Jukebox (Votación de Playlist del Gym en Vivo)**: Socios con check-in activo votan/sugieren los temas que suenan en la sala.
4. **Asistente "Busco Spotter / Compañero de Carga" (Gym Buddy)**: Solicitud de ayuda en 1-tap para tirar Récord Personal en ejercicios pesados con aviso sutil al staff/socios en sala.


- [2026-09-13 23:10] Optimización UI /mi/perfil: botón guardar peso condicional/disabled con háptico, Pulpo Volt como avatar default, QR compacto en header, reducción de contraste en subida de archivos y agrupación de Ajustes de cuenta.

- [2026-09-14] Fix seguridad: scripts/reset-single-gym.mjs borraba TODOS los gimnasios != sante (clientes/rutinas/pesos) sin backup, corriendo contra la Supabase real (no hay stack local). Se agregó backupAntesDeBorrar() que vuelca todo a backups/*.json antes de cada borrado.

- [2026-09-14] Se extendió el backup de seguridad (scripts/lib/backup.mjs) a seed-gym-demo.mjs y seed-genesis-gym.mjs (respaldan pagos/registros_entrada/rutinas/rutina_items/registro_peso antes de sus .delete()). test-e2e-partner-gating.mjs quedó afuera a propósito: solo borra sus propios fixtures E2E_TEST_.
- Rediseño UI de /admin/payouts con modales y PulpoCard
- Fix de z-index y clipping en modal de QR en perfil usando createPortal
- Warmup de sesión: creada WarmupGeneralCard colapsable por default con feedback háptico acústico y animaciones 60fps antes de los ejercicios del día.
- [2026-09-14] Voz guiada migrada de Web Speech API a Edge TTS: nuevo /api/voz (msedge-tts, es-AR-TomasNeural) + caché predictiva en el navegador (Cache API, nada sube a Supabase). Timer de descanso ahora cuenta 10→1 hablado; Modo Zen lee nombre + técnica del ejercicio (tips_ia) encadenados; se anuncia "Serie N completada" al tildar cada serie.

- [2026-09-14] Corrido seed-genesis-gym.mjs para demo en gym real: genesisgym / dueno 38222444/gym2444, socio ejemplo 42210001/socio0001
- [2026-09-15] Fix bug rol viejo al reabrir PWA (RevalidarAlVolver.tsx: pageshow bfcache + visibilitychange -> router.refresh() en layouts /panel y /mi).

- 2026-09-15: Check-in y pago offline-first (padron local + cola con idempotency_key, techo de reintentos, procesamiento paralelo). Deployado en 608b93f y 87fdf08. Falta confirmar en el gym real que el check-in y el pago andan 100% sin internet (offline puro, no solo cortes) y probar alta de socio / caja offline (no cubierto todavia).

- 2026-09-15: Backend del checkins_queue offline. Migración 0070 (registros_entrada.client_ref + índice único cliente_id/client_ref) aplicada en Supabase. Nueva marcarIngresosLote (src/app/checkin/actions.ts) sincroniza el lote de IndexedDB con dedup real por client_ref. checkin-form.tsx ahora encola en checkins_queue (indexeddb.ts) en vez de cola.ts; nuevo src/lib/offline/sync-checkins.ts + CheckinsSync en provider.tsx lo vacía cada 30s con conexión. Queda pendiente que padron.ts proteja también esta cola nueva contra el refresh optimista (hoy solo protege la de cola.ts).

- 2026-09-16: PoC Memoji: fix error al cargar modelo 3D inexistente (/models/pulpo-volt.glb devolvía HTML 404/redirect provocando crash en Three.js). Se validó Content-Type en HEAD y se agregaron /models y /lanyard a PUBLIC_PATHS en middleware. Integrado modelo 3D real de Pulpo Volt (/models/pulpo-volt.glb) con auto-centrado de Box3, iluminación PBR estudio 3 puntos con rim-light neón #10e7a0, squash-and-stretch reactivo a mandíbula y controles flotantes. Corregida orientación con rotación base -90° (frente), modo espejo Euler YXZ, botones de inversión y calibración de centro neutral. Sumado modelo simplificado FBX ultraliviano (195 KB) con toggle de selección instantánea. Descargado nuevo modelo rigged FBX y convertido a GLB binario optimizado (/models/pulpo-volt.glb, 3.7 MB).
- PoC Memoji 3D Pulpo Volt: Migrado 100% a GLB rigged con SkeletonUtils.clone, tracking con dead-zone, clamping, rotación frontal calibrada y telemetría de blendshapes faciales.
- PoC Memoji 3D: Solucionado congelamiento y error de cámara. FaceLandmarker singleton con GPU delegate, throttle de inferencia a 30 FPS y fallback universal en getUserMedia.
