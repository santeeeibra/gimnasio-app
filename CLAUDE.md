# Leer primero, en este orden

1. @MAPA_PROYECTO.md — índice: qué feature está en qué archivo y en qué estado.
   Usalo para ubicarte antes de buscar/grep por el repo.
2. @contex-sysgym.md — contexto completo del proyecto (stack, decisiones, specs).
3. @REGLAS_DESARROLLO.md — reglas de cómo trabajar (ahorro de tokens, cuándo
   editar directo vs. avisar, cuándo pasar a Cline vs. Claude Code).

No repitas ni resumas estos archivos en tu respuesta: ya los tenés cargados.
Si `MAPA_PROYECTO.md` no cubre lo que buscás, recién ahí buscá en el repo.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
