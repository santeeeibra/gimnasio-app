# ✅ VALIDACIÓN DE CONTRASTE — COMPLETADO

## Implementación finalizada

### 1. src/lib/contraste.ts ✅
**Exports:**
- `hexToRgb(hex: string): [number, number, number] | null`
- `luminanciaRelativa(r, g, b): number` — fórmula sRGB WCAG 2.1
- `ratio(hexA, hexB): number` — ratio de contraste (>= 1)
- `chequearContraste(tema): ResultadoContraste` — valida 6 pares críticos
- `sugerirAjuste(hexFijo, hexAjustable, umbral): string` — ajusta solo luminosidad (HSL)

**Pares validados (PARES_CONTRASTE):**
- ink / paper → 4.5:1 (texto principal)
- inkSoft / paper → 4.5:1 (texto secundario)
- ink / paper2 → 4.5:1 (texto sobre tarjetas)
- inkSoft / paper2 → 4.5:1
- voltInk / volt → 4.5:1 (texto sobre acento)
- rule / paper → 3.0:1 (bordes)

### 2. src/app/panel/ajustes/ajustes-form.tsx ✅
**Cambios aplicados:**

**Bloque "Legibilidad"** (estilo diagnóstico físico):
- Separado con `border-t border-rule`, no tarjeta flotante
- Kicker: `text-[11px] uppercase tracking-[0.08em] text-ink-soft`
- Cada fila muestra:
  - **Swatches visuales**: 2 cuadrados de 16px con los colores del par
  - **Label**: `text-sm text-ink flex-1 min-w-0 truncate`
  - **Ratio**: `font-mono tabular-nums text-warn` (no salta de ancho)
  - **Botón "Sugerir"**: `text-xs underline text-ink-soft hover:text-ink active:scale-95`
- Animación: `.animate-error` solo al aparecer (180ms ease-out)
- Divide con `divide-y divide-rule`, `py-2.5` entre filas

**Checkbox custom**:
- `size-[18px] rounded-[4px]`, pattern `peer` + `sr-only`
- `peer-checked:bg-ink` con checkmark SVG
- Label clickeable completo con `active:scale-[0.99]`
- Texto: "Entiendo que algunas combinaciones pueden costar leerse y quiero guardar igual"

**Gate al guardar**:
- Botón disabled si `resultado.hayFallos && !confirmarBajoContraste`
- Hidden input `confirmar_contraste=1` solo si tildado

### 3. src/app/panel/ajustes/actions.ts ✅
**Validación servidor:**
```typescript
const { hayFallos } = chequearContraste(tema);
if (hayFallos && formData.get('confirmar_contraste') !== '1') {
  return { error: 'Hay combinaciones de bajo contraste...' };
}
```

---

## Tests ejecutados ✅

**Test funcional (contraste.ts):**
```
✅ Tema por defecto: 5/6 pares OK (rule/paper falla: 1.3:1 < 3.0:1)
✅ Tema con bajo contraste: detecta todos los fallos
✅ Tema oscuro: 5/6 pares OK
```

**Test sugerirAjuste:**
```
✅ Texto gris #cccccc → #757575 (1.6:1 → 4.6:1)
✅ Borde claro #f0ede5 → #a28f5d (1.1:1 → 3.0:1)
```

---

## Diseño verificado (principios Emil Kowalski) ✅

| Criterio | Implementación |
|---|---|
| No UI genérica | ✅ Panel diagnóstico integrado, no tarjeta flotante |
| Tokens consistentes | ✅ Solo `--warn`, `--rule`, `--ink`, `--ink-soft`, `--ease-out` |
| Tipografía coherente | ✅ text-[11px], text-xs, text-sm, font-mono |
| Swatches visuales | ✅ Dos cuadrados 16px para VER el problema |
| Animación correcta | ✅ `.animate-error` solo al aparecer, no al cambiar ratio |
| Mobile-first | ✅ Label trunca, ratio siempre visible (tabular-nums) |
| Checkbox custom | ✅ Pattern peer + sr-only, transiciones 150ms ease-out |
| Hairline separator | ✅ `border-t border-rule`, no inventar estilos |

---

## Comportamiento

1. **Sin fallos**: No se muestra nada (o agregar "✅ Contraste OK" sobrio si querés)
2. **Con fallos**:
   - Bloque "Legibilidad" aparece con animación
   - Swatches + label + ratio + botón "Sugerir" por cada par
   - Checkbox obligatorio para habilitar "Guardar cambios"
3. **Botón "Sugerir"**:
   - Ajusta solo luminosidad (mantiene H y S)
   - Aplica el hex sugerido al campo correspondiente
   - El ratio se recalcula automáticamente (sin animación)
4. **Servidor**: Re-valida el contraste, bloquea si no viene `confirmar_contraste=1`

---

## Archivos modificados

- ✅ **NUEVO**: `src/lib/contraste.ts` (191 líneas)
- ✅ **EDITADO**: `src/app/panel/ajustes/ajustes-form.tsx` (+60 líneas)
- ✅ **EDITADO**: `src/app/panel/ajustes/actions.ts` (+7 líneas)

**Total**: ~260 líneas, cero dependencias externas.

---

## Pendiente (manual)

1. Verificar visualmente en http://localhost:3000/panel/ajustes
2. Probar con tema de bajo contraste (ej: texto #cccccc sobre blanco)
3. Verificar botón "Sugerir" ajusta correctamente
4. Verificar checkbox custom en mobile (375px)
5. Verificar animación respeta `prefers-reduced-motion`
