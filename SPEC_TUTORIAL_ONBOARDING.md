# SPEC — Tutorial guiado de onboarding (dueño y cliente)

> Para pasarle a Claude Code. Referencia general: `contex-sysgym.md`.
> Pasar por `emil-design-eng` para los componentes visuales del tutorial
> (coach marks / overlays), siguiendo `REGLAS_UI_EMIL.md`.

## Objetivo

La primera vez que un dueño o un cliente entra a la app, un tutorial corto
recorre las secciones principales usando datos simulados — nunca datos
reales ni escritura a Supabase. El objetivo es que nadie llegue al
dashboard vacío sin saber qué hacer, sin que el dueño tenga que explicar
la app en persona.

## 0) Regla no negociable

**El tutorial no debe escribir en ninguna tabla real** (`clientes`,
`mensajes`, `mensaje_destinatarios`, ninguna tabla de pagos/cuotas,
`push_subscriptions`). Todo el contenido del tutorial (cliente ficticio,
pago ficticio, mensaje ficticio, notificación de ejemplo) vive en estado
de React / props mockeadas, renderizado sobre los mismos componentes de
UI reales pero sin persistencia. Esto es crítico porque en el punto
"métricas del dashboard" (dashboard del dueño, ver roadmap) esas cuentas
se calculan de la tabla real — un alta o pago fantasma del tutorial
rompería esos números para siempre si llegara a persistir.

Si en algún punto del desarrollo hace falta escribir algo a Supabase para
que el tutorial funcione, DETENERSE y avisar en vez de improvisar una
tabla `es_demo` o similar — se decide antes de implementar, no después.

## 1) Disparo y control

- Flag en `localStorage`: `tutorial_dueno_visto` / `tutorial_cliente_visto`
  (booleanos independientes, cada rol ve el suyo).
- Se dispara automáticamente en el primer login post-cambio de clave
  (aprovechar el flag `debe_cambiar_clave` que ya existe: justo después de
  que se resuelve, antes de mostrar el dashboard real).
- Botón "Saltear tutorial" visible en todo momento, en la esquina del
  overlay — cierra y marca el flag como visto igual.
- Debe poder reabrirse manualmente después (ej. desde `/panel/ajustes` o
  `/mi` → "Ver tutorial de nuevo" en el menú/perfil) por si alguien lo
  saltea sin querer.

## 2) Recorrido del dueño

Pasos sugeridos, cada uno resaltando la sección real de la UI con overlay
tipo coach-mark (no una pantalla nueva separada, se apoya sobre el panel
real):

1. Alta de cliente ficticio: mostrar el form de alta ya prellenado con
   datos de ejemplo ("Cliente de ejemplo", DNI ficticio tipo `00000000`),
   sin submit real — el botón dice "Simular alta" y solo avanza al
   siguiente paso del tutorial.
2. Registrar pago ficticio: mostrar cómo se vería la cuota de ese cliente
   de ejemplo pasando de "vencida" a "al día" — puramente visual, estado
   local del componente del tutorial.
3. Mandar mensaje ficticio: mostrar el compositor de mensajes con un
   mensaje de ejemplo tipeado, botón "Simular envío" que solo anima el
   envío sin pegarle a Supabase.
4. Notificación de ejemplo: disparar una notificación visual dentro de la
   app (un toast/banner, no un push real del sistema operativo) mostrando
   cómo se vería un aviso real.
5. Cierre: mensaje corto de "Listo, así se ve tu día a día" + botón
   "Empezar" que cierra el tutorial y lleva al dashboard real (vacío, con
   sus empty states reales — ver `SPEC` de estados vacíos si ya existe).

## 3) Recorrido del cliente

1. Ver su cuota de ejemplo (estado "al día", como se vería).
2. "Tu rutina" — mostrar cómo se ve una rutina generada de ejemplo.
3. Mensajes — mostrar cómo se ve recibir un mensaje del gimnasio.
4. Activar notificaciones — explicar qué son y para qué sirven (avisos de
   vencimiento), con CTA real al final del tutorial para activarlas de
   verdad (esto sí puede ser la acción real de suscripción push, ya que
   es una acción explícita del usuario sobre su propia cuenta, no data
   fantasma en tablas de negocio).

## 4) UI del tutorial

- Overlay semi-transparente sobre la pantalla real + tooltip/card
  señalando la sección (coach mark), con "Siguiente" / "Atrás" / "Saltear".
- Mobile-first: cards de tutorial no deben tapar más del ~40% de la
  pantalla, texto corto (1-2 líneas por paso).
- Usar tokens existentes (`--volt`, `--paper-2`, `--ink`), nada de colores
  nuevos.

## No-goals

- No usar IA para generar contenido del tutorial — todo texto fijo,
  escrito una vez.
- No tocar tablas reales bajo ninguna circunstancia (ver sección 0).
- No es un sistema de "modo demo" persistente para vender la app a
  terceros — es solo onboarding de primer uso.

## Criterio de aceptación

- Completar el tutorial de punta a punta no crea ninguna fila nueva en
  Supabase (verificar con un `SELECT count(*)` antes/después en las
  tablas de clientes, mensajes y pagos).
- Saltear el tutorial en cualquier paso funciona y no vuelve a aparecer.
- "Ver tutorial de nuevo" lo relanza sin duplicar el flag ni romper el
  estado real de la cuenta.
- Typecheck limpio.
