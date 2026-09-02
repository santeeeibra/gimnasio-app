# Fases 5 y 7 — instrucciones listas para aplicar (sin exploración)

> Objetivo: que una sesión nueva (Claude Code o Cline) aplique esto sin leer
> medio repo. Todo lo necesario está acá. Correr `npx tsc --noEmit` al final de
> cada fase; **no** correr `next build` salvo que tsc pase y quieras doble check.
> Motor y tipos de rutina: `src/lib/rutina/{motor,tipos,teoria,explicar}.ts`.

---

## FASE 5 — "Me molesta al hacerlo" en el editor  (chico, ~2 archivos)

El filtro por molestia YA existe en el motor (`MOLESTIA_BLOQUEA`,
`estaBloqueado`) y en el form avanzado. Falta solo el atajo desde el editor de
rutina del cliente.

### 5.1 `src/lib/rutina/motor.ts`
Exportar el helper: buscar

```ts
function estaBloqueado(ej: Ejercicio, evitar: readonly Molestia[]): boolean {
```

y anteponer `export`:

```ts
export function estaBloqueado(ej: Ejercicio, evitar: readonly Molestia[]): boolean {
```

### 5.2 `src/app/mi/rutina/rutina-editor.tsx`
En el componente del ítem (la función que tiene `abrirCambio`, `cambiar()`,
`const alternativas = ...`):

1. Imports: agregar a lo que ya importa de `@/lib/rutina/tipos`:
   `MOLESTIAS, MOLESTIA_LABEL, type Molestia`.
   Y de `@/lib/rutina/motor`: `estaBloqueado` (ya importa `ejerciciosSimilares`
   de ahí).

2. Estado nuevo, junto a los otros `useState` del ítem:
   ```ts
   const [molestias, setMolestias] = useState<Molestia[]>([]);
   ```

3. Reemplazar:
   ```ts
   const alternativas = ej ? ejerciciosSimilares(ej, ejercicios, 6) : [];
   ```
   por:
   ```ts
   const baseAlt = ej ? ejerciciosSimilares(ej, ejercicios, 12) : [];
   const alternativas = (
     molestias.length
       ? baseAlt.filter((a) => !estaBloqueado(a, molestias))
       : baseAlt
   ).slice(0, 6);
   ```

4. Botón toggle del panel: cambiar el texto `"No lo conozco"` por
   `"No lo conozco / me molesta"` (dejar `"Cerrar"` igual).

5. Dentro del bloque `{abrirCambio ? ( ... ) : null}`, ANTES de la lista de
   `alternativas`, insertar:
   ```tsx
   <div className="mb-2 flex flex-wrap gap-1.5">
     {MOLESTIAS.map((m) => {
       const on = molestias.includes(m);
       return (
         <button
           key={m}
           type="button"
           onClick={() =>
             setMolestias((p) =>
               on ? p.filter((x) => x !== m) : [...p, m],
             )
           }
           className={`h-7 rounded-[5px] border px-2 text-[11px] transition-colors ${
             on
               ? "border-ink bg-ink text-paper"
               : "border-rule text-ink-soft"
           }`}
         >
           {MOLESTIA_LABEL[m]}
         </button>
       );
     })}
   </div>
   ```
   Y cambiar el copy `"Cambiar por uno equivalente:"` por
   `"Marcá una molestia para descartar variantes, o cambialo por uno equivalente:"`.

6. `npx tsc --noEmit` → commit:
   `feat(rutina): fase 5 — filtro "me molesta" en el editor`

---

## FASE 7 — Legibilidad de `/mi/rutina` para el cliente  (UI, usar skill emil-design-eng)

Meta: que se entienda a primera vista, sin jerga. Archivos:
`src/app/mi/rutina/page.tsx` y `src/app/mi/rutina/rutina-editor.tsx`.

### 7.1 Label de grupo muscular (sin jerga) — hacer primero, es mecánico
Mover el mapa `GRUPO_LABEL` que hoy está privado en
`src/lib/rutina/explicar.ts` a `src/lib/rutina/tipos.ts` como export
`GRUPO_MUSCULAR_LABEL` (mismas claves/valores) y:
- en `explicar.ts` importar y usar el de tipos (borrar el local);
- en `rutina-editor.tsx`, donde muestra `{ej.grupo_muscular}` crudo (el
  `<span>` con `uppercase tracking-[0.08em]`), envolver con
  `GRUPO_MUSCULAR_LABEL[ej.grupo_muscular] ?? ej.grupo_muscular` y sacar el
  `uppercase`.
- **Nunca** mostrar `ej.patron` en la vista del cliente (hoy no se muestra —
  mantener así).

### 7.2 Prescripción en palabras
En el ítem del editor, arriba de los `<select>` de Series/Reps, agregar una
línea de resumen legible (no editable):
`{series} series · {reps.replace("–"," a ")} repeticiones` +, si
`item.tecnica`, ` · técnica: {TECNICA_LABEL[item.tecnica]}`.
Los selects quedan como "ajuste fino" debajo (se pueden meter en un
`<details>` "Ajustar" para bajar ruido visual).

### 7.3 Encabezado por día
En `page.tsx`, `agruparPorDia` ya arma `DiaEditable {numero,titulo,items}`.
En `RutinaEditor`, para cada día mostrar bajo el título:
`{items.length} ejercicios · ~{tiempoMin} min`, con
`tiempoMin = Math.round(items.reduce((a,it)=> a + it.series*2.2, 0))`
(≈ series × (descanso+ejec) / 60). Y listar los músculos del día:
`[...new Set(items.map(i=>GRUPO_MUSCULAR_LABEL[i.ejercicio?.grupo_muscular ?? ""]))].filter(Boolean).join(" · ")`.

### 7.4 Secciones Básicos / Accesorios
No hay `rol` persistido. Heurística: es "accesorio" si
`item.ejercicio?.patron === "aislamiento"`. Dentro de cada día, render en dos
grupos con subtítulo ("Básicos", "Accesorios"); si un grupo queda vacío,
omitir el subtítulo.

### 7.5 Mini-mapa corporal (opcional, último)
Icono SVG inline por grupo (silueta con la zona resaltada). Si es mucho,
dejarlo como una "pill" de color por grupo y listo. No bloquea el resto.

### Cierre Fase 7
- Pasar por `emil-design-eng` y `REGLAS_UI_EMIL.md` (mobile-first, una columna,
  sin hover, targets ≥44px).
- Verificación: UNA sola captura al final con el preview. No loop de
  screenshots.
- Commit: `feat(rutina): fase 7 — /mi/rutina legible a primera vista`
