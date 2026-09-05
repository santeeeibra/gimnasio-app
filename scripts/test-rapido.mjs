// scripts/test-rapido.mjs
// Mini smoke-test para SysGym (< 1 segundo).
// Ejecutar antes de git push: npm run test:fast

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const inicio = Date.now();
const VERDE = "\x1b[32m";
const ROJO = "\x1b[31m";
const AMARILLO = "\x1b[33m";
const CIAN = "\x1b[36m";
const RESET = "\x1b[0m";

let fallos = 0;
let aciertos = 0;

function assert(cond, desc) {
  if (cond) {
    console.log(`  ${VERDE}✔${RESET} ${desc}`);
    aciertos++;
  } else {
    console.log(`  ${ROJO}✖ FALLÓ:${RESET} ${desc}`);
    fallos++;
  }
}

console.log(`\n${CIAN}=== SMOKE TEST RÁPIDO — SYSGYM ===${RESET}\n`);

// 1. Cargar .env.local
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g, "");
  }
}

// 2. Test: Variables de Entorno Críticas
console.log(`${AMARILLO}[1/4] Variables de Entorno Críticas${RESET}`);
assert(!!process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL presente");
assert(!!process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY presente");
assert(!!process.env.SUPERADMIN_ID, "SUPERADMIN_ID configurado para acceso a /admin");
const tienePush = !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
assert(tienePush, "Web Push VAPID keys presentes");

// 3. Test: Lógica Pura de Fechas y Cuotas (cero llamadas de red)
console.log(`\n${AMARILLO}[2/4] Lógica Pura de Fechas y Cuotas${RESET}`);
function sumarDias(fecha, dias) {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}
function diasRestantes(fechaVencimiento) {
  if (!fechaVencimiento) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const venc = new Date(fechaVencimiento + "T00:00:00");
  return Math.round((venc.getTime() - hoy.getTime()) / 86_400_000);
}
function estadoDesdeDias(dias) {
  if (dias === null || dias < 0) return "vencido";
  if (dias <= 6) return "por_vencer";
  return "al_dia";
}

const fechaBase = new Date("2026-06-01T00:00:00Z");
assert(sumarDias(fechaBase, 30) === "2026-07-01", "sumarDias suma correctamente días normales");
assert(sumarDias(fechaBase, 0) === "2026-06-01", "sumarDias con 0 días mantiene fecha");

const hoyIso = new Date().toISOString().slice(0, 10);
assert(diasRestantes(hoyIso) === 0, "diasRestantes para hoy da 0");
assert(estadoDesdeDias(0) === "por_vencer", "0 días da estado 'por_vencer'");
assert(estadoDesdeDias(6) === "por_vencer", "6 días da estado 'por_vencer'");
assert(estadoDesdeDias(7) === "al_dia", "7 días da estado 'al_dia'");
assert(estadoDesdeDias(-1) === "vencido", "-1 días da estado 'vencido'");
assert(estadoDesdeDias(null) === "vencido", "null da estado 'vencido'");

// 4. Test: Conexión y Salud de Tablas en Supabase
console.log(`\n${AMARILLO}[3/4] Conexión y Esquema de Supabase${RESET}`);
let db = null;
if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
}

if (db) {
  try {
    const [gyms, perfiles, clientes, planes, errores] = await Promise.all([
      db.from("gimnasios").select("id", { count: "exact", head: true }),
      db.from("profiles").select("id", { count: "exact", head: true }),
      db.from("clientes").select("id", { count: "exact", head: true }),
      db.from("planes_plataforma").select("id", { count: "exact", head: true }),
      db.from("errores_app").select("id", { count: "exact", head: true }),
    ]);

    assert(!gyms.error, "Tabla 'gimnasios' accesible por service_role");
    assert(!perfiles.error, "Tabla 'profiles' accesible por service_role");
    assert(!clientes.error, "Tabla 'clientes' accesible por service_role");
    assert(!planes.error, "Tabla 'planes_plataforma' accesible por service_role");
    assert(!errores.error, "Tabla 'errores_app' accesible por service_role");
  } catch (err) {
    assert(false, `Error consultando Supabase: ${err.message}`);
  }
} else {
  assert(false, "No se pudo inicializar cliente Supabase");
}

// 5. Test: Integridad de Plan Básico y Superadmin
console.log(`\n${AMARILLO}[4/4] Integridad de Plataforma${RESET}`);
if (db) {
  const { data: planBasico } = await db
    .from("planes_plataforma")
    .select("id, nombre")
    .eq("nombre", "Básico")
    .maybeSingle();
  assert(!!planBasico, "Plan de plataforma 'Básico' existe para nuevos gyms");

  if (process.env.SUPERADMIN_ID) {
    const { data: superadminProfile } = await db
      .from("profiles")
      .select("id, nombre")
      .eq("id", process.env.SUPERADMIN_ID)
      .maybeSingle();
    assert(!!superadminProfile, `Perfil superadmin (${superadminProfile?.nombre ?? "activo"}) verificado`);
  }
}

const tiempo = ((Date.now() - inicio) / 1000).toFixed(2);
console.log("\n-------------------------------------------");
if (fallos === 0) {
  console.log(`${VERDE}✔ TODO EN ORDEN (${aciertos} checks pasados en ${tiempo}s)${RESET}\n`);
  process.exit(0);
} else {
  console.log(`${ROJO}✖ HAY ${fallos} FALLO(S) (${aciertos} pasados en ${tiempo}s)${RESET}\n`);
  process.exit(1);
}
