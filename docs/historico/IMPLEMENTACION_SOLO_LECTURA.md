# Sistema de Solo Lectura para Trial Vencido

## Resumen

Implementación completa del sistema que bloquea escritura (modo solo lectura) cuando pasan 14 días de trial sin activar ningún plan pago.

## Cambios Realizados

### 1. Migración SQL: `0013_trial_solo_lectura.sql`

**Columna `estado` en tabla `gimnasios`:**
- Valores: `'prueba'` (default) | `'activo'` | `'solo_lectura'`
- Se agrega con `ALTER TABLE` (no rompe gimnasios existentes)

**Función `chequear_trial_vencido()`:**
- Marca como `'solo_lectura'` los gimnasios en estado `'prueba'` con más de 14 días desde `creado_at`
- Se ejecuta automáticamente en el cron diario

**Función helper `gimnasio_permite_escritura()`:**
- Retorna `false` si el gimnasio está en `'solo_lectura'`
- Se usa en todas las policies RLS de escritura

**Policies RLS actualizadas:**
Se agregó `and gimnasio_permite_escritura()` en el `WITH CHECK` de:
- `clientes_dueno` (alta/modificación de clientes)
- `planes_dueno` (crear/editar planes)
- `pagos_dueno` (registrar pagos)
- `rutinas_dueno` (crear/editar rutinas como dueño)
- `rutinas_cliente_insert/update/delete` (cliente genera/edita su rutina)
- `rutina_items_write` (items de rutinas)
- `mensajes_dueno_insert` (enviar mensajes)
- `md_dueno_insert` (destinatarios de mensajes)
- `mr_dueno_insert` y `mr_cliente_insert` (respuestas)
- `registros_entrada_dueno` (check-in)
- `ejercicios_dueno` (ejercicios propios)
- `prof_dueno_all` (crear/modificar profiles)
- `push_cliente_insert/delete` (suscripciones push)

### 2. Cron Diario: `src/app/api/cron/cuotas/route.ts`

Se agregó la llamada a `chequear_trial_vencido()`:
```typescript
// ─── Chequear trials vencidos (gimnasios en prueba > 14 días) ───
await admin.rpc("chequear_trial_vencido");
```

### 3. Frontend - Banner para Dueños: `src/app/panel/page.tsx`

- Lee `gimnasios.estado` al cargar la página
- Si `estado = 'solo_lectura'`, muestra banner rojo arriba del dashboard:
  - Título: "Período de prueba finalizado"
  - Mensaje: "Tu gimnasio está en modo solo lectura. Activá un plan para seguir usando todas las funciones de la app."
  - Botón "Activar plan" (mailto a soporte)

### 4. Frontend - Banner para Clientes: `src/app/mi/page.tsx`

- Lee `gimnasios.estado` al cargar
- Si `estado = 'solo_lectura'`, muestra banner similar:
  - Título: "Período de prueba finalizado"
  - Mensaje: "El gimnasio está en modo solo lectura. Contactá a la administración para activar un plan."

## Instrucciones de Implementación

### Paso 1: Aplicar la migración en Supabase

Ejecutar en el SQL Editor de Supabase (proyecto `adrkdortznimrlungwoy`):

```sql
-- Copiar todo el contenido de supabase/migrations/0013_trial_solo_lectura.sql
```

### Paso 2: Verificar gimnasios existentes

Los gimnasios existentes quedarán con `estado = 'prueba'` por default. Si ya llevan más de 14 días, el cron los marcará como `'solo_lectura'` en la próxima ejecución (diaria a las 12:00 UTC).

### Paso 3: Activar planes manualmente

Para activar un gimnasio después de que pagó, ejecutar en SQL Editor:

```sql
UPDATE gimnasios 
SET estado = 'activo' 
WHERE id = '<uuid_del_gimnasio>';
```

### Paso 4: Deploy del frontend

```bash
git add .
git commit -m "Sistema de solo lectura para trial vencido (14 días)"
git push origin main
```

Vercel desplegará automáticamente. El cron ya está configurado en `vercel.json`.

## Flujo Completo

1. **Día 0**: Gimnasio se crea con `estado = 'prueba'`
2. **Día 1-14**: Gimnasio funciona normalmente (puede leer y escribir)
3. **Día 15**: Cron ejecuta `chequear_trial_vencido()` → `estado` cambia a `'solo_lectura'`
4. **Desde día 15**: 
   - RLS bloquea toda escritura (INSERT/UPDATE/DELETE)
   - Frontend muestra banners en `/panel` y `/mi`
   - Lectura sigue funcionando (pueden ver su info pero no modificar)
5. **Activación manual**: Admin ejecuta `UPDATE gimnasios SET estado = 'activo'` → gimnasio vuelve a funcionar

## Verificación

- ✅ Migración SQL creada: `0013_trial_solo_lectura.sql`
- ✅ Cron actualizado: `chequear_trial_vencido()` se ejecuta diariamente
- ✅ Banner en `/panel` para dueños
- ✅ Banner en `/mi` para clientes
- ✅ RLS protege todas las operaciones de escritura
- ⏳ **Pendiente**: Aplicar migración en Supabase
- ⏳ **Pendiente**: Deploy a Vercel

## Notas

- La lectura NO está bloqueada: dueños y clientes pueden ver sus datos
- El banner es solo informativo en frontend; el bloqueo real es RLS en Supabase
- Si necesitás cambiar el período de prueba (14 días), editar línea 22 de la migración
- El email en el botón "Activar plan" está como placeholder (`soporte@tudominio.com`)
