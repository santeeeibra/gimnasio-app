#!/usr/bin/env node
// scripts/test-acceso-turnstile.mjs
// Wrapper ejecutor para test-acceso-turnstile.ts mediante tsx.
// Permite ejecutar tanto `node scripts/test-acceso-turnstile.mjs` como `npx tsx scripts/test-acceso-turnstile.mjs`.

import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tsScript = resolve(__dirname, "test-acceso-turnstile.ts");

const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(npxCmd, ["tsx", `"${tsScript}"`], {
  encoding: "utf-8",
  shell: true,
  env: process.env,
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

process.exit(result.status ?? 0);
