// Crea el gimnasio "sante" y la cuenta de superadmin de la plataforma.
// Login: gimnasio "sante" | usuario (DNI) "admin" | clave "43553838".
// Imprime el profile.id para copiar a SUPERADMIN_ID (.env.local y Vercel).
//
//   node scripts/seed-superadmin.mjs
//
// Idempotente: si el gimnasio o el usuario ya existen, los reutiliza.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim();
}

const NOMBRE = "Sante";
const SLUG = "sante";
const DNI = "admin";
const CLAVE = "43553838";
const EMAIL = `${DNI}@${SLUG}.gym.local`;

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

// 1) Gimnasio
let { data: gym } = await db
  .from("gimnasios")
  .select("id")
  .eq("slug", SLUG)
  .maybeSingle();
if (!gym) {
  const { data, error } = await db
    .from("gimnasios")
    .insert({ nombre: NOMBRE, slug: SLUG })
    .select("id")
    .single();
  if (error) throw error;
  gym = data;
}

// 2) Usuario en Auth (busca por email; si no está, lo crea)
let userId = null;
const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
const existing = list?.users?.find((u) => u.email === EMAIL);
if (existing) {
  userId = existing.id;
  await db.auth.admin.updateUserById(userId, { password: CLAVE });
} else {
  const { data, error } = await db.auth.admin.createUser({
    email: EMAIL,
    password: CLAVE,
    email_confirm: true,
  });
  if (error) throw error;
  userId = data.user.id;
}

// 3) Profile (rol dueno, sin forzar cambio de clave)
const { error: profErr } = await db.from("profiles").upsert({
  id: userId,
  gimnasio_id: gym.id,
  rol: "dueno",
  dni: DNI,
  nombre: "Superadmin",
  debe_cambiar_clave: false,
});
if (profErr) throw profErr;

console.log("Listo.");
console.log(`  Login: gimnasio "${SLUG}" | usuario "${DNI}" | clave "${CLAVE}"`);
console.log(`  SUPERADMIN_ID=${userId}`);
