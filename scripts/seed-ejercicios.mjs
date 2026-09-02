// Carga la base global de ejercicios (gimnasio_id = null) desde
// src/data/ejercicios.json. Idempotente: upsert por slug.
//
//   node scripts/seed-ejercicios.mjs
//
// Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
// (RLS solo deja escribir ejercicios del propio gimnasio; los globales van con
// service_role).
//
// TODO opcional: enriquecer imagen_url con GIFs de wger (https://wger.de),
// completando el campo en el JSON. La app degrada bien si queda en null.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim();
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const ejercicios = JSON.parse(readFileSync("src/data/ejercicios.json", "utf8"));

const filas = ejercicios.map((e) => ({
  gimnasio_id: null,
  slug: e.slug,
  nombre: e.nombre,
  grupo_muscular: e.grupo_muscular,
  patron: e.patron,
  equipo: e.equipo,
  nivel: e.nivel,
  descripcion: e.descripcion ?? null,
  imagen_url: e.imagen_url ?? null,
}));

const { error } = await db
  .from("ejercicios")
  .upsert(filas, { onConflict: "slug", ignoreDuplicates: false });

if (error) {
  console.error("Error:", error.message);
  process.exit(1);
}

console.log(`Listo. ${filas.length} ejercicios globales cargados / actualizados.`);
