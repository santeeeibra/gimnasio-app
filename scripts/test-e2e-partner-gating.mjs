// Test E2E: Programa SysGym Partner + Gating de Plan Inicial (40 alumnos).
// Simula, contra la Supabase real (service_role), el circuito completo:
//   partner de prueba -> registro de gimnasio con ?ref=CODIGO -> notificación
//   "nuevo_registro" -> primer pago aprobado -> comisión (Fast-Start 20%) +
//   notificación "gimnasio_pago" -> partner_balance() -> alta de 40 alumnos
//   -> el alumno #41 dispara el gating (LIMIT_EXCEEDED_UPGRADE_REQUIRED).
//
// Solo lee/escribe filas de prueba con prefijo E2E_TEST_ (auth users, gimnasio,
// partner, notificaciones, etc.) y las borra al final (éxito o error).
//
// Uso: node scripts/test-e2e-partner-gating.mjs

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim();
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const db = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const RUN_ID = Date.now();
const REFERRAL_CODE = "testpartner"; // check en DB obliga minúsculas
const SLUG_GYM = `e2e-test-gym-${RUN_ID}`;
const PARTNER_EMAIL = `e2e-partner-${RUN_ID}@sysgym.test`;

const resultados = []; // { paso, ok, detalle }
function reportar(paso, ok, detalle) {
  resultados.push({ paso, ok, detalle });
  console.log(`${ok ? "✅" : "❌"} ${paso}${detalle ? " — " + detalle : ""}`);
}

// IDs a limpiar al final
const cleanup = {
  authUserIds: [],
  gimnasioIds: [],
  partnerIds: [],
};

async function main() {
  console.log("══════════════════════════════════════════════════════");
  console.log("E2E — SysGym Partner + Gating Plan Inicial (40 alumnos)");
  console.log("══════════════════════════════════════════════════════\n");

  // ── 0. Verificar que el esquema del programa Partner existe ──────────
  const { error: schemaErr } = await db.from("partners").select("id").limit(1);
  if (schemaErr) {
    reportar(
      "0. Esquema Partner disponible",
      false,
      `tabla "partners" no accesible (¿faltan migraciones 0044-0047?): ${schemaErr.message}`,
    );
    throw new Error("Abortando: esquema no aplicado.");
  }
  reportar("0. Esquema Partner disponible", true);

  // ── 1. Crear partner de prueba (TESTPARTNER) ──────────────────────────
  const { data: partnerAuth, error: partnerAuthErr } = await db.auth.admin.createUser({
    email: PARTNER_EMAIL,
    password: `E2E-test-${RUN_ID}!`,
    email_confirm: true,
  });
  if (partnerAuthErr) throw partnerAuthErr;
  cleanup.authUserIds.push(partnerAuth.user.id);

  const { data: partner, error: partnerErr } = await db
    .from("partners")
    .insert({
      user_id: partnerAuth.user.id,
      nombre: "Partner E2E Test",
      referral_code: REFERRAL_CODE,
      estado: "activo",
    })
    .select("*")
    .single();

  if (partnerErr) {
    reportar("1. Crear partner de prueba (TESTPARTNER)", false, partnerErr.message);
    throw partnerErr;
  }
  cleanup.partnerIds.push(partner.id);
  reportar("1. Crear partner de prueba (TESTPARTNER)", true, `partner.id=${partner.id}`);

  // ── 2. Simular registro de gimnasio con ?ref=TESTPARTNER ─────────────
  // Replica el código real de registrarGimnasio() en
  // src/app/registro-gimnasio/actions.ts (búsqueda de refCode + insert +
  // notificación), sin pasar por el form/redirect de Next.
  const refCode = REFERRAL_CODE.toUpperCase(); // el form normaliza a upper, igual que la action
  const { data: partnerFound } = await db
    .from("partners")
    .select("id, nombre")
    .eq("referral_code", refCode.toLowerCase()) // referral_code se guarda en minúsculas (constraint [a-z0-9-])
    .eq("estado", "activo")
    .maybeSingle();

  if (!partnerFound) {
    reportar("2a. Resolver partner por refCode (case-insensitive)", false, "no encontrado");
  } else {
    reportar("2a. Resolver partner por refCode (case-insensitive)", true);
  }

  const { data: gym, error: gymErr } = await db
    .from("gimnasios")
    .insert({
      nombre: "Gym E2E Test",
      slug: SLUG_GYM,
      estado: "prueba",
      referred_by_partner_id: partnerFound?.id ?? null,
    })
    .select("*")
    .single();
  if (gymErr) {
    reportar("2b. Insertar gimnasio referido", false, gymErr.message);
    throw gymErr;
  }
  cleanup.gimnasioIds.push(gym.id);

  reportar(
    "2b. gimnasio.referred_by_partner_id seteado correctamente",
    gym.referred_by_partner_id === partner.id,
    `esperado=${partner.id} obtenido=${gym.referred_by_partner_id}`,
  );

  await db.from("partner_notifications").insert({
    partner_id: partner.id,
    tipo: "nuevo_registro",
    titulo: "¡Nuevo gimnasio adherido con tu código!",
    mensaje: `El gimnasio "${gym.nombre}" acaba de registrarse con tu código.`,
    metadata: { gimnasio_id: gym.id, nombre_gimnasio: gym.nombre },
  });

  const { data: notifRegistro } = await db
    .from("partner_notifications")
    .select("*")
    .eq("partner_id", partner.id)
    .eq("tipo", "nuevo_registro")
    .maybeSingle();

  reportar(
    "2c. Notificación 'nuevo_registro' insertada",
    !!notifRegistro,
    notifRegistro ? `id=${notifRegistro.id}` : "no se encontró la fila",
  );

  // ── 3. Simular primer pago aprobado (plan_mensual) ────────────────────
  const MONTO_PRIMER_PAGO = 25000;
  const { data: pagoPendiente, error: pagoInsErr } = await db
    .from("pagos_plataforma")
    .insert({
      gimnasio_id: gym.id,
      monto_ars: MONTO_PRIMER_PAGO,
      dias: 30,
      estado: "pendiente",
      tipo: "plan_mensual",
      proveedor: "manual",
    })
    .select("*")
    .single();
  if (pagoInsErr) {
    reportar("3a. Insertar pago pendiente", false, pagoInsErr.message);
    throw pagoInsErr;
  }

  // Aprobación: UPDATE estado pendiente -> aprobado (dispara los triggers de
  // 0045 [comisión] y 0047 [notificación], igual que aprobarPagoPlataforma()).
  const { error: pagoUpdErr } = await db
    .from("pagos_plataforma")
    .update({ estado: "aprobado", confirmado_at: new Date().toISOString() })
    .eq("id", pagoPendiente.id)
    .eq("estado", "pendiente");
  if (pagoUpdErr) {
    reportar("3b. Aprobar pago (dispara triggers)", false, pagoUpdErr.message);
    throw pagoUpdErr;
  }
  reportar("3b. Aprobar pago (dispara triggers)", true);

  // Esperar un instante — los triggers corren dentro de la misma transacción
  // del UPDATE, así que ya están aplicados; no hace falta sleep, pero
  // confirmamos leyendo de nuevo.
  const { data: comision } = await db
    .from("partner_commissions")
    .select("*")
    .eq("pago_plataforma_id", pagoPendiente.id)
    .maybeSingle();

  const comisionEsperada = Math.round(MONTO_PRIMER_PAGO * 0.2 * 100) / 100; // Fast-Start 20% (partner nuevo, <5 comisiones previas)
  reportar(
    "3c. Trigger generó partner_commissions (Fast-Start 20%)",
    !!comision && comision.porcentaje === 20 && Number(comision.monto_comision_ars) === comisionEsperada,
    comision
      ? `porcentaje=${comision.porcentaje} monto=${comision.monto_comision_ars} (esperado ${comisionEsperada})`
      : "no se generó ninguna fila de comisión",
  );

  const { data: notifPago } = await db
    .from("partner_notifications")
    .select("*")
    .eq("partner_id", partner.id)
    .eq("tipo", "gimnasio_pago")
    .maybeSingle();
  reportar(
    "3d. Notificación 'gimnasio_pago' insertada",
    !!notifPago,
    notifPago ? `titulo="${notifPago.titulo}"` : "no se encontró la fila",
  );

  // ── 4. partner_balance() ───────────────────────────────────────────────
  const { data: balance, error: balanceErr } = await db.rpc("partner_balance", {
    p_partner_id: partner.id,
  });
  if (balanceErr) {
    reportar("4. RPC partner_balance()", false, balanceErr.message);
  } else {
    reportar(
      "4. RPC partner_balance() == comisión generada (sin bonos ni retiros)",
      Number(balance) === comisionEsperada,
      `partner_balance=${balance} esperado=${comisionEsperada}`,
    );
  }

  // ── 5. Gating de 40 alumnos ────────────────────────────────────────────
  // El gimnasio de prueba no tiene plan_plataforma_id asignado (free/starter)
  // => rige el límite duro de 40 alumnos activos vía trigger
  // clientes_check_limite_gratuito (migración 0044).
  console.log("\n5. Creando 40 clientes activos (esto tarda unos segundos)...");
  let creados = 0;
  for (let i = 1; i <= 40; i++) {
    const dni = `9${String(RUN_ID).slice(-6)}${String(i).padStart(2, "0")}`;
    const email = `e2e-cliente-${RUN_ID}-${i}@sysgym.test`;
    const { data: authUser, error: authErr } = await db.auth.admin.createUser({
      email,
      password: `E2E-cliente-${RUN_ID}-${i}!`,
      email_confirm: true,
    });
    if (authErr) {
      reportar(`5.${i}. Crear alumno #${i}`, false, `auth: ${authErr.message}`);
      break;
    }
    cleanup.authUserIds.push(authUser.user.id);

    const { error: profErr } = await db.from("profiles").insert({
      id: authUser.user.id,
      gimnasio_id: gym.id,
      rol: "cliente",
      dni,
      nombre: `Alumno E2E ${i}`,
      debe_cambiar_clave: false,
    });
    if (profErr) {
      reportar(`5.${i}. Crear alumno #${i}`, false, `profile: ${profErr.message}`);
      break;
    }

    const { error: cliErr } = await db.from("clientes").insert({
      gimnasio_id: gym.id,
      profile_id: authUser.user.id,
      estado_cuota: "vencido",
      acceso_habilitado: true,
    });
    if (cliErr) {
      // Si esto pasa antes del alumno #41, es un bug (el cap se disparó antes de tiempo).
      reportar(
        `5.${i}. Crear alumno #${i} (activo)`,
        false,
        `trigger bloqueó antes de tiempo: ${cliErr.message}`,
      );
      break;
    }
    creados++;
  }
  reportar("5. Se crearon los 40 alumnos activos sin bloqueo", creados === 40, `creados=${creados}/40`);

  // Confirmar el conteo real (equivalente a cupoSocios() en src/lib/plataforma/cupo.ts)
  const { count: usados } = await db
    .from("clientes")
    .select("id", { count: "exact", head: true })
    .eq("gimnasio_id", gym.id)
    .eq("acceso_habilitado", true);
  reportar("5b. Conteo de alumnos activos == 40 (cupoSocios)", usados === 40, `usados=${usados}`);

  // ── 6. Alumno #41: debe rechazarse (gating bloqueante) ────────────────
  const dni41 = `9${String(RUN_ID).slice(-6)}41`;
  const email41 = `e2e-cliente-${RUN_ID}-41@sysgym.test`;
  const { data: authUser41, error: authErr41 } = await db.auth.admin.createUser({
    email: email41,
    password: `E2E-cliente-${RUN_ID}-41!`,
    email_confirm: true,
  });
  if (authErr41) throw authErr41;
  cleanup.authUserIds.push(authUser41.user.id);

  const { error: profErr41 } = await db.from("profiles").insert({
    id: authUser41.user.id,
    gimnasio_id: gym.id,
    rol: "cliente",
    dni: dni41,
    nombre: "Alumno E2E 41",
    debe_cambiar_clave: false,
  });
  if (profErr41) throw profErr41;

  const { error: cliErr41 } = await db.from("clientes").insert({
    gimnasio_id: gym.id,
    profile_id: authUser41.user.id,
    estado_cuota: "vencido",
    acceso_habilitado: true,
  });

  const bloqueadoCorrectamente =
    !!cliErr41 && /LIMIT_EXCEEDED_UPGRADE_REQUIRED/.test(cliErr41.message ?? "");
  reportar(
    "6. Alumno #41 rechazado con LIMIT_EXCEEDED_UPGRADE_REQUIRED",
    bloqueadoCorrectamente,
    cliErr41 ? cliErr41.message : "¡se insertó sin error! (canAddMember debería ser false)",
  );

  // También replicamos el check en TS (cupoSocios) para confirmar que la capa
  // de aplicación ve el mismo resultado que el trigger de DB.
  const { count: usadosFinal } = await db
    .from("clientes")
    .select("id", { count: "exact", head: true })
    .eq("gimnasio_id", gym.id)
    .eq("acceso_habilitado", true);
  const canAddMember = (usadosFinal ?? 0) < 40;
  reportar(
    "6b. cupoSocios() (capa TS) coincide: canAddMember=false en el alumno #41",
    canAddMember === false,
    `usados=${usadosFinal}`,
  );

  console.log("\n══════════════════════════════════════════════════════");
  console.log("RESUMEN");
  console.log("══════════════════════════════════════════════════════");
  const fallidos = resultados.filter((r) => !r.ok);
  for (const r of resultados) {
    console.log(`${r.ok ? "PASS" : "FAIL"} — ${r.paso}${r.detalle ? " (" + r.detalle + ")" : ""}`);
  }
  console.log(`\nTotal: ${resultados.length} — OK: ${resultados.length - fallidos.length} — FAIL: ${fallidos.length}`);
}

async function limpiar() {
  console.log("\n🧹 Limpiando datos de prueba...");
  // Orden: hijos primero (FKs con ON DELETE CASCADE cubren la mayoría, pero
  // somos explícitos para no depender de eso).
  for (const gimnasioId of cleanup.gimnasioIds) {
    await db.from("pagos_plataforma").delete().eq("gimnasio_id", gimnasioId);
    await db.from("clientes").delete().eq("gimnasio_id", gimnasioId);
    await db.from("profiles").delete().eq("gimnasio_id", gimnasioId);
    await db.from("gimnasios").delete().eq("id", gimnasioId);
  }
  for (const partnerId of cleanup.partnerIds) {
    await db.from("partner_notifications").delete().eq("partner_id", partnerId);
    await db.from("partner_commissions").delete().eq("partner_id", partnerId);
    await db.from("partner_milestone_awards").delete().eq("partner_id", partnerId);
    await db.from("partner_payouts").delete().eq("partner_id", partnerId);
    await db.from("partners").delete().eq("id", partnerId);
  }
  for (const userId of cleanup.authUserIds) {
    await db.auth.admin.deleteUser(userId).catch(() => {});
  }
  console.log(
    `   Borrados: ${cleanup.gimnasioIds.length} gimnasio(s), ${cleanup.partnerIds.length} partner(s), ${cleanup.authUserIds.length} usuario(s) auth.`,
  );
}

main()
  .catch((err) => {
    console.error("\n❌ ERROR no controlado durante el test:", err.message ?? err);
  })
  .finally(async () => {
    await limpiar();
  });
