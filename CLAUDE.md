# Leer primero, en este orden

1. @MAPA_PROYECTO.md — índice: qué feature está en qué archivo y en qué estado.
   Usalo para ubicarte antes de buscar/grep por el repo.
2. @contex-sysgym.md — contexto completo del proyecto.
3. @MEMORIA.md — memoria de corto plazo. Al terminar tu tarea, agregá una línea acá sin leer todo el contexto.
4. @REGLAS_DESARROLLO.md — reglas de cómo trabajar (ahorro de tokens, cuándo
   editar directo vs. avisar, cuándo pasar a Cline vs. Claude Code).
5. **UI, UX & Rutinas (Prioridad Suprema):** Se rige por las 6 skills en `.agents/skills`:
   1º `sysgym-ux-patterns`, 2º `apple-design-skill`, 3º `60fps-animation`, 4º `sysgym-mascot-skill`, 5º `science-workout-engine`, 6º `ios-ux-prototype`.
   Toda interacción debe tener feedback táctil/acústico (`src/lib/ui/hapticos.ts`), 60fps compositor-only y presencia de la mascota oficial (Pulpo Volt verde `#10e7a0`).

No repitas ni resumas estos archivos en tu respuesta: ya los tenés cargados.
Si `MAPA_PROYECTO.md` no cubre lo que buscás, recién ahí buscá en el repo.

# Credenciales y datos sensibles

Logins reales de prueba (superadmin, gimnasios de prueba), PIN_SALT, y
cualquier otro secret viven en `credenciales-locales.md` (raíz del repo,
listed en `.gitignore`, NUNCA se sube a GitHub). Leelo cuando necesites
probar la app en el navegador o correr un script que pida un login. Si
vas a documentar un secret nuevo, anotalo ahí, no en un .md versionado.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

