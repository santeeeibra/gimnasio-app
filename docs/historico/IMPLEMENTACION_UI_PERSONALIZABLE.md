# Sistema de Personalización UI Completo

## ✅ Implementado el 2026-09-02

---

## 1. Backend: Tipo `Tema` expandido

### Archivo: `src/lib/tema.ts`

**Nuevos campos agregados al tipo `Tema`:**
```typescript
export type Tema = {
  // Colores (existentes)
  paper: string;
  paper2: string;
  ink: string;
  inkSoft: string;
  rule: string;
  volt: string;
  voltInk: string;
  fuente: FuenteKey;
  
  // NUEVOS: Personalización UI
  escalaFuente: number; // 0.875 | 1 | 1.125 | 1.25
  radiosBordes: "tight" | "normal" | "soft";
  espaciado: "compact" | "normal" | "spacious";
  navegacionMovil: "bottom" | "sidebar" | "top";
  navegacionDesktop: "sidebar" | "top";
  densidad: "compact" | "comfortable" | "spacious";
};
```

**Defaults:**
```typescript
escalaFuente: 1,
radiosBordes: "normal",
espaciado: "normal",
navegacionMovil: "bottom",
navegacionDesktop: "sidebar",
densidad: "comfortable",
```

**Variables CSS dinámicas generadas:**
- `--font-scale`: multiplicador de tamaños de fuente
- `--radius-sm`, `--radius-md`, `--radius-lg`: radios de bordes
- `--spacing-scale`: multiplicador de padding/gap
- `--nav-mobile`, `--nav-desktop`: tipo de navegación
- `--density`: densidad de información

---

## 2. Frontend: Formulario rediseñado

### Archivo: `src/app/panel/ajustes/ajustes-form.tsx`

**Características:**

✅ **Tabs móviles:** Editor | Vista previa (swipe entre ambos)
✅ **Layout responsivo:** 
  - Móvil: tabs stacked
  - Desktop: editor (izq) + preview grande (der, sticky)
  
✅ **Secciones agregadas:**

1. **Colores** (existente, mejorada)
   - Grid 2 columnas
   - ColorPicker con swatch + input hex

2. **Tipografía** (expandida)
   - Familia tipográfica (9 opciones)
   - **NUEVO:** Tamaño base (87.5% → 125%)

3. **Bordes y espaciado** (NUEVO)
   - Redondeo: tight (3-6px) | normal (5-8px) | soft (6-10px)
   - Espaciado: compact (87.5%) | normal | spacious (125%)

4. **Navegación** (NUEVO)
   - Móvil: bottom (default) | top | sidebar deslizable
   - Desktop: sidebar (default) | top horizontal

5. **Densidad** (NUEVO)
   - Compact: más info, menos espacio
   - Comfortable: balance (default)
   - Spacious: máximo respiro

6. **Legibilidad** (existente)
   - Validación contraste WCAG
   - Botón "ajustar" automático por par

---

## 3. Componentes nuevos

### `src/app/panel/ajustes/radios.tsx`
Componente radio buttons estilizado:
- Visual custom con círculo + borde
- Label + hint
- Hover/active states
- Integrado con formulario

### `src/app/panel/ajustes/tema-preview-completo.tsx`
Preview expandido con:
- Header simulado
- Navegación según config (top/bottom/sidebar)
- Número héroe responsive (densidad afecta tamaño)
- Cards con padding dinámico (espaciado)
- Botones + inputs con radios dinámicos
- Badges con escala de fuente
- Scrollable + altura adaptativa



---

## 4. Validación server

### Archivo: `src/app/panel/ajustes/actions.ts`

**Campos validados:**
- `escalaFuente`: solo [0.875, 1, 1.125, 1.25]
- `radiosBordes`: solo ["tight", "normal", "soft"]
- `espaciado`: solo ["compact", "normal", "spacious"]
- `navegacionMovil`: solo ["bottom", "sidebar", "top"]
- `navegacionDesktop`: solo ["sidebar", "top"]
- `densidad`: solo ["compact", "comfortable", "spacious"]

**Persistencia:** 
- Todo se guarda en `gimnasios.tema` (jsonb)
- No requiere migración DB (parseTema() usa defaults)

---

## 5. Cómo usar

### Acceso
1. Login como DUEÑO
2. `/panel/ajustes`
3. Tabs: Editor | Vista previa

### Workflow
1. Ajustar colores, fuente base, bordes, etc.
2. Ver cambios en tiempo real en preview
3. Móvil: swipe entre editor y preview
4. Desktop: lado a lado
5. Guardar → revalida `/panel` y `/mi`

### Ejemplo: Gimnasio con usuarios mayores
```
escalaFuente: 1.25 (125%)
radiosBordes: "soft" (6-10px)
espaciado: "spacious" (125%)
densidad: "spacious"
→ UI más grande, más legible, menos saturada
```

### Ejemplo: Gimnasio competitivo con muchos datos
```
escalaFuente: 0.875 (87.5%)
radiosBordes: "tight" (3-6px)
espaciado: "compact" (87.5%)
densidad: "compact"
→ UI compacta, más datos visibles
```

---

## 6. Archivos modificados/creados

### Modificados:
- ✅ `src/lib/tema.ts` (tipo Tema + temaToVars + parseTema)
- ✅ `src/app/panel/ajustes/ajustes-form.tsx` (tabs + secciones nuevas)
- ✅ `src/app/panel/ajustes/actions.ts` (validación campos UI)

### Creados:
- ✅ `src/app/panel/ajustes/radios.tsx` (componente radio buttons)
- ✅ `src/app/panel/ajustes/tema-preview-completo.tsx` (preview expandido)
- ✅ `REGLAS_UI_EMIL.md` (documentación estilo Emil Kowalski)

---

## 7. Testing manual

### Checklist:
- [ ] Login como dueño → /panel/ajustes
- [ ] Cambiar escala fuente → ver cambio en preview
- [ ] Cambiar radios bordes → verificar inputs/botones preview
- [ ] Cambiar navegación móvil → ver cambio en barra preview
- [ ] Cambiar densidad → número héroe cambia tamaño
- [ ] Guardar → verificar persistencia en /panel
- [ ] Mobile: tabs funcionan, swipe entre editor/preview
- [ ] Desktop: layout lado a lado, preview sticky

---

## 8. Valores por defecto

Gimnasios con `tema: null` o sin campos nuevos usan defaults automáticamente.

**No se requiere migración manual.** `parseTema()` aplica defaults.

---

## 9. Documentación de referencia

- **Reglas UI:** `REGLAS_UI_EMIL.md`
- **Contraste:** `VALIDACION_CONTRASTE.md`
- **Fuentes:** `FUENTES_PERSONALIZABLES.md`
- **Contexto:** `contex-sysgym.md`

---

**Estado:** ✅ Sistema completo implementado y listo para testing  
**Rol:** Solo DUEÑO (cliente no ve ni edita)  
**Persistencia:** `gimnasios.tema` (jsonb)  
**Preview:** Tiempo real con maqueta completa
