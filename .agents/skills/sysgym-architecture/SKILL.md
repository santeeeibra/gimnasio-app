---
name: sysgym-architecture
description: |
  Mapa de arquitectura y GPS de archivos de SysGym. Localiza al instante
  rutas (/panel, /mi, /admin, /checkin), server actions, componentes clave,
  tablas de Supabase y lógica de negocio (rutinas, pagos, partners)
  sin tener que explorar directorios ni quemar tokens con búsquedas a ciegas.
version: 1.0.0
---

# SysGym Architecture & Codebase Map (GPS de Archivos)

> **Regla de Oro de Tokens**: NUNCA busques directorios a ciegas ni leas archivos de 800 líneas. Usá este índice directo para saber en 1 segundo qué archivo tocar según la URL o feature solicitada.

---

## 1. Índice por Rol y URL

| URL visible | Vista / Función | Archivos Clave | Server Actions / Lógica | Tablas Principales |
|---|---|---|---|---|
| `/login` | Ingreso único (socio/dueño/superadmin) | `src/app/login/page.tsx`<br>`src/components/auth/login-form.tsx` | `src/app/login/actions.ts` | `auth.users`, `profiles`, `gimnasios` |
| `/login/olvide-clave` | Recuperación de contraseña | `src/app/login/olvide-clave/page.tsx` | `actions.ts`, `src/lib/email/enviar.ts` | `profiles` |
| `/checkin` | Tótem/tablet de ingreso por DNI | `src/app/checkin/page.tsx`<br>`src/components/checkin/checkin-form.tsx` | `src/app/checkin/actions.ts` | `registros_entrada`, `clientes` |
| `/r/[slug]` | Plantilla de rutina pública compartible | `src/app/r/[slug]/page.tsx` | `src/app/r/[slug]/actions.ts` | `rutina_plantillas`, `clientes` |
| `/registro-gimnasio` | Onboarding gym (soporta `?ref=CODIGO`) | `src/app/registro-gimnasio/page.tsx` | `actions.ts` | `gimnasios`, `profiles`, `partners` |
| `/registro-partner` | Registro embajador/partner | `src/app/registro-partner/page.tsx` | `actions.ts` | `partners` |

### A. Alumnos / Socios (`/mi`)
| URL | Función | Componentes | Server Actions / Lógica |
|---|---|---|---|
| `/mi` | Home del alumno, racha, accesos | `src/app/mi/page.tsx`<br>`src/components/logros/racha-seccion.tsx` | `src/lib/logros/` |
| `/mi/rutina` | Visor y editor de rutina, tracking de pesos/series | `src/app/mi/rutina/page.tsx`<br>`rutina-editor.tsx`<br>`dial-vertical-progreso.tsx` | `src/lib/progreso/actions.ts`<br>`src/lib/rutina/motor.ts` |
| `/mi/pagos` | Historial de pagos y pago MP | `src/app/mi/pagos/page.tsx`<br>`pagar-mp-button.tsx` | `src/app/mi/pagos/actions.ts`<br>`src/lib/pagos/` |
| `/mi/mensajes` | Bandeja de mensajes con el gym | `src/app/mi/mensajes/page.tsx`<br>`[id]/page.tsx` | `src/app/mi/mensajes/actions.ts` |
| `/mi/perfil` | Datos del alumno, peso, objetivos | `src/app/mi/perfil/page.tsx` | `src/app/mi/perfil/actions.ts` |
| `/mi/ajustes` | Tema, sonido, VAPID push | `src/app/mi/ajustes/page.tsx` | `src/lib/push/`, `src/lib/tema.ts` |

### B. Dueño de Gimnasio (`/panel`)
| URL | Función | Componentes | Server Actions / Lógica |
|---|---|---|---|
| `/panel` | Dashboard, métricas 7d/30d, retención | `src/app/panel/page.tsx`<br>`src/app/panel/panel-nav.tsx` | Server Components directos |
| `/panel/clientes` | Lista de socios, banking cards, altas | `src/app/panel/clientes/page.tsx`<br>`cliente-row.tsx`<br>`alta-form.tsx` | `src/app/panel/clientes/actions.ts` |
| `/panel/clientes/[id]` | Ficha del socio, rutina, cobros | `src/app/panel/clientes/[id]/page.tsx`<br>`rutina-panel.tsx`, `pago-form.tsx` | `src/app/panel/clientes/actions.ts` |
| `/panel/ingresos` | Cobranzas del mes, PIN de seguridad | `src/app/panel/ingresos/page.tsx`<br>`listado-ingresos.tsx` | `src/app/panel/ingresos/actions.ts` |
| `/panel/asistencia` | Historial de entradas / asistencias | `src/app/panel/asistencia/page.tsx` | Server Component queries |
| `/panel/mensajes` | Enviar avisos y chat a socios | `src/app/panel/mensajes/page.tsx`<br>`compose-form.tsx` | `src/app/panel/mensajes/actions.ts` |
| `/panel/plan` | Plan del gym (Free/Pro/Elite), Checkout | `src/app/panel/plan/page.tsx`<br>`mp-connect-card.tsx` | `src/lib/pagos/` (tabla `pagos`, `clientes.estado_cuota`) |
| `/panel/partner` | Estado del gym como partner | `src/app/panel/partner/page.tsx` | `src/lib/partners/` |
| `/panel/ajustes` | Logo, colores, pantalla tótem, VAPID | `src/app/panel/ajustes/page.tsx`<br>`ajustes-form.tsx` | `src/app/panel/ajustes/actions.ts` |

### C. Superadministrador (`/admin`)
| URL | Función | Componentes Clave |
|---|---|---|
| `/admin/gimnasios` | Lista y gestión de gyms, suspender, notas | `src/app/admin/gimnasios/` |
| `/admin/partner` | Gestión de embajadores, balance, pagos CBU, fraude | `src/app/admin/partner/page.tsx`, `actions.ts` |
| `/admin/planes` | Configuración de precios SaaS | `src/app/admin/planes/page.tsx` |
| `/admin/errores` | Log de errores del sistema | `src/app/admin/errores/page.tsx` |
| `/admin/salud` | Monitor de base de datos Supabase | `src/app/admin/salud/page.tsx` |

---

## 2. Motores y Lógica de Negocio (`src/lib/`)

* **Rutinas (`src/lib/rutina/`)**:
  * `motor.ts`: Algoritmo científico de volumen, RIR, DUP, balance muscular y sustituciones.
  * `generar.ts`: Orquestación y persistencia de la rutina generada.
  * `tipos.ts`: Tipos `Rutina`, `Ejercicio`, `DiaEntrenamiento`, etc.
  * `ejercicios.ts`: Catálogo y mapeo biomecánico.
* **Progreso (`src/lib/progreso/`)**:
  * `actions.ts`: `guardarProgresoCliente`, `guardarProgresoSocio`, control de récords personales.
* **Feedback Sensorial (`src/lib/ui/hapticos.ts`)**:
  * `hapticoImpactoSuave()`, `hapticoImpactoMedio()`, `hapticoSeleccion()`, `hapticoExito()`, `hapticoError()`.
  * Síntesis de audio con Web Audio API (cero archivos de audio externos).
* **Autenticación & Supabase (`src/lib/supabase/` & `src/lib/auth.ts`)**:
  * `client.ts`: Cliente para browser.
  * `server.ts`: Cliente para Server Components y Actions con cookies.
  * `admin.ts`: Cliente service_role para operaciones privilegiadas.
  * `auth.ts`: `requireProfile`, `requireRole`, `current_gimnasio_id`.
* **Mercado Pago (`src/lib/pagos/`)**:
  * `mercadopago-connect.ts`: OAuth de gimnasios para cobrar con su propia cuenta.
  * `cobro-socio.ts`: Webhook y confirmación de cuota de alumno.
* **Partners & Referidos (`src/lib/partners/`)**:
  * Comisiones, cálculo de balance, antifraude (hold 10 días, cooldown 48h CBU).

---

## 3. Componentes Globales de UI (`src/components/`)

* `ui.tsx`: Botones, inputs, `<Toggle>` switch iOS, badges, selects.
* `mascota/pulpo.tsx` & `pulpo-card.tsx`: Mascota oficial Volt (`#10e7a0`).
* `progreso/dial-vertical-progreso.tsx`: Dial de peso estilo regla iOS.
* `offline/`: Banners de modo sin conexión y cola de sincronización.
* `anillo-progreso.tsx`: Gráficos circulares de cumplimiento de series.

---

## 4. Base de Datos (`supabase/migrations/`)
* Todas las migraciones están ordenadas cronológicamente `0001_...` a `0057_...`.
* Tablas core reales (verificadas con el schema): `gimnasios`, `profiles`, `clientes`, `rutinas`, `rutina_items`, `rutina_plantillas`, `registro_progreso`, `registro_peso`, `planes`, `pagos`, `pagos_plataforma`, `registros_entrada`, `partners`, `partner_commissions`, `partner_payouts`, `partner_notifications`, `partner_milestone_awards`, `mensajes`, `buzon_comentarios`.
* No existe una tabla `cuotas`: el estado de cuota vive en `clientes.estado_cuota` (calculado por `recalcular_estado_cuota()`), y los pagos en la tabla `pagos`.