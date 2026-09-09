# Reglas de desarrollo — SISTEMA GYM (ahorro de tokens)

> Objetivo: gastar el mínimo de tokens de Claude/Cline. Claude solo se usa para
> lo que de verdad lo necesita; el resto lo hace Cline, PowerShell o el humano.
> Pegar este archivo (o `contex-sysgym.md`, que lo referencia) al arrancar.

## Reparto de trabajo

| Tipo de tarea | Quién / cómo |
|---|---|
| Feature nueva que toca varios archivos, refactor grande, diseño de arquitectura | **Claude Code** |
| Rediseño UI de una pantalla con criterio (skills prioritarias: `sysgym-ux-patterns`, `apple-design-skill`, `60fps-animation`) | **Claude Code / Antigravity** |
| Fix puntual en 1-2 archivos, ajuste de copy, mover un componente | **Cline** |
| Cambio trivial (renombrar, un valor, un import, un className) | **PowerShell** o edición manual del humano |
| Aplicar migraciones SQL, correr seed, cargar `.env`, crear proyecto Supabase | **Humano** (manual, ver `INSTRUCCIONES_TEMA.md`) |
| Dudas conceptuales / decisiones de producto | Charla corta, sin abrir código |

## Reglas para Claude / Cline / Antigravity

1. **Cambio corto (≤ ~15 líneas, 1 archivo):** NO editar. Decir exactamente qué
   archivo y qué línea cambiar, y que lo hace el humano o un comando PowerShell.
2. **Ubicar antes de buscar:** leer `contex-sysgym.md` / `plan-proyecto-gimnasios.md`
   para saber dónde está cada cosa antes de hacer `grep`/`glob` masivos.
3. **Respuestas cortas.** Sin resumen final, sin narrar el proceso interno, sin
   repetir lo que ya está en el contexto.
4. **No re-verificar de más.** No volver a leer un archivo recién editado. No
   correr `npm run build` salvo que el cambio sea grande o el humano lo pida.
5. **Verificación en browser:** solo cuando el cambio es visible en el preview.
   Un screenshot alcanza; no hace falta clickear todo.
6. **Un entregable por vez.** No adelantar trabajo de entregables futuros
   (push, rutinas, cron) salvo pedido explícito.
7. **Migraciones:** Claude/Cline escriben el `.sql` en `supabase/migrations/`,
   NO lo aplican. El humano lo corre en el SQL Editor de Supabase.
8. **Tokens de contexto:** no pegar el `node_modules`, ni archivos generados
   (`tsconfig.tsbuildinfo`, `next-env.d.ts`), ni dumps largos de la base.
9. **UI & UX (PRIORIDAD SUPREMA):** Las 6 skills oficiales en `.agents/skills/` tienen prioridad absoluta:
   1º `sysgym-ux-patterns`, 2º `apple-design-skill`, 3º `60fps-animation`, 4º `sysgym-mascot-skill`, 5º `science-workout-engine`, 6º `ios-ux-prototype`.
   Toda pantalla e interacción debe cumplir: mobile-first, targets táctiles ≥44px, animaciones 60fps compositor-only (`transform` & `opacity`),
   curvatura squircle (`rounded-[10px]`, `rounded-[12px]`), feedback sensorial háptico y acústico con `src/lib/ui/hapticos.ts`
   y mascota oficial Pulpo Volt verde `#10e7a0` en `<PulpoCard />` (cero cajas blancas, cero solapamientos).
10. **Commits:** los hace el humano salvo que pida lo contrario. Claude deja el
    árbol listo y dice qué commitear.

## Comandos PowerShell útiles (los corre el humano)

```powershell
# Servidor de desarrollo
npm run dev

# Ver la app desde el celular (misma WiFi): averiguar IP
ipconfig | findstr /i "IPv4"
# luego en el celu: http://<IP>:3000   (requiere "next dev -H 0.0.0.0" en package.json)

# Abrir firewall al puerto 3000 (una vez, PowerShell admin)
New-NetFirewallRule -DisplayName "Next dev 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow

# Build de verificación
npm run build

# Seed de un gimnasio nuevo
node scripts/seed.mjs "Nombre Gym" slug 30111222 "Nombre Dueño"

# Estado de git
git status ; git diff --stat
```

## Checklist antes de pedir trabajo a Claude

- [ ] ¿Es realmente multi-archivo o de criterio? Si no → Cline o PowerShell.
- [ ] ¿Pegué `contex-sysgym.md` como contexto?
- [ ] ¿El pedido es concreto (archivo/pantalla/objetivo), no "mejorá todo"?
- [ ] ¿Las migraciones pendientes ya están aplicadas en Supabase?
