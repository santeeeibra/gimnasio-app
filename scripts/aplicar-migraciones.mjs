// Aplica migraciones SQL pendientes contra la base de Supabase, sin copiar y
// pegar en el SQL Editor. Corre cada archivo dentro de una transacción y para
// al primer error.
//
// Uso:
//   node scripts/aplicar-migraciones.mjs                 # aplica la lista PENDIENTES de abajo
//   node scripts/aplicar-migraciones.mjs 0012 0019       # solo esas
//
// Requiere:
//   1) npm i -D pg
//   2) En .env.local:  DATABASE_URL=postgresql://postgres.<ref>:<PASS>@aws-...pooler.supabase.com:5432/postgres
//      (Supabase Dashboard -> Project Settings -> Database -> Connection string -> URI,
//       modo "Session". Reemplazá [YOUR-PASSWORD] por la clave de la base.)

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim();
}

const DIR = "supabase/migrations";

// Migraciones pendientes de aplicar (ver MAPA_PROYECTO.md), en orden.
const PENDIENTES = ["0006", "0007", "0008", "0009", "0012", "0018", "0019"];

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL en .env.local (ver cabecera de este archivo).");
  process.exit(1);
}

const prefijos = process.argv.slice(2).length ? process.argv.slice(2) : PENDIENTES;
const todos = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const aplicar = prefijos.map((p) => {
  const f = todos.find((x) => x.startsWith(p));
  if (!f) {
    console.error(`No encontré migración que empiece con "${p}" en ${DIR}`);
    process.exit(1);
  }
  return f;
});

const client = new pg.Client({ connectionString: url });
await client.connect();

for (const f of aplicar) {
  const sql = readFileSync(join(DIR, f), "utf8");
  process.stdout.write(`→ ${f} ... `);
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("commit");
    console.log("OK");
  } catch (e) {
    await client.query("rollback");
    console.log("FALLÓ");
    console.error(`\n${f}: ${e.message}\n`);
    await client.end();
    process.exit(1);
  }
}

await client.end();
console.log("\nListo. Migraciones aplicadas:", aplicar.join(", "));
