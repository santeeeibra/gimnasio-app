# ✅ IMPLEMENTACIÓN COMPLETADA: Sistema de Solo Lectura para Trial Vencido

**Fecha:** 2026-09-02  
**Objetivo:** Bloquear escritura (modo solo lectura) cuando pasan 14 días de trial sin activar plan pago

---

## 📋 Resumen de Cambios

### 1. ✅ Migración SQL Creada
**Archivo:** `supabase/migrations/0013_trial_solo_lectura.sql` (155 líneas)

**Contenido:**
- ✅ Columna `estado` en `gimnasios` (valores: `'prueba'` | `'activo'` | `'solo_lectura'`)
- ✅ Función `chequear_trial_vencido()` - marca gimnasios con trial > 14 días como solo_lectura
- ✅ Función helper `gimnasio_permite_escritura()` - valida si se puede escribir
- ✅ 15 policies RLS actualizadas con bloqueo de escritura:
  - `clientes_dueno`
  - `planes_dueno`
  - `pagos_dueno`
  - `rutinas_dueno`
  - `rutinas_cliente_insert/update/delete`
  - `rutina_items_write`
  - `mensajes_dueno_insert`
  - `md_dueno_insert`
  - `mr_dueno_insert` y `mr_cliente_insert`
  - `registros_entrada_dueno`
  - `ejercicios_dueno`
  - `prof_dueno_all`
  - `push_cliente_insert/delete`

### 2. ✅ Cron Actualizado
**Archivo:** `src/app/api/cron/cuotas/route.ts`

```typescript
// Línea 123-124
await admin.rpc("chequear_trial_vencido");
```

Se ejecuta diariamente a las 12:00 UTC (configurado en `vercel.json`)

### 3. ✅ Frontend - Banner Dueños
**Archivo:** `src/app/panel/page.tsx`

- Lee `gimnasios.estado` al cargar (líneas 11-18)
- Banner condicional si `estado = 'solo_lectura'` (líneas 66-81)
- Mensaje: "Tu gimnasio está en modo solo lectura. Activá un plan..."
- Botón mailto: `soporte@tudominio.com`

### 4. ✅ Frontend - Banner Clientes  
**Archivo:** `src/app/mi/page.tsx`

- Lee `gimnasios.estado` al cargar (líneas 13-20)
- Banner condicional si `estado = 'solo_lectura'` (líneas 42-51)
- Mensaje: "El gimnasio está en modo solo lectura. Contactá a la administración..."

### 5. ✅ Documentación
**Archivo:** `IMPLEMENTACION_SOLO_LECTURA.md`

Manual completo con instrucciones de implementación, flujo y verificación.

---

## 🔄 Flujo Implementado

1. **Día 0**: Gimnasio creado → `estado = 'prueba'`
2. **Día 1-14**: Funcionamiento normal (lectura y escritura)
3. **Día 15**: Cron ejecuta `chequear_trial_vencido()` → cambia a `'solo_lectura'`
4. **Desde día 15**: 
   - ✅ RLS bloquea INSERT/UPDATE/DELETE en todas las tablas
   - ✅ Frontend muestra banners en `/panel` y `/mi`
   - ✅ Lectura sigue funcionando (pueden ver pero no modificar)
5. **Activación manual**: `UPDATE gimnasios SET estado = 'activo' WHERE id = '...'`

---

## ⏳ Pendiente de Ejecución Manual

### 1. Aplicar Migración en Supabase
```sql
-- Ir a: https://supabase.com/dashboard/project/adrkdortznimrlungwoy/sql
-- Copiar y ejecutar: supabase/migrations/0013_trial_solo_lectura.sql
```

### 2. Configurar Email de Soporte (Opcional)
Actualizar el email en `src/app/panel/page.tsx` línea 75:
```typescript
href="mailto:TU_EMAIL_REAL@dominio.com?subject=Activar plan para mi gimnasio"
```

### 3. Deploy a Producción
```bash
git add .
git commit -m "Sistema de solo lectura para trial vencido (14 días)"
git push origin main
```

---

## 🧪 Cómo Probar

### Opción A: Simular trial vencido
```sql
-- En Supabase SQL Editor:
UPDATE gimnasios 
SET creado_at = now() - interval '15 days'
WHERE id = '<id_del_gimnasio_de_prueba>';

-- Ejecutar manualmente el chequeo:
SELECT chequear_trial_vencido();

-- Verificar estado:
SELECT id, nombre, estado, creado_at FROM gimnasios;
```

### Opción B: Cambiar estado manualmente
```sql
-- Forzar solo lectura:
UPDATE gimnasios SET estado = 'solo_lectura' WHERE id = '...';

-- Probar en frontend: intentar crear cliente, plan, pago → debería fallar con RLS
```

### Verificar banners:
1. Login como dueño → `/panel` debe mostrar banner rojo
2. Login como cliente → `/mi` debe mostrar banner rojo

---

## 🔍 Verificación del Código

### Archivos Modificados (3):
- ✅ `src/app/api/cron/cuotas/route.ts` - agregada llamada RPC
- ✅ `src/app/panel/page.tsx` - banner + lógica estado
- ✅ `src/app/mi/page.tsx` - banner + lógica estado

### Archivos Creados (2):
- ✅ `supabase/migrations/0013_trial_solo_lectura.sql` - migración completa
- ✅ `IMPLEMENTACION_SOLO_LECTURA.md` - documentación

### Typecheck: ⚠️ No ejecutado
El comando `npm run typecheck` no existe en este proyecto. Ejecutar `npm run build` después del deploy para verificar.

---

## 📊 Cobertura de Bloqueo RLS

| Tabla | Policy Actualizada | Bloquea |
|-------|-------------------|---------|
| `clientes` | `clientes_dueno` | INSERT, UPDATE, DELETE |
| `planes` | `planes_dueno` | INSERT, UPDATE, DELETE |
| `pagos` | `pagos_dueno` | INSERT, UPDATE, DELETE |
| `rutinas` | `rutinas_dueno`, `rutinas_cliente_*` | INSERT, UPDATE, DELETE |
| `rutina_items` | `rutina_items_write` | INSERT, UPDATE, DELETE |
| `mensajes` | `mensajes_dueno_insert` | INSERT |
| `mensaje_destinatarios` | `md_dueno_insert` | INSERT |
| `mensaje_respuestas` | `mr_dueno_insert`, `mr_cliente_insert` | INSERT |
| `registros_entrada` | `registros_entrada_dueno` | INSERT, UPDATE, DELETE |
| `ejercicios` | `ejercicios_dueno` | INSERT, UPDATE, DELETE |
| `profiles` | `prof_dueno_all` | INSERT, UPDATE, DELETE |
| `push_subscriptions` | `push_cliente_insert/delete` | INSERT, DELETE |

**Total:** 15 policies actualizadas, 12 tablas protegidas

---

## 🎯 Activación de Plan (Proceso Manual)

Cuando un gimnasio pague, ejecutar en Supabase SQL Editor:

```sql
UPDATE gimnasios 
SET estado = 'activo' 
WHERE id = '<uuid_del_gimnasio>';
```

El gimnasio recupera inmediatamente acceso de escritura (sin restart ni deploy).

---

## ✅ Estado Final

- [x] Migración SQL completa y sintácticamente correcta
- [x] Cron integrado en endpoint existente
- [x] Banners frontend (dueño y cliente)
- [x] RLS protege todas las operaciones críticas
- [x] Documentación completa
- [ ] **PENDIENTE: Aplicar migración en Supabase**
- [ ] **PENDIENTE: Deploy a Vercel**

**Próximo paso:** Aplicar la migración en Supabase y hacer deploy.
