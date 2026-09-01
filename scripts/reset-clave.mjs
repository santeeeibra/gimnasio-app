// Resetea la contraseña de un usuario. Uso:
//   node scripts/reset-clave.mjs 30111222 migym gym1222
// Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim();
}

const [dni, slug, nueva] = process.argv.slice(2);
if (!dni || !slug || !nueva) {
  console.error("Uso: node scripts/reset-clave.mjs DNI slug NUEVA_CLAVE");
  process.exit(1);
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const email = `${dni.toLowerCase()}@${slug}.gym.local`;
const { data: list, error: listErr } = await db.auth.admin.listUsers();
if (listErr) throw listErr;

const user = list.users.find((u) => u.email === email);
if (!user) throw new Error("no existe " + email);

const { error } = await db.auth.admin.updateUserById(user.id, {
  password: nueva,
});
if (error) throw error;

console.log("clave actualizada:", email, "->", nueva);
