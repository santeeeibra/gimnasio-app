// Genera un magic-link para que un dueño (o socio) pruebe su vista sin
// login/registro. Uso:
//   node scripts/generar-link-prueba.mjs DNI slug [horas]
// Ej:   node scripts/generar-link-prueba.mjs 30111222 migym 72
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim();
}

const [dni, slug, horasArg] = process.argv.slice(2);
if (!dni || !slug) {
  console.error("Uso: node scripts/generar-link-prueba.mjs DNI slug [horas]");
  process.exit(1);
}
const horas = Number(horasArg) || 72;

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: gym, error: gymErr } = await db
  .from("gimnasios")
  .select("id")
  .eq("slug", slug)
  .single();
if (gymErr || !gym) throw gymErr || new Error("no existe el gym " + slug);

const { data: perfil, error: perfilErr } = await db
  .from("profiles")
  .select("id, nombre, rol")
  .eq("gimnasio_id", gym.id)
  .eq("dni", dni)
  .single();
if (perfilErr || !perfil) throw perfilErr || new Error("no existe perfil con ese DNI en " + slug);

function firmar(payload) {
  return createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY)
    .update(payload)
    .digest("base64url");
}

const exp = Date.now() + horas * 60 * 60 * 1000;
const payload = `${perfil.id}.${exp}`;
const firma = firmar(payload);
const token = Buffer.from(`${payload}.${firma}`).toString("base64url");

const base = process.env.NEXT_PUBLIC_BASE_URL || "https://gimnasio-app-rose.vercel.app";
console.log(`\nLink para ${perfil.nombre} (${perfil.rol}) — válido ${horas}h:\n`);
console.log(`${base}/probar/${token}\n`);
