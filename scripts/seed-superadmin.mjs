// Crea/actualiza el gimnasio "sante" y la cuenta de superadmin de la plataforma.
// Login: gimnasio "sante" | usuario (DNI) "43553838" | clave "admin123".
// Imprime el profile.id para copiar a SUPERADMIN_ID (.env.local y Vercel).
//
//   node scripts/seed-superadmin.mjs
//
// Idempotente: reutiliza el gimnasio y el usuario si ya existen (busca por
// SUPERADMIN_ID del .env.local o por cualquiera de los emails conocidos) y
// sincroniza email + clave + profile.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim();
}

const NOMBRE = "Sante";
const SLUG = "sante";
const DNI = "43553838";
const CLAVE = "admin123";
const EMAIL = `${DNI}@${SLUG}.gym.local`;
const EMAILS_VIEJOS = [`admin@${SLUG}.gym.local`];

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

// 2) Usuario en Auth: buscar por SUPERADMIN_ID o por email (nuevo o viejo)
const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
const objetivo = new Set([EMAIL, ...EMAILS_VIEJOS]);
const existing = list?.users?.find(
  (u) => u.id === process.env.SUPERADMIN_ID || objetivo.has(u.email),
);

let userId = null;
if (existing) {
  userId = existing.id;
  await db.auth.admin.updateUserById(userId, {
    email: EMAIL,
    password: CLAVE,
    email_confirm: true,
  });
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
