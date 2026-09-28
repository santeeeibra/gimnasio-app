# PR1: límites de autorización

## `profiles`

`prof_update` en 0055 permitía que la propia fila cambiara a cualquier
`gimnasio_id` o `rol`. Como `current_gimnasio_id()` e `is_dueno()` consultan esa
fila, RLS en otras tablas pasaba a aceptar el contexto falsificado.

Campos de autorización/identidad: `id`, `gimnasio_id`, `rol`, `activo`,
`permisos`, `dni` (identificador de login), `debe_cambiar_clave` (gate de
bienvenida), `email_recuperacion` (recuperación de cuenta) y
`tyc_aceptado_en` (constancia legal). `creado_at` tampoco es editable por el
cliente. `nombre` y `telefono` son datos de contacto, sin efecto en RLS.

La migración `0072_profiles_authorization_columns.sql` revoca UPDATE completo
del Data API y concede únicamente `debe_cambiar_clave` y
`email_recuperacion` a `authenticated`, sobre la propia fila. Se conservan
esas dos escrituras existentes: la opción de mantener la clave en `/bienvenida`,
el cambio/restablecimiento de contraseña y el email de recuperación del dueño.
El cambio de nombre/DNI de socios y la activación de staff siguen usando las
Server Actions con `service_role` y sus comprobaciones de gimnasio/rol.

La concesión directa de `debe_cambiar_clave` mantiene el comportamiento
actual: el usuario puede omitir el cambio de clave en `/bienvenida`. Si esa
opción se elimina en otro PR, el flag deberá pasar a una acción verificada y
retirarse de la lista de columnas concedidas.

## Impersonación

`sb-super-stash` guarda el access token y refresh token originales del
superadmin y el ID del perfil impersonado. `imp-activa` queda como señal de
navegación heredada. Las acciones administrativas y el bypass de gimnasio
suspendido validan el access token original con Supabase Auth, exigen que
pertenezca a `SUPERADMIN_ID` y ligan el stash a la sesión actual del perfil
impersonado. El banner no otorga permisos ni hace consultas privilegiadas
si esa validación falla.

`salirImpersonacion` usa el refresh token únicamente al salir; tras renovar,
`getUser()` debe devolver `SUPERADMIN_ID` antes de volver a `/admin`. Un stash
inválido cierra la sesión de destino. Las cookies antiguas que solo contienen
un refresh token no tienen el formato nuevo y fallan de forma segura.

Cuando el access token secundario vence, se ocultan los saltos a otros
perfiles y acciones de soporte. El botón de retorno sigue visible y puede
restaurar la sesión mediante el refresh token válido. Si este también expiró,
el usuario vuelve al login.

## Aplicación posterior

El repo tiene tres archivos históricos con prefijo `0058`; no ejecutar el
runner antiguo pasando solo `0058`. `0072` es posterior a `0071` y único.
Antes de aplicar en un entorno remoto, comprobar el historial real y ejecutar
**el archivo completo exacto** `supabase/migrations/0072_profiles_authorization_columns.sql`
mediante el proceso de migración controlado del proyecto. Este PR no lo aplica.

Pruebas locales: `npm run test:security` ejecuta Postgres embebido con el SQL
exacto de 0072 y casos positivos/negativos; `npx tsc --noEmit` y
`npm run build` comprueban la integración TypeScript/Next.
