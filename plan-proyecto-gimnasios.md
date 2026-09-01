# Sistema de gestión de gimnasios — plan maestro

## Resumen
SaaS multi-tenant para vender a varios gimnasios. Cada gimnasio tiene sus datos
aislados. Presupuesto: solo dominio pago, resto gratis (free tiers).

## Stack
- Next.js (frontend + backend en un proyecto)
- Supabase (Postgres + auth + Row Level Security para aislar datos por gimnasio)
- Vercel (hosting, plan gratis)
- Notificaciones push: Web Push nativo (gratis, sin servicio de terceros)

## Decisiones tomadas

### Cuentas y acceso
- El dueño da de alta al cliente manualmente: plan, teléfono, DNI, estado de cuota.
- Recién ahí el cliente puede loguearse. No hay auto-registro.
- Usuario = DNI. Contraseña inicial autogenerada (ej: últimos 4 del DNI).
- Flag `debe_cambiar_clave`: obliga a cambiarla en el primer login.
- Cada gimnasio = cuenta independiente por cliente (sin arrastre entre gimnasios).

### Planes y cuotas
- Planes definidos por cada dueño (nombre, precio, duración).
- Pago se hace por fuera del sistema (transferencia).
- El dueño registra manualmente cuando confirma el pago.
- El sistema calcula días restantes automáticamente.
- Alerta visual en rojo cuando quedan 5-6 días o menos + notificación push,
  tanto para el cliente como para el dueño.

### Rutinas
- V1: motor de **reglas fijas** (gratis, sin IA). Variables: objetivo, peso,
  edad, días de entrenamiento, gustos/preferencias.
- Cliente puede editar su rutina: cambiar series/repeticiones, sustituir
  ejercicios que no conoce.
- Base de ejercicios con imagen/GIF (usar fuente abierta y gratuita, ej. wger).
- Posible fase 2 (futuro, no ahora): capa de IA solo para ajustes finos.

### Mensajería
- El dueño envía mensajes individuales o masivos (a todos o filtrado por plan).
- Cada mensaje tiene flag "respondible" (chat) o "solo aviso".
- Llega por dentro de la app (bandeja) + notificación push.

### Diseño
- Evitar UI genérica. Usar la skill `frontend-design-SKILL.md` (adjunta) en
  Claude Code / Cline para dirección estética, tipografía, etc.
- Prioridad UX: que ni el dueño ni el cliente pierdan tiempo buscando cosas.
  Navegación mínima, todo a máximo 2 clicks del panel principal.

## Modelo de datos (tablas base)
- `gimnasios`
- `planes` (gimnasio_id, nombre, precio, duración)
- `clientes` (gimnasio_id, dni, teléfono, plan_id, estado_cuota, fecha_vencimiento, debe_cambiar_clave)
- `ejercicios` (nombre, imagen_url, grupo_muscular, nivel)
- `rutinas` (cliente_id, ejercicios[], series, repeticiones, generada_por=reglas)
- `mensajes` (gimnasio_id, remitente, destinatario o masivo, respondible, leído)

## Pendientes a definir más adelante (no bloquean el arranque)
- Cómo se comunican las credenciales iniciales al cliente (a mano, sin costo).
- Reportes/métricas para el dueño.

---

## Cómo vamos a trabajar (para ahorrar tokens)

| Tipo de tarea | Herramienta |
|---|---|
| Feature completa, varios archivos, refactor grande | **Claude Code** — pegarle este archivo como contexto |
| Fix puntual, ajuste chico en una pantalla | **Cline** |
| Cambio trivial en un archivo (renombrar, texto, un valor) | Comando **PowerShell** o script corto de **Python** que te paso yo directamente |
| Dudas conceptuales, decisiones de diseño, dudas generales | **Gemini** |

Regla general: siempre que arranques una sesión nueva en Claude Code o Cline,
pegá este archivo primero como contexto — así no hay que reexplicar el
proyecto desde cero cada vez.
