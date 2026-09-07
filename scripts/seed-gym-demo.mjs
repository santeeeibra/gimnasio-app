import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim();
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Faltan variables en .env.local");
  process.exit(1);
}

const db = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

async function main() {
  console.log("Creando o actualizando gimnasio demo: 'Iron Pulse Fitness' (slug: ironpulse)...");

  // 1. Plan de plataforma
  const { data: planPlat } = await db
    .from("planes_plataforma")
    .select("id")
    .eq("nombre", "Pro")
    .maybeSingle();

  // 2. Gimnasio
  let { data: gym } = await db
    .from("gimnasios")
    .select("id, slug")
    .eq("slug", "ironpulse")
    .maybeSingle();

  if (!gym) {
    const { data: nuevoGym, error: errGym } = await db
      .from("gimnasios")
      .insert({
        nombre: "Iron Pulse Fitness",
        slug: "ironpulse",
        estado: "activo",
        plan_plataforma_id: planPlat?.id ?? null,
      })
      .select()
      .single();
    if (errGym) throw errGym;
    gym = nuevoGym;
    console.log("✓ Gimnasio creado:", gym.id);
  } else {
    console.log("✓ Gimnasio existente encontrado:", gym.id);
  }

  // 3. Dueño
  const dniDueno = "35999888";
  const emailDueno = `${dniDueno}@ironpulse.gym.local`;
  const passDueno = "gym9888";

  let { data: duenoProfile } = await db
    .from("profiles")
    .select("id")
    .eq("gimnasio_id", gym.id)
    .eq("rol", "dueno")
    .maybeSingle();

  if (!duenoProfile) {
    const { data: createdAuth, error: authErr } = await db.auth.admin.createUser({
      email: emailDueno,
      password: passDueno,
      email_confirm: true,
    });
    if (authErr && !authErr.message.includes("already registered")) {
      throw authErr;
    }

    const userId = createdAuth?.user?.id;
    if (userId) {
      await db.from("profiles").upsert({
        id: userId,
        gimnasio_id: gym.id,
        rol: "dueno",
        dni: dniDueno,
        nombre: "Martín Fierro (Dueño)",
        debe_cambiar_clave: false,
      });
      console.log("✓ Dueño creado:", emailDueno);
    }
  }

  // 4. Planes del gimnasio
  const planesData = [
    { nombre: "Pase Libre Total", precio: 32000, duracion_dias: 30, activo: true },
    { nombre: "Musculación 3 Días", precio: 24000, duracion_dias: 30, activo: true },
    { nombre: "Cross & Funcional", precio: 28000, duracion_dias: 30, activo: true },
  ];

  const planesCreados = [];
  for (const p of planesData) {
    let { data: planExistente } = await db
      .from("planes")
      .select("id, nombre, precio")
      .eq("gimnasio_id", gym.id)
      .eq("nombre", p.nombre)
      .maybeSingle();

    if (!planExistente) {
      const { data: planNuevo, error: errPlan } = await db
        .from("planes")
        .insert({
          gimnasio_id: gym.id,
          ...p,
        })
        .select()
        .single();
      if (errPlan) throw errPlan;
      planExistente = planNuevo;
    }
    planesCreados.push(planExistente);
  }
  console.log(`✓ ${planesCreados.length} planes configurados.`);

  // 5. Socios simulados
  const hoy = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const addDays = (d, n) => {
    const res = new Date(d);
    res.setDate(res.getDate() + n);
    return res;
  };

  const sociosMock = [
    // Vencen esta semana:
    { nombre: "Santiago Martínez", dni: "41001001", offsetVenc: 0, enPrueba: false }, // Vence HOY
    { nombre: "Lucía Fernández", dni: "41001002", offsetVenc: 1, enPrueba: false },   // Vence MAÑANA (1 día)
    { nombre: "Agustín Benítez", dni: "41001003", offsetVenc: 3, enPrueba: false },   // Vence en 3 días
    { nombre: "Camila Rossi", dni: "41001004", offsetVenc: 5, enPrueba: false },      // Vence en 5 días

    // Al día (vencen en 14 a 30 días):
    { nombre: "Nicolás Gómez", dni: "41001005", offsetVenc: 14, enPrueba: false },
    { nombre: "Valentina Díaz", dni: "41001006", offsetVenc: 18, enPrueba: false },
    { nombre: "Mateo Álvarez", dni: "41001007", offsetVenc: 22, enPrueba: false },
    { nombre: "Sofía Romero", dni: "41001008", offsetVenc: 25, enPrueba: false },
    { nombre: "Tomás Herrera", dni: "41001009", offsetVenc: 27, enPrueba: false },
    { nombre: "Julieta Castro", dni: "41001010", offsetVenc: 28, enPrueba: false },
    { nombre: "Facundo Morales", dni: "41001011", offsetVenc: 29, enPrueba: false },
    { nombre: "Paula Navarro", dni: "41001012", offsetVenc: 30, enPrueba: false },

    // Vencidos:
    { nombre: "Franco Domínguez", dni: "41001013", offsetVenc: -3, enPrueba: false },
    { nombre: "Micaela Torres", dni: "41001014", offsetVenc: -8, enPrueba: false },

    // En prueba sin convertir (3 socios):
    { nombre: "Gonzalo Ruiz", dni: "41001015", offsetVenc: 0, enPrueba: true },
    { nombre: "Florencia Medina", dni: "41001016", offsetVenc: 0, enPrueba: true },
    { nombre: "Enzo Cabrera", dni: "41001017", offsetVenc: 0, enPrueba: true },
  ];

  const clientesIds = [];
  for (let i = 0; i < sociosMock.length; i++) {
    const s = sociosMock[i];
    const plan = planesCreados[i % planesCreados.length];
    const fechaVenc = iso(addDays(hoy, s.offsetVenc));

    // Profile
    let { data: prof } = await db
      .from("profiles")
      .select("id")
      .eq("dni", s.dni)
      .maybeSingle();

    if (!prof) {
      const email = `${s.dni}@ironpulse.gym.local`;
      const pass = `socio${s.dni.slice(-4)}`;
      const { data: authSocio } = await db.auth.admin.createUser({
        email,
        password: pass,
        email_confirm: true,
      });
      const userId = authSocio?.user?.id;
      if (userId) {
        const { data: pNuevo } = await db
          .from("profiles")
          .insert({
            id: userId,
            gimnasio_id: gym.id,
            rol: "cliente",
            dni: s.dni,
            nombre: s.nombre,
            debe_cambiar_clave: false,
          })
          .select()
          .single();
        prof = pNuevo;
      }
    }

    if (!prof) continue;

    // Cliente
    let { data: cli } = await db
      .from("clientes")
      .select("id")
      .eq("profile_id", prof.id)
      .maybeSingle();

    const estadoCuota = s.offsetVenc < 0 ? "vencido" : s.offsetVenc <= 6 ? "por_vencer" : "al_dia";

    if (!cli) {
      const { data: nuevoCli, error: errCli } = await db
        .from("clientes")
        .insert({
          gimnasio_id: gym.id,
          profile_id: prof.id,
          plan_id: plan.id,
          estado_cuota: estadoCuota,
          fecha_vencimiento: fechaVenc,
          en_prueba: s.enPrueba,
          prueba_iniciada_en: s.enPrueba ? iso(hoy) : null,
          acceso_habilitado: true,
        })
        .select()
        .single();
      if (errCli) throw errCli;
      cli = nuevoCli;
    } else {
      await db
        .from("clientes")
        .update({
          plan_id: plan.id,
          estado_cuota: estadoCuota,
          fecha_vencimiento: fechaVenc,
          en_prueba: s.enPrueba,
          prueba_iniciada_en: s.enPrueba ? iso(hoy) : null,
        })
        .eq("id", cli.id);
    }
    clientesIds.push({ id: cli.id, plan, nombre: s.nombre, offset: s.offsetVenc, enPrueba: s.enPrueba });
  }

  console.log(`✓ ${clientesIds.length} socios simulados insertados/actualizados.`);

  // 6. Pagos mes anterior y mes actual
  console.log("Insertando cobros mes anterior y mes actual...");
  await db.from("pagos").delete().eq("gimnasio_id", gym.id);

  const anio = hoy.getFullYear();
  const mes = hoy.getMonth(); // 0-indexed

  // Pagos mes anterior (10 pagos de ~$30.000 = ~$300.000)
  const mesAnt = mes === 0 ? 11 : mes - 1;
  const anioAnt = mes === 0 ? anio - 1 : anio;
  const pad2 = (n) => String(n).padStart(2, "0");

  for (let i = 0; i < 10; i++) {
    const cli = clientesIds[i % clientesIds.length];
    const diaPago = Math.min(25, 2 + i * 2);
    const fechaPago = `${anioAnt}-${pad2(mesAnt + 1)}-${pad2(diaPago)}`;
    const fechaCubre = `${anio}-${pad2(mes + 1)}-${pad2(diaPago)}`;

    await db.from("pagos").insert({
      gimnasio_id: gym.id,
      cliente_id: cli.id,
      plan_id: cli.plan.id,
      monto: cli.plan.precio,
      fecha_pago: fechaPago,
      cubre_hasta: fechaCubre,
      estado: "confirmado",
      proveedor: "manual",
    });
  }

  // Pagos mes actual (14 pagos = ~$420.000 -> variación positiva)
  for (let i = 0; i < 13; i++) {
    const cli = clientesIds[i % clientesIds.length];
    const diaPago = Math.min(hoy.getDate(), 1 + (i % 5));
    const fechaPago = `${anio}-${pad2(mes + 1)}-${pad2(diaPago)}`;
    const fechaCubre = `${anio}-${pad2(mes + 2 > 12 ? 1 : mes + 2)}-${pad2(diaPago)}`;

    await db.from("pagos").insert({
      gimnasio_id: gym.id,
      cliente_id: cli.id,
      plan_id: cli.plan.id,
      monto: cli.plan.precio,
      fecha_pago: fechaPago,
      cubre_hasta: fechaCubre,
      estado: "confirmado",
      proveedor: "manual",
    });
  }
  console.log("✓ Pagos de mes anterior y actual generados.");

  // 7. Check-ins de hoy (registros_entrada)
  console.log("Insertando asistencias del día de hoy...");
  await db.from("registros_entrada").delete().eq("gimnasio_id", gym.id);

  for (let i = 0; i < 8; i++) {
    const cli = clientesIds[i];
    const hora = new Date(hoy);
    hora.setHours(8 + i, 15, 0, 0);

    await db.from("registros_entrada").insert({
      gimnasio_id: gym.id,
      cliente_id: cli.id,
      creado_en: hora.toISOString(),
    });
  }
  console.log("✓ 8 asistencias de hoy registradas.");

  console.log("\n=======================================================");
  console.log("🎉 DATOS DE PRUEBA COMPLETOS!");
  console.log("Gimnasio: Iron Pulse Fitness");
  console.log("Slug: ironpulse");
  console.log("Login dueño:");
  console.log(`  - Gimnasio: ironpulse`);
  console.log(`  - DNI: ${dniDueno}`);
  console.log(`  - Clave: ${passDueno}`);
  console.log("=======================================================\n");
}

main().catch(console.error);
