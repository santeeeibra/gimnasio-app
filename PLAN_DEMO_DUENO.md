# Plan de demo para el dueño del gym

Objetivo: que en 15 min vea un gimnasio **funcionando de verdad** con su marca,
y que cada pantalla le resuelva un dolor concreto (cobrar, no perder socios,
no perder tiempo).

---

## 1. Preparar el gym simulado (antes de la reunión, ~20 min)

Ya está la cuenta del dueño creada. Falta cargarle vida:

- [ ] **Logo + paleta**: entrar como dueño → `/panel/ajustes` → subir su logo →
      elegir la paleta sugerida desde el logo → guardar.
- [ ] **Planes** reales de ese gym: p. ej. "Mensual", "Trimestral", "Pase libre".
      (`/panel/planes`)
- [ ] **8-10 socios** con nombres normales y esta mezcla a propósito:
  - 5-6 al día
  - 2 que **vencen esta semana** (para que aparezcan en el dashboard)
  - 1 **vencido** hace 2 semanas
  - 1 **en prueba** (alta con "1 día de prueba")
  - 1 **prueba vencida** (en prueba + ya tiene un check-in previo)
- [ ] **Registrar pagos** de varios socios con fechas de este mes y del mes
      pasado → así el dashboard muestra ingresos y variación, y `/panel/ingresos`
      tiene 2 meses con totales.
- [ ] **Check-ins**: entrar a `/checkin` y marcar ingreso de 4-5 socios varias
      veces en distintos días (si se puede, tocando fechas) → alimenta
      "asistencias de hoy" y la racha.
- [ ] **1-2 rutinas** ya generadas para tener algo que mostrar sin improvisar.
- [ ] **1 mensaje** enviado desde el panel (para que la bandeja no esté vacía).
- [ ] Dejar **2 pestañas abiertas**: una logueada como dueño (`/panel`), otra
      como uno de los socios (`/mi`). Y `/checkin` en el celu o tablet.

---

## 2. El recorrido (orden de pantallas + qué decir)

### A. Entrada — "esta app es tuya"  (30 seg)
- Abrir la app ya con **su logo y sus colores**.
- *"Esto no es una demo genérica, es tu gimnasio. Tus socios lo ven con tu marca,
  no con la mía."*

### B. Dashboard `/panel` — el pantallazo de control  (2 min)
- Señalar los números: **ingresos del mes** + variación, **socios activos**,
  **vencen esta semana**, **asistencias de hoy**, **en prueba**.
- *"Apenas abrís, sabés cómo venís este mes y a quién tenés que llamar hoy.
  Sin abrir ningún Excel."*
- Tocar un socio de "vencen esta semana" → lleva a su ficha.

### C. Ficha del socio — cobrar en vivo  (2 min)
- Mostrar estado de cuota, días restantes, historial.
- **Registrar un pago en vivo** → el estado pasa a "al día", desaparece de
  morosos.
- *"El socio te transfiere, vos cargás el pago en 5 segundos y el sistema ya
  calcula hasta cuándo tiene acceso."*
- Mostrar rápido "Editar datos del socio".

### D. Check-in kiosko `/checkin` — en el celu/tablet  (2 min)
- Tipear un DNI → "Ingreso registrado".
- Dejar unos segundos quieto → aparece la **pantalla de reposo** (se ve moderno).
- Tipear el DNI del socio con **prueba vencida** → mensaje + *"y a vos te llega
  un aviso al toque de que este quiere seguir viniendo gratis."*
- *"Ponés una tablet vieja en la entrada y listo. Queda registro de todo el que
  entra."*

### E. Ingresos `/panel/ingresos` — la plata, con candado  (1,5 min)
- Pedir el **PIN** (mostrar que está protegido).
- Pagos **agrupados por mes con totales**, buscador por socio.
- *"Esta sección la abrís solo vos. Tu empleado usa el resto de la app, pero
  la caja no la ve."*

### F. Aviso de vencimiento / morosidad  (1 min)
- `/panel/ajustes` → card "Aviso de vencimiento": elegir cuántos días antes.
- *"El sistema le avisa solo al socio antes de que se le venza. Vos no
  perseguís a nadie y cobrás más."*
- (Si ya está el botón WhatsApp: mostrarlo desde la ficha del moroso.)

### G. Rutinas — reemplaza tiempo del profe  (2,5 min)
- En la pestaña del **socio** (`/mi/rutina`): **generar una rutina en vivo**
  (elegir objetivo, días, nivel) → aparece en 5 segundos con imágenes.
- Cambiar unas series/reps con los selectores.
- "No conozco este ejercicio" → alternativas.
- *"Esto le lleva 20 minutos al profe por cada socio. Acá el socio la arma
  solo y vos la revisás desde tu panel."*
- Saltar al panel del dueño → `/panel/clientes/[id]` → rutina del socio.

### H. Mensajería  (1 min)
- Compositor → mandar un aviso **a todos** o **filtrado por plan**.
- *"Aviso de feriado, cambio de horario, promo: llega a la bandeja de todos
  y como notificación."*

### I. Tema en vivo `/panel/ajustes`  (1 min)
- Cambiar a otra paleta prearmada → guardar → refrescar el `/mi` del socio.
- *"Si mañana cambiás el logo o los colores del gym, lo cambiás vos en 1 minuto."*

### J. Mencionar sin demorarse  (1 min)
- **Notificaciones push** nativas.
- **Funciona sin internet un rato** (si se cae el server, seguís dando altas y
  check-ins, se sincroniza después).
- **Recuperación de contraseña** asistida.
- **Día de prueba** integrado al alta.

---

## 3. Cierre  (1 min)

- *"Las mejoras entran solas: cada vez que actualizo, la próxima vez que abren
  la app ya la tienen. No hay que instalar nada."*
- *"Para arrancar solo necesito: el nombre del gym, tu logo, y tus planes.
  Los socios los cargás vos o me pasás una lista."*
- Cerrar con el **dashboard** de nuevo: *"Este es tu día a día."*

---

## 4. Si pregunta / objeciones frecuentes

| Pregunta | Respuesta corta |
|---|---|
| "¿Y si se cae?" | Funciona offline un rato para lo crítico (altas, check-in). Los datos están en Supabase con backups. |
| "¿Mis socios tienen que bajar una app?" | No. Es una web, se agrega a la pantalla de inicio como si fuera app. |
| "¿Puedo cobrar con Mercado Pago?" | Sí, en el plan Elite: el socio paga desde la app y te entra directo. |
| "¿Cuántos socios entran?" | Los que quieras, no hay límite por socio. |
| "¿Los datos son míos?" | Sí, cada gimnasio tiene sus datos aislados, nadie más los ve. |

---

## Logins de prueba
- Dueño: gimnasio `migym`, DNI `30111222`, clave `gym1222`
- (Para la reunión: usar la cuenta real del gym del dueño, ya creada.)
