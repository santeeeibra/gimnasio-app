#!/usr/bin/env node
// scripts/test-simulacion-claude.mjs
// Wrapper ejecutor para test-simulacion-claude.ts mediante tsx.
// Permite ejecutar tanto `node scripts/test-simulacion-claude.mjs` como `npx tsx scripts/test-simulacion-claude.mjs`.

import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tsScript = resolve(__dirname, "test-simulacion-claude.ts");

const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
// Se encierran las rutas entre comillas para prevenir problemas con espacios en Windows
const result = spawnSync(npxCmd, ["tsx", `"${tsScript}"`], {
  encoding: "utf-8",
  shell: true,
  env: process.env,
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

process.exit(result.status ?? 0);
