// Crea un gimnasio y su dueño. Uso:
//   node scripts/seed.mjs "Gimnasio Olimpo" olimpo 30111222 "Juan Pérez"
// Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim();
}

const [nombre, slug, dni, nombreDueno] = process.argv.slice(2);
if (!nombre || !slug || !dni || !nombreDueno) {
  console.error('Uso: node scripts/seed.mjs "Nombre" slug DNI "Nombre Dueño"');
  process.exit(1);
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: gym, error: gymErr } = await db
  .from("gimnasios")
  .insert({ nombre, slug })
  .select()
  .single();
if (gymErr) throw gymErr;

const email = `${dni.toLowerCase()}@${slug}.gym.local`;
const password = `gym${dni.replace(/\D/g, "").slice(-4)}`;
const { data: created, error: authErr } = await db.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (authErr) throw authErr;

const { error: profErr } = await db.from("profiles").insert({
  id: created.user.id,
  gimnasio_id: gym.id,
  rol: "dueno",
  dni,
  nombre: nombreDueno,
  debe_cambiar_clave: true,
});
if (profErr) throw profErr;

console.log("Listo.");
console.log(`  Gimnasio: ${nombre} (${slug})`);
console.log(`  Login dueño -> gimnasio: ${slug} | DNI: ${dni} | clave: ${password}`);
