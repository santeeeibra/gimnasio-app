# Referencias bajo demanda (NO cargar todo de inicio)

Para ubicar cualquier archivo al instante sin recorrer el repo:
1. **Skill GPS de Navegación:** `.agents/skills/sysgym-architecture/SKILL.md` (mapa de URLs, componentes, server actions y tablas). Usar antes de cualquier búsqueda o grep.
2. `MAPA_PROYECTO.md` — índice de features y estado de avance.
3. `contex-sysgym.md` — decisiones de producto históricas (consultar solo secciones puntuales).
4. `MEMORIA.md` — memoria de corto plazo. Al terminar tu tarea, agregá 1 línea al final en UTF-8 sin leer todo el archivo.
5. `REGLAS_DESARROLLO.md` — directivas de desarrollo y ahorro de tokens.
6. **UI, UX & Rutinas (Prioridad Suprema):** Se rige por las skills en `.agents/skills`:
   1º `sysgym-ux-patterns`, 2º `apple-design-skill`, 3º `60fps-animation`, 4º `sysgym-mascot-skill`, 5º `science-workout-engine`, 6º `ios-ux-prototype`.
   Toda interacción debe tener feedback táctil/acústico (`src/lib/ui/hapticos.ts`), 60fps compositor-only y presencia de la mascota oficial (Pulpo Volt verde `#10e7a0`).
7. **Logo oficial:** el tentáculo verde agarrando la mancuerna (con "SYSGYM" abajo): `public/icon-512.png`, `icon-192.png`, `apple-icon.png`. Usar ese, no otro dibujo ni el Pulpo en su lugar. `public/logo-sysgym.png` es solo la marca en texto. Ojo: Glob a veces no lista los PNG de `public/`; confirmar con `git ls-files public`.

# Datos de usuarios: NO perder nada

Ya hay gente registrada en producción (Supabase en la nube). Prohibido borrar
o recrear cuentas, perfiles, clientes, pesos, rutinas o pagos existentes. Toda
migración de datos: primero contar y mostrar qué filas toca, respaldar
(exportar a archivo local) y pedir OK a Santi; mover o copiar, nunca borrar el
origen hasta verificar el destino.

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

