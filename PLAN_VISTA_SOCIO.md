# PLAN — Funciones nuevas para la vista del socio

> Explicado en criollo, sin tecnicismos. Ordenado por lo que conviene hacer primero.
> **Descartado por decisión del dueño:** ranking de desafíos, reportes de retención.
> Esfuerzo: 🟢 poco · 🟡 medio · 🔴 bastante.

## Estado de implementación

- **Slice 1 — Alta con "Pago recibido" + bloqueo + cartel de acceso:** ✅ código
  y typecheck. ⏳ falta aplicar `supabase/migrations/0018_alta_pago_recibido.sql`
  y probar.
- **Slice 2 — Alias/CVU del gym + "Mis pagos" + botón "Renovar":** ✅ código y
  typecheck. ⏳ falta aplicar `supabase/migrations/0019_datos_pago_gimnasio.sql`
  y probar.
- Hasta aplicar `0018` y `0019`, las pantallas `/mi`, `/mi/pagos`,
  `/panel/ajustes` y `/panel/clientes` van a fallar (piden columnas nuevas).
- Pendiente: check "Pago recibido" destildado deja al socio **bloqueado** hasta
  el pago (decidido). El cartel de acceso va solo dentro de la app (decidido).
  Reserva de clases queda para después (decidido).

---

## PARTE 1 — Cómo se maneja el pago (DECIDIDO)

**Decisión del dueño (2026-09-02):** el pago sigue 100% manual, como hoy. El
socio NO manda comprobantes ni PDF todos los meses, y NO se integra Mercado Pago.
El dueño (o la recepcionista) marca al socio como pago a mano.

### Cómo funciona hoy (ya está programado, no hay nada que hacer)

- **Al dar de alta un socio nuevo:** en el formulario de alta, el dueño elige el
  plan. Con eso el socio ya queda **"al día"** y con fecha de vencimiento = hoy +
  los días del plan. No hay que marcar nada más, no hay ningún PDF.
- **Cada mes, cuando el socio renueva:** el dueño entra al socio, elige el plan
  que pagó y toca **"Registrar pago"**. El sistema le suma los 30 días (o los que
  dure el plan). El socio no manda nada.
- El socio transfiere / paga en efectivo por fuera de la app y le muestra o le
  manda el comprobante a la recepcionista o al dueño **como hasta ahora** (por
  WhatsApp o en persona). Eso no pasa por el sistema.

### Lo que se agrega (confirmado)

1. **"Mis pagos" (solo mirar)** 🟢 — lado del socio
   - El socio ve una pantalla nueva, "Mis pagos", con la lista de lo que pagó:
     fecha, monto, qué plan, y hasta cuándo está cubierto.
   - **El dueño no hace nada nuevo:** los pagos ya se guardan cuando toca
     "Registrar pago". Solo falta mostrárselos también al socio.
   - Le saca de encima al dueño la pregunta "¿me anotaste el pago?".

2. **Datos para transferir del gimnasio** 🟢 — lado del socio
   - En la app se muestra el **alias / CVU y el titular** del gimnasio, con un
     botón de **copiar**. Así el socio no los pide por WhatsApp cada vez.
   - El dueño los carga una sola vez en su configuración (hoy el sistema tiene un
     único alias global; hay que pasarlo a uno por gimnasio).

3. **Check "Pago recibido" en el alta** 🟢 — lado del dueño
   - En el formulario de alta, un tilde **"Pago recibido"** (marcado por
     defecto).
   - Al tocar **"Dar de alta"**, el cliente queda creado en el sistema y, si el
     tilde está puesto, arranca **"al día"** (vencimiento = hoy + días del plan).
   - Si el dueño lo destilda (el socio todavía no pagó), el cliente igual se crea
     pero queda como **"pendiente de pago"** hasta que el dueño registre el pago.
   - Hoy ya pasa que elegir el plan lo deja al día; esto lo hace explícito y
     agrega el caso "lo doy de alta pero todavía no pagó".

4. **Cartel con los datos de acceso del socio nuevo** 🟢 — lado del dueño
   - Apenas se da de alta, aparece un cartel claro con lo que el socio necesita
     para entrar: **nombre del gimnasio, DNI y contraseña inicial**.
   - Con botón de **copiar** y texto listo para pegar en WhatsApp.
   - Va del lado del **dueño**, no del socio: el socio todavía no puede entrar,
     así que es el dueño quien le pasa estos datos.
   - Queda también en la ficha del socio ("Datos de acceso") por si hay que
     reenviarlos, con opción de **regenerar la contraseña**.

### Premium — Botón "Ir a pagar por Mercado Pago" 🔴

- En "Mis pagos", un botón que **abre Mercado Pago directo con el monto y el
  alias del gimnasio ya cargados**, para que el socio transfiera sin copiar
  nada.
- **No es cobro automático:** el socio igual transfiere y el dueño igual marca el
  pago a mano. Es solo un atajo para que pagar sea de un toque.
- Requiere vincular la cuenta de Mercado Pago del gimnasio (una clave que se pega
  en la configuración). Por eso es premium y va en el plan Pro.
- Más adelante, si el dueño quiere, se le puede sumar arriba el cobro 100%
  automático (que ya está casi programado). Queda anotado, no se hace ahora.

### Descartado

| Forma | Motivo |
|---|---|
| **Socio sube comprobante cada mes** | El dueño lo considera tedioso para el socio. |
| **Cobro 100% automático con Mercado Pago (ahora)** | El dueño no quiere depender de eso todavía; queda como posible extra futuro del plan Pro. |

---

## PARTE 2 — El plan por etapas

### Etapa 0 — Prender lo que ya está hecho 🟢

Ya está programado, solo falta activarlo:

- Correr las actualizaciones pendientes de la base de datos (están escritas,
  falta ejecutarlas una por una).
- Subir el sistema a internet con las claves de notificaciones.
- **Resultado:** los avisos automáticos de "tu cuota vence en X días" (al socio y
  al dueño) empiezan a salir solos. Hoy están hechos pero apagados.

### Etapa 1 — Que la pantalla del socio deje de estar vacía 🟢

Ninguna de estas cuesta plata ni ocupa lugar en la base:

1. **Botón "Entrené hoy".** En la pantalla principal del socio. Lo toca cuando va
   al gym → se marca la asistencia → se llena la rachita de constancia que ya
   está en pantalla (hoy solo se llena si el dueño lo registra en el mostrador).
2. **"Mis pagos"** (Forma A de la Parte 1).
3. **"Info del gimnasio".** Una tarjeta con horarios, dirección, teléfono /
   WhatsApp y redes. El dueño lo carga una vez en su configuración.
4. **Modo entrenamiento.** Cuando el socio abre su rutina, puede ir tildando cada
   ejercicio a medida que lo hace, con un cronómetro de descanso entre series. Al
   terminar, cuenta como asistencia (se conecta con el botón "Entrené hoy").
   Esto hace que la app se sienta como las apps pagas de gimnasio y no como una
   lista de ejercicios.

### Etapa 2 — Seguimiento del progreso 🟡

Agrega dos "cuadernos" nuevos en la base, pero muy livianos. Con 100 socios
anotando todo el año, ocupan alrededor de 15 MB, y hay 500 disponibles. No es
problema.

5. **Peso corporal.** El socio anota su peso cada tanto y ve un gráfico simple de
   cómo viene.
6. **Cuánto levantó en cada ejercicio.** En cada ejercicio de la rutina puede
   anotar el peso que usó. La próxima vez le aparece "la vez pasada: 40 kg × 10",
   así ve si mejoró. Es la función más pedida en las apps de gimnasio.

### Etapa 3 — Pagos y alta (el pago sigue manual) 🟢

7. **"Mis pagos"** para el socio: pantalla de solo lectura con su historial y
   hasta cuándo está cubierto.
8. **Datos para transferir** del gimnasio, con botón de copiar (alias / CVU /
   titular que el dueño carga una vez).
9. **Check "Pago recibido" en el alta** + arranque "al día" o "pendiente de pago"
   según ese tilde.
10. **Cartel con los datos de acceso** del socio nuevo (gimnasio + DNI +
    contraseña inicial), con copiar y texto para WhatsApp, del lado del dueño.
    También en la ficha del socio, con opción de regenerar contraseña.
11. Botón **"Renovar"** directo en la lista de socios, para no entrar al detalle
    de cada uno.

### Etapa 4 — Funciones premium (para cobrar más) 🔴

Estas justifican un plan más caro tuyo, o que el dueño le cobre un extra al socio:

12. **Botón "Ir a pagar por Mercado Pago".** Abre Mercado Pago con el monto y el
    alias del gimnasio ya cargados. El dueño vincula su cuenta de Mercado Pago
    una vez. No es cobro automático: es un atajo para transferir de un toque.
13. **Reserva de clases.** El gym carga sus clases (funcional, spinning, lo que
    sea) con cupos y horarios. El socio reserva su lugar desde la app. Es lo que
    más ata al socio a usar la app todos los días.
14. **Rutina revisada por el profe.** La rutina automática es gratis. "Que un
    profe te la mire y te la ajuste" es un servicio que el dueño puede cobrar
    aparte. En la app: un botón "Pedir revisión" y el dueño la marca como
    "revisada".
15. **Marca blanca.** El ícono de la app en el celular del socio con el logo del
    gimnasio, y la pantalla de bienvenida con su color. Ya tenés el logo y los
    colores por gimnasio cargados; falta el último paso para que se vea "propia
    del gym" y no genérica.
16. **Check-in por QR.** Un cartel con código QR en la entrada. El socio lo
    escanea con la app y queda registrada la entrada, sin que el dueño tipee el
    documento de nadie.

---

## PARTE 3 — De dónde sale la plata (resumen)

- **Hoy:** el dueño te paga una mensualidad por usar el sistema.
- **Plan básico:** lo de hoy + Etapas 1, 2 y 3.
- **Plan Pro (más caro):** agrega el botón "Ir a pagar por Mercado Pago",
  reserva de clases, rutina revisada por el profe, marca blanca y check-in por QR.
- El cobro de la cuota queda por fuera del sistema (transferencia / efectivo).
  Mercado Pago acá es solo un atajo para transferir, no un cobro que deje
  comisión.

---

## PARTE 4 — Orden sugerido para arrancar

1. **Etapa 0** — prender los avisos automáticos (casi sin trabajo).
2. **Etapa 1 completa** — la pantalla del socio deja de estar vacía.
3. **Etapa 2** — seguimiento del progreso.
4. **Etapa 3** — "Mis pagos" + datos para transferir (rápido).
5. **Etapa 4** de a una, empezando por reserva de clases.

---

## Decisiones que faltan definir

- Con el check "Pago recibido" **destildado**, ¿el socio nuevo queda "pendiente
  de pago" (no puede entrar / ve aviso) o entra igual pero figura como debiendo?
- El cartel con los datos de acceso, ¿lo querés también como mensaje automático
  dentro de la app apenas el socio entra por primera vez, o alcanza con que el
  dueño se lo pase por WhatsApp?
- ¿La reserva de clases entra en la primera versión del plan Pro o se deja para
  después?
