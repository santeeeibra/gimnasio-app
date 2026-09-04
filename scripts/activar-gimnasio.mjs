// Convierte uno de los gimnasios genéricos (disp1, disp2...) en el gimnasio
// real de un dueño que ya firmó. Cambia nombre del gym, DNI y nombre del
// dueño, y (opcional) el slug de login. La clave vuelve a la inicial
// ("gym" + últimos 4 del DNI nuevo) para que el dueño la cambie al entrar.
//
// Uso:
//   node scripts/activar-gimnasio.mjs disp1 "Gimnasio Olimpo" 30111222 "Juan Pérez" [nuevo-slug] [email-recuperacion]
//
// El slug nuevo es opcional: si no lo pasás, se mantiene "disp1" (o el que
// tenía) como identificador de login, solo cambian nombre/DNI/dueño.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim();
}

const [slugActual, nombreGym, dni, nombreDueno, nuevoSlug, emailRecuperacion] =
  process.argv.slice(2);
if (!slugActual || !nombreGym || !dni || !nombreDueno) {
  console.error(
    'Uso: node scripts/activar-gimnasio.mjs slug-actual "Nombre Gym real" DNI "Nombre Dueño" [nuevo-slug] [email-recuperacion]',
  );
  process.exit(1);
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: gym, error: gymErr } = await db
  .from("gimnasios")
  .select("id, slug")
  .eq("slug", slugActual)
  .single();
if (gymErr || !gym) {
  throw gymErr ?? new Error(`No existe un gimnasio con slug "${slugActual}".`);
}

const { data: dueno, error: duenoErr } = await db
  .from("profiles")
  .select("id")
  .eq("gimnasio_id", gym.id)
  .eq("rol", "dueno")
  .single();
if (duenoErr || !dueno) {
  throw duenoErr ?? new Error("No se encontró el dueño de ese gimnasio.");
}

const slugFinal = (nuevoSlug || slugActual).toLowerCase();
const email = `${dni.toLowerCase()}@${slugFinal}.gym.local`;
const password = `gym${dni.replace(/\D/g, "").slice(-4)}`;

const { error: authErr } = await db.auth.admin.updateUserById(dueno.id, {
  email,
  password,
  email_confirm: true,
});
if (authErr) throw authErr;

const { error: profErr } = await db
  .from("profiles")
  .update({
    dni,
    nombre: nombreDueno,
    debe_cambiar_clave: true,
    ...(emailRecuperacion
      ? { email_recuperacion: emailRecuperacion.trim().toLowerCase() }
      : {}),
  })
  .eq("id", dueno.id);
if (profErr) throw profErr;

const gymUpdate = { nombre: nombreGym };
if (nuevoSlug) gymUpdate.slug = slugFinal;
const { error: gymUpdErr } = await db
  .from("gimnasios")
  .update(gymUpdate)
  .eq("id", gym.id);
if (gymUpdErr) throw gymUpdErr;

console.log("Listo.");
console.log(`  Gimnasio: ${nombreGym} (${slugFinal})`);
console.log(`  Login dueño -> gimnasio: ${slugFinal} | DNI: ${dni} | clave: ${password}`);
