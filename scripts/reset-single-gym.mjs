// Script: scripts/reset-single-gym.mjs
// Resetea la base de datos de Supabase a UN SOLO gimnasio de prueba impecable:
// Gimnasio: "Gimnasio Sante" (slug: "sante", plan Elite activo por 1 año)
// Dueño: Santiago Dueño (DNI: 12345678, user: 182ddc81-d517-4021-a2db-9bae2cc5b932, clave: admin123)
// Socio: Lucas Socio (DNI: 20000000, clave: gym2000, plan Pase Libre $25.000, rutina 4 ejercicios)

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim();
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPERADMIN_ID = "182ddc81-d517-4021-a2db-9bae2cc5b932";
const PLAN_ELITE_ID = "26fcb980-d8f1-4476-9766-b75d153f09aa";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Faltan variables en .env.local (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}

const db = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log("══════════════════════════════════════════════════════════════");
  console.log("🚀 INICIANDO RESET DE BASE DE DATOS SysGym (GIMNASIO ÚNICO)");
  console.log("══════════════════════════════════════════════════════════════\n");

  // 1. Obtener o preparar el gimnasio principal "Gimnasio Sante"
  console.log("1️⃣ Verificando / creando el gimnasio principal 'sante'...");
  let { data: santeGym, error: gymErr } = await db
    .from("gimnasios")
    .select("*")
    .eq("slug", "sante")
    .maybeSingle();

  const fechaVencePlan = new Date();
  fechaVencePlan.setFullYear(fechaVencePlan.getFullYear() + 1);
  const vencePlanStr = fechaVencePlan.toISOString().split("T")[0];

  if (!santeGym) {
    console.log("   Creando gimnasio 'sante'...");
    const { data: newGym, error: createGymErr } = await db
      .from("gimnasios")
      .insert({
        nombre: "Gimnasio Sante",
        slug: "sante",
        estado: "activo",
        plan_plataforma_id: PLAN_ELITE_ID,
        plan_plataforma_vence_el: vencePlanStr,
      })
      .select()
      .single();
    if (createGymErr) throw createGymErr;
    santeGym = newGym;
  } else {
    console.log(`   Actualizando gimnasio existente (ID: ${santeGym.id})...`);
    const { data: updatedGym, error: updateGymErr } = await db
      .from("gimnasios")
      .update({
        nombre: "Gimnasio Sante",
        slug: "sante",
        estado: "activo",
        plan_plataforma_id: PLAN_ELITE_ID,
        plan_plataforma_vence_el: vencePlanStr,
      })
      .eq("id", santeGym.id)
      .select()
      .single();
    if (updateGymErr) throw updateGymErr;
    santeGym = updatedGym;
  }
  console.log(`   ✅ Gimnasio '${santeGym.nombre}' (${santeGym.slug}) activo con Plan Elite hasta ${vencePlanStr}.\n`);

  // 2. Limpieza de datos de otros gimnasios
  console.log("2️⃣ Buscando y eliminando otros gimnasios y sus datos...");
  const { data: allGyms } = await db.from("gimnasios").select("id, slug, nombre");
  const otherGyms = (allGyms || []).filter((g) => g.id !== santeGym.id);
  const otherGymIds = otherGyms.map((g) => g.id);

  console.log(`   Gimnasios encontrados a eliminar: ${otherGyms.length}`);
  otherGyms.forEach((g) => console.log(`   - ${g.nombre} (${g.slug}) [${g.id}]`));

  // Limpiar tablas dependientes explícitamente
  console.log("   Limpiando tablas dependientes de otros gimnasios...");
  if (otherGymIds.length > 0) {
    await db.from("registros_entrada").delete().in("gimnasio_id", otherGymIds);
    await db.from("pedidos_asistencia").delete().in("gimnasio_id", otherGymIds);
    await db.from("registro_progreso").delete().in("gimnasio_id", otherGymIds);
    await db.from("registro_peso").delete().in("gimnasio_id", otherGymIds);
    await db.from("buzon_comentarios").delete().in("gimnasio_id", otherGymIds);
    await db.from("push_subscriptions").delete().in("gimnasio_id", otherGymIds);
    await db.from("pagos_plataforma").delete().in("gimnasio_id", otherGymIds);
    await db.from("pagos").delete().in("gimnasio_id", otherGymIds);
    await db.from("rutinas").delete().in("gimnasio_id", otherGymIds);
    await db.from("clientes").delete().in("gimnasio_id", otherGymIds);
    await db.from("planes").delete().in("gimnasio_id", otherGymIds);
    await db.from("mensajes").delete().in("gimnasio_id", otherGymIds);
    await db.from("admin_audit_log").delete().in("gimnasio_id", otherGymIds);

    // Eliminar perfiles de otros gimnasios (nunca el superadmin)
    await db.from("profiles").delete().in("gimnasio_id", otherGymIds).neq("id", SUPERADMIN_ID);

    // Eliminar los gimnasios
    const { error: delGymErr } = await db.from("gimnasios").delete().in("id", otherGymIds);
    if (delGymErr) console.warn("   ⚠️ Aviso al borrar gimnasios:", delGymErr.message);
  }

  // 3. Limpiar datos viejos dentro de Sante (para dejar estado 100% impecable)
  console.log("3️⃣ Limpiando clientes viejos y datos residuales en 'sante'...");
  await db.from("registros_entrada").delete().eq("gimnasio_id", santeGym.id);
  await db.from("pedidos_asistencia").delete().eq("gimnasio_id", santeGym.id);
  await db.from("registro_progreso").delete().eq("gimnasio_id", santeGym.id);
  await db.from("registro_peso").delete().eq("gimnasio_id", santeGym.id);
  await db.from("buzon_comentarios").delete().eq("gimnasio_id", santeGym.id);
  await db.from("push_subscriptions").delete().eq("gimnasio_id", santeGym.id);
  await db.from("mensajes").delete().eq("gimnasio_id", santeGym.id);
  await db.from("pagos").delete().eq("gimnasio_id", santeGym.id);
  await db.from("rutinas").delete().eq("gimnasio_id", santeGym.id);
  await db.from("clientes").delete().eq("gimnasio_id", santeGym.id);
  await db.from("planes").delete().eq("gimnasio_id", santeGym.id);
  // Limpiar perfiles que no sean el superadmin
  await db.from("profiles").delete().eq("gimnasio_id", santeGym.id).neq("id", SUPERADMIN_ID);
  console.log("   ✅ Datos residuales limpiados.");

  // 4. Limpieza de usuarios en Auth.Admin
  console.log("4️⃣ Limpiando usuarios en Supabase Auth...");
  const { data: authUsersData } = await db.auth.admin.listUsers({ perPage: 1000 });
  const authUsers = authUsersData?.users || [];
  console.log(`   Usuarios en Auth: ${authUsers.length}`);

  for (const u of authUsers) {
    if (u.id === SUPERADMIN_ID) {
      console.log(`   🛡️ Conservando Superadmin: ${u.id} (${u.email})`);
    } else {
      console.log(`   🗑️ Eliminando usuario Auth: ${u.id} (${u.email})`);
      await db.auth.admin.deleteUser(u.id);
    }
  }
  console.log("   ✅ Auth limpio (solo superadmin retenido).\n");

  // 5. Configurar Dueño de Prueba (Superadmin existente)
  console.log("5️⃣ Configurando Dueño de prueba (Santiago Dueño)...");
  const duenoDni = "12345678";
  const duenoEmail = `${duenoDni}@sante.gym.local`;
  const duenoClave = "admin123";

  // Actualizar en Auth
  const { error: updAuthErr } = await db.auth.admin.updateUserById(SUPERADMIN_ID, {
    email: duenoEmail,
    password: duenoClave,
    email_confirm: true,
    user_metadata: {
      nombre: "Santiago Dueño",
      rol: "dueno",
    },
  });
  if (updAuthErr) throw updAuthErr;

  // Actualizar profile en DB
  const { error: profErr } = await db.from("profiles").upsert({
    id: SUPERADMIN_ID,
    gimnasio_id: santeGym.id,
    rol: "dueno",
    dni: duenoDni,
    nombre: "Santiago Dueño",
    debe_cambiar_clave: false,
    email_recuperacion: "santigutierrezgelos@gmail.com",
  });
  if (profErr) throw profErr;
  console.log(`   ✅ Dueño configurado: DNI ${duenoDni} | Clave ${duenoClave} | Email ${duenoEmail}\n`);

  // 6. Configurar Plan de Gimnasio "Pase Libre"
  console.log("6️⃣ Creando plan de gimnasio 'Pase Libre' ($25.000)...");
  const { data: planPaseLibre, error: planErr } = await db
    .from("planes")
    .insert({
      gimnasio_id: santeGym.id,
      nombre: "Pase Libre",
      precio: 25000,
      duracion_dias: 30,
      activo: true,
      descuentos: [],
    })
    .select()
    .single();
  if (planErr) throw planErr;
  console.log(`   ✅ Plan creado: '${planPaseLibre.nombre}' ($${planPaseLibre.precio}, ${planPaseLibre.duracion_dias} días) [${planPaseLibre.id}]\n`);

  // 7. Configurar Cliente de Prueba (Lucas Socio)
  console.log("7️⃣ Configurando Cliente de prueba (Lucas Socio)...");
  const socioDni = "20000000";
  const socioEmail = `${socioDni}@sante.gym.local`;
  const socioClave = "gym2000";

  const { data: createdSocioAuth, error: socioAuthErr } = await db.auth.admin.createUser({
    email: socioEmail,
    password: socioClave,
    email_confirm: true,
    user_metadata: {
      nombre: "Lucas Socio",
      rol: "cliente",
    },
  });
  if (socioAuthErr) throw socioAuthErr;

  const socioUserId = createdSocioAuth.user.id;

  const { error: socioProfErr } = await db.from("profiles").insert({
    id: socioUserId,
    gimnasio_id: santeGym.id,
    rol: "cliente",
    dni: socioDni,
    nombre: "Lucas Socio",
    debe_cambiar_clave: false,
    telefono: "1123456789",
  });
  if (socioProfErr) throw socioProfErr;

  const hoy = new Date();
  const fechaInicio = hoy.toISOString().split("T")[0];
  const vence = new Date(hoy);
  vence.setDate(vence.getDate() + 30);
  const fechaVencimiento = vence.toISOString().split("T")[0];

  const { data: socioCliente, error: socioCliErr } = await db
    .from("clientes")
    .insert({
      profile_id: socioUserId,
      gimnasio_id: santeGym.id,
      plan_id: planPaseLibre.id,
      estado_cuota: "al_dia",
      fecha_inicio: fechaInicio,
      fecha_vencimiento: fechaVencimiento,
      acceso_habilitado: true,
      sexo: "hombre",
      en_prueba: false,
    })
    .select()
    .single();
  if (socioCliErr) throw socioCliErr;

  // Registrar pago para historial de cuotas
  await db.from("pagos").insert({
    gimnasio_id: santeGym.id,
    cliente_id: socioCliente.id,
    plan_id: planPaseLibre.id,
    monto: 25000,
    fecha_pago: fechaInicio,
    cubre_hasta: fechaVencimiento,
    registrado_por: SUPERADMIN_ID,
    estado: "confirmado",
    proveedor: "manual",
  });

  // Registros de entrada para que el carnet y la racha de constancia se vean activos
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);
  await db.from("registros_entrada").insert([
    { gimnasio_id: santeGym.id, cliente_id: socioCliente.id, creado_en: ayer.toISOString() },
    { gimnasio_id: santeGym.id, cliente_id: socioCliente.id, creado_en: hoy.toISOString() },
  ]);

  console.log(`   ✅ Cliente creado: DNI ${socioDni} | Clave ${socioClave} | Cuota al día hasta ${fechaVencimiento}\n`);

  // 8. Crear Rutina de Prueba asignada a Lucas Socio (3-4 ejercicios)
  console.log("8️⃣ Creando rutina de prueba para Lucas Socio...");
  const { data: ejerciciosGlobales } = await db
    .from("ejercicios")
    .select("id, nombre, grupo_muscular")
    .limit(10);

  const nombresPreferidos = [
    "Press de banca con barra",
    "Remo con barra",
    "Sentadilla con barra",
    "Press militar con barra",
  ];
  const { data: exPreferidos } = await db
    .from("ejercicios")
    .select("id, nombre")
    .in("nombre", nombresPreferidos);

  let ejerciciosElegidos = exPreferidos || [];
  if (ejerciciosElegidos.length < 4) {
    const faltantes = (ejerciciosGlobales || []).filter(
      (eg) => !ejerciciosElegidos.some((ep) => ep.id === eg.id)
    );
    ejerciciosElegidos = [...ejerciciosElegidos, ...faltantes].slice(0, 4);
  }

  const { data: rutina, error: rutinaErr } = await db
    .from("rutinas")
    .insert({
      gimnasio_id: santeGym.id,
      cliente_id: socioCliente.id,
      objetivo: "hipertrofia",
      nivel: "intermedio",
      dias_por_semana: 3,
      generada_por: "reglas",
      origen: "auto",
      dias_titulos: [
        "Día 1 · Tren Superior (Fuerza)",
        "Día 2 · Piernas & Core",
        "Día 3 · Full Body",
      ],
      preferencias: {
        equipo: "gimnasio",
        sexo: "hombre",
        enfasis: ["pecho", "espalda", "piernas"],
        explicacionGeneral:
          "Plan semanal enfocado en hipertrofia y progresión de cargas con ejercicios fundamentales.",
      },
    })
    .select()
    .single();
  if (rutinaErr) throw rutinaErr;

  const itemsParaInsertar = [
    {
      rutina_id: rutina.id,
      ejercicio_id: ejerciciosElegidos[0]?.id,
      dia: 1,
      orden: 0,
      series: 4,
      repeticiones: "8–10",
      nota: "Descanso 90s entre series. Cuidar la técnica.",
      tecnica: null,
    },
    {
      rutina_id: rutina.id,
      ejercicio_id: ejerciciosElegidos[1]?.id,
      dia: 1,
      orden: 1,
      series: 4,
      repeticiones: "10–12",
      nota: "Descanso 90s. Tirar hacia la cadera.",
      tecnica: null,
    },
    {
      rutina_id: rutina.id,
      ejercicio_id: ejerciciosElegidos[2]?.id,
      dia: 2,
      orden: 0,
      series: 4,
      repeticiones: "8–10",
      nota: "Descanso 2 min. Sentadilla profunda controlada.",
      tecnica: null,
    },
    {
      rutina_id: rutina.id,
      ejercicio_id: ejerciciosElegidos[3]?.id,
      dia: 3,
      orden: 0,
      series: 3,
      repeticiones: "10–12",
      nota: "Descanso 60-90s. Buena extensión superior.",
      tecnica: null,
    },
  ];

  const { error: itemsErr } = await db.from("rutina_items").insert(itemsParaInsertar);
  if (itemsErr) throw itemsErr;
  console.log(`   ✅ Rutina creada con ${itemsParaInsertar.length} ejercicios asignados.\n`);

  console.log("══════════════════════════════════════════════════════════════");
  console.log("🎉 RESET COMPLETADO CON ÉXITO");
  console.log("══════════════════════════════════════════════════════════════\n");
  console.log("RESUMEN DE CREDENCIALES DEL ENTORNO DE DESARROLLO:");
  console.log("──────────────────────────────────────────────────────────────");
  console.log(`Gimnasio:       ${santeGym.nombre}`);
  console.log(`Slug Gimnasio:  ${santeGym.slug}`);
  console.log(`Plan Plataf.:   Elite (vence: ${vencePlanStr})`);
  console.log(`Estado Gym:     ${santeGym.estado}`);
  console.log("──────────────────────────────────────────────────────────────");
  console.log("👔 DUEÑO DE PRUEBA (Panel de Control /panel):");
  console.log(`  Gimnasio:  sante`);
  console.log(`  Usuario:   ${duenoDni}`);
  console.log(`  Clave:     ${duenoClave}`);
  console.log(`  Email:     ${duenoEmail}`);
  console.log(`  ID:        ${SUPERADMIN_ID}`);
  console.log("──────────────────────────────────────────────────────────────");
  console.log("🏋️ CLIENTE DE PRUEBA (Portal del Socio /mi):");
  console.log(`  Gimnasio:  sante`);
  console.log(`  Usuario:   ${socioDni}`);
  console.log(`  Clave:     ${socioClave}`);
  console.log(`  Email:     ${socioEmail}`);
  console.log(`  Plan:      Pase Libre ($25.000)`);
  console.log(`  Cuota:     Al día (vence: ${fechaVencimiento})`);
  console.log(`  Rutina:    3 días con 4 ejercicios`);
  console.log("══════════════════════════════════════════════════════════════\n");
}

main().catch((err) => {
  console.error("❌ ERROR durante el reset:", err);
  process.exit(1);
});
