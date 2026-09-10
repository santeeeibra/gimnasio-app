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

const SLUG = "genesisgym";
const NOMBRE_GYM = "Genesis Gym";

const hoy = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};
const pad2 = (n) => String(n).padStart(2, "0");

async function main() {
  console.log(`Creando o actualizando gimnasio demo: '${NOMBRE_GYM}' (slug: ${SLUG})...`);

  // 1. Plan de plataforma (Elite, para que se vea el gym con todos los features)
  const { data: planPlat } = await db
    .from("planes_plataforma")
    .select("id")
    .eq("nombre", "Elite")
    .maybeSingle();

  // 2. Gimnasio
  let { data: gym } = await db
    .from("gimnasios")
    .select("id, slug")
    .eq("slug", SLUG)
    .maybeSingle();

  if (!gym) {
    const { data: nuevoGym, error: errGym } = await db
      .from("gimnasios")
      .insert({
        nombre: NOMBRE_GYM,
        slug: SLUG,
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
  const dniDueno = "38222444";
  const emailDueno = `${dniDueno}@${SLUG}.gym.local`;
  const passDueno = "gym2444";
  const nombreDueno = "Ricardo Sosa (Dueño)";

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
    if (authErr && !authErr.message.includes("already registered")) throw authErr;

    const userId = createdAuth?.user?.id;
    if (userId) {
      await db.from("profiles").upsert({
        id: userId,
        gimnasio_id: gym.id,
        rol: "dueno",
        dni: dniDueno,
        nombre: nombreDueno,
        telefono: "291-4550012",
        debe_cambiar_clave: false,
      });
      duenoProfile = { id: userId };
      console.log("✓ Dueño creado:", emailDueno);
    }
  } else {
    console.log("✓ Dueño ya existía.");
  }

  // 4. Planes del gimnasio
  const planesData = [
    { nombre: "Pase Libre Full", precio: 35000, duracion_dias: 30, activo: true },
    { nombre: "Musculación 3 Días", precio: 26000, duracion_dias: 30, activo: true },
    { nombre: "Funcional + Cardio", precio: 30000, duracion_dias: 30, activo: true },
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
        .insert({ gimnasio_id: gym.id, ...p })
        .select()
        .single();
      if (errPlan) throw errPlan;
      planExistente = planNuevo;
    }
    planesCreados.push(planExistente);
  }
  console.log(`✓ ${planesCreados.length} planes configurados.`);

  // 5. Socios simulados (nombres, DNI, sexo, estado de cuota variado)
  const sociosMock = [
    // Vencen esta semana:
    { nombre: "Bruno Acosta", dni: "42210001", sexo: "hombre", offsetVenc: 0, enPrueba: false },
    { nombre: "Milagros Ibáñez", dni: "42210002", sexo: "mujer", offsetVenc: 1, enPrueba: false },
    { nombre: "Ezequiel Suárez", dni: "42210003", sexo: "hombre", offsetVenc: 3, enPrueba: false },
    { nombre: "Abril Contreras", dni: "42210004", sexo: "mujer", offsetVenc: 5, enPrueba: false },

    // Al día:
    { nombre: "Ignacio Paz", dni: "42210005", sexo: "hombre", offsetVenc: 12, enPrueba: false },
    { nombre: "Delfina Ríos", dni: "42210006", sexo: "mujer", offsetVenc: 15, enPrueba: false },
    { nombre: "Máximo Correa", dni: "42210007", sexo: "hombre", offsetVenc: 19, enPrueba: false },
    { nombre: "Catalina Molina", dni: "42210008", sexo: "mujer", offsetVenc: 21, enPrueba: false },
    { nombre: "Joaquín Leiva", dni: "42210009", sexo: "hombre", offsetVenc: 24, enPrueba: false },
    { nombre: "Renata Ojeda", dni: "42210010", sexo: "mujer", offsetVenc: 26, enPrueba: false },
    { nombre: "Bautista Farías", dni: "42210011", sexo: "hombre", offsetVenc: 28, enPrueba: false },
    { nombre: "Martina Quiroga", dni: "42210012", sexo: "mujer", offsetVenc: 30, enPrueba: false },

    // Vencidos:
    { nombre: "Rodrigo Villalba", dni: "42210013", sexo: "hombre", offsetVenc: -2, enPrueba: false },
    { nombre: "Ludmila Pereyra", dni: "42210014", sexo: "mujer", offsetVenc: -9, enPrueba: false },

    // En prueba sin convertir:
    { nombre: "Thiago Espínola", dni: "42210015", sexo: "hombre", offsetVenc: 0, enPrueba: true },
    { nombre: "Emilia Zárate", dni: "42210016", sexo: "mujer", offsetVenc: 0, enPrueba: true },
  ];

  const clientesInfo = [];
  for (let i = 0; i < sociosMock.length; i++) {
    const s = sociosMock[i];
    const plan = planesCreados[i % planesCreados.length];
    const fechaVenc = iso(addDays(hoy, s.offsetVenc));

    let { data: prof } = await db.from("profiles").select("id").eq("dni", s.dni).maybeSingle();

    if (!prof) {
      const email = `${s.dni}@${SLUG}.gym.local`;
      const pass = `socio${s.dni.slice(-4)}`;
      const { data: authSocio, error: authErr } = await db.auth.admin.createUser({
        email,
        password: pass,
        email_confirm: true,
      });
      if (authErr && !authErr.message.includes("already registered")) throw authErr;
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
            telefono: `291-4${s.dni.slice(-6)}`,
            debe_cambiar_clave: false,
          })
          .select()
          .single();
        prof = pNuevo;
      }
    }
    if (!prof) continue;

    let { data: cli } = await db.from("clientes").select("id").eq("profile_id", prof.id).maybeSingle();

    const estadoCuota = s.offsetVenc < 0 ? "vencido" : s.offsetVenc <= 6 ? "por_vencer" : "al_dia";

    if (!cli) {
      const { data: nuevoCli, error: errCli } = await db
        .from("clientes")
        .insert({
          gimnasio_id: gym.id,
          profile_id: prof.id,
          plan_id: plan.id,
          estado_cuota: estadoCuota,
          fecha_inicio: iso(addDays(hoy, -90)),
          fecha_vencimiento: fechaVenc,
          sexo: s.sexo,
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
          sexo: s.sexo,
          en_prueba: s.enPrueba,
          prueba_iniciada_en: s.enPrueba ? iso(hoy) : null,
        })
        .eq("id", cli.id);
    }
    clientesInfo.push({
      id: cli.id,
      profileId: prof.id,
      plan,
      nombre: s.nombre,
      sexo: s.sexo,
      offset: s.offsetVenc,
      enPrueba: s.enPrueba,
    });
  }
  console.log(`✓ ${clientesInfo.length} socios simulados insertados/actualizados.`);

  const clientesActivos = clientesInfo.filter((c) => !c.enPrueba);

  // 6. Pagos mes anterior y mes actual
  console.log("Insertando cobros mes anterior y mes actual...");
  await db.from("pagos").delete().eq("gimnasio_id", gym.id);

  const anio = hoy.getFullYear();
  const mes = hoy.getMonth();
  const mesAnt = mes === 0 ? 11 : mes - 1;
  const anioAnt = mes === 0 ? anio - 1 : anio;

  for (let i = 0; i < 10; i++) {
    const cli = clientesActivos[i % clientesActivos.length];
    const diaPago = Math.min(25, 2 + i * 2);
    await db.from("pagos").insert({
      gimnasio_id: gym.id,
      cliente_id: cli.id,
      plan_id: cli.plan.id,
      monto: cli.plan.precio,
      fecha_pago: `${anioAnt}-${pad2(mesAnt + 1)}-${pad2(diaPago)}`,
      cubre_hasta: `${anio}-${pad2(mes + 1)}-${pad2(diaPago)}`,
      estado: "confirmado",
      proveedor: "manual",
    });
  }
  for (let i = 0; i < 13; i++) {
    const cli = clientesActivos[i % clientesActivos.length];
    const diaPago = Math.min(hoy.getDate(), 1 + (i % 5));
    await db.from("pagos").insert({
      gimnasio_id: gym.id,
      cliente_id: cli.id,
      plan_id: cli.plan.id,
      monto: cli.plan.precio,
      fecha_pago: `${anio}-${pad2(mes + 1)}-${pad2(diaPago)}`,
      cubre_hasta: `${anio}-${pad2(mes + 2 > 12 ? 1 : mes + 2)}-${pad2(diaPago)}`,
      estado: "confirmado",
      proveedor: "manual",
    });
  }
  console.log("✓ Pagos de mes anterior y actual generados.");

  // 7. Check-ins de hoy
  console.log("Insertando asistencias del día de hoy...");
  await db.from("registros_entrada").delete().eq("gimnasio_id", gym.id);
  for (let i = 0; i < 8 && i < clientesActivos.length; i++) {
    const cli = clientesActivos[i];
    const hora = new Date(hoy);
    hora.setHours(8 + i, 15, 0, 0);
    await db.from("registros_entrada").insert({
      gimnasio_id: gym.id,
      cliente_id: cli.id,
      creado_en: hora.toISOString(),
    });
  }
  console.log("✓ Asistencias de hoy registradas.");

  // 8. Rutinas de ejemplo (usa los ejercicios globales ya sembrados)
  console.log("Generando rutinas de ejemplo...");
  const { data: ejercicios } = await db
    .from("ejercicios")
    .select("id, nombre, grupo_muscular")
    .is("gimnasio_id", null);

  if (!ejercicios || ejercicios.length === 0) {
    console.log("⚠ No hay ejercicios globales sembrados (correr scripts/seed-ejercicios.mjs primero). Salteo rutinas.");
  } else {
    const porGrupo = (grupo) =>
      ejercicios.filter((e) => (e.grupo_muscular || "").toLowerCase().includes(grupo));

    const pecho = porGrupo("pecho");
    const espalda = porGrupo("espalda");
    const piernas = porGrupo("pierna");
    const hombro = porGrupo("hombro");
    const brazo = porGrupo("brazo");
    const abdomen = porGrupo("abdom");
    const gluteo = porGrupo("gluteo").length ? porGrupo("gluteo") : piernas;

    const pick = (lista, n) => lista.slice(0, n).filter(Boolean);

    // Plantillas de rutina de 3 días (push/pull/legs simplificado)
    const plantillaHombre = [
      { titulo: "Empuje (Pecho / Hombro / Tríceps)", ejercicios: [...pick(pecho, 3), ...pick(hombro, 2), ...pick(brazo, 1)] },
      { titulo: "Tracción (Espalda / Bíceps)", ejercicios: [...pick(espalda, 3), ...pick(brazo, 2), ...pick(abdomen, 1)] },
      { titulo: "Piernas", ejercicios: [...pick(piernas, 4), ...pick(abdomen, 1)] },
    ];
    const plantillaMujer = [
      { titulo: "Glúteo / Pierna A", ejercicios: [...pick(gluteo, 3), ...pick(piernas, 2)] },
      { titulo: "Torso (Espalda / Hombro)", ejercicios: [...pick(espalda, 2), ...pick(hombro, 2), ...pick(abdomen, 1)] },
      { titulo: "Glúteo / Pierna B", ejercicios: [...pick(gluteo, 2), ...pick(piernas, 3)] },
    ];

    // Le cargamos rutina a los primeros 10 socios activos (no todos, para
    // que se vea variedad: algunos con rutina, otros sin generar todavía).
    const conRutina = clientesActivos.slice(0, 10);
    for (const cli of conRutina) {
      const plantilla = cli.sexo === "mujer" ? plantillaMujer : plantillaHombre;
      const objetivo = ["hipertrofia", "fuerza", "bajar_grasa", "resistencia"][
        Math.floor(Math.random() * 4)
      ];
      const nivel = ["principiante", "intermedio", "avanzado"][Math.floor(Math.random() * 3)];

      let { data: rutina } = await db
        .from("rutinas")
        .select("id")
        .eq("cliente_id", cli.id)
        .maybeSingle();

      if (!rutina) {
        const { data: nuevaRutina, error: errRut } = await db
          .from("rutinas")
          .insert({
            gimnasio_id: gym.id,
            cliente_id: cli.id,
            objetivo,
            dias_por_semana: plantilla.length,
            nivel,
            generada_por: "reglas",
            origen: "auto",
            dias_titulos: plantilla.map((d) => d.titulo),
            preferencias: { sexo: cli.sexo, enfasis: cli.sexo === "mujer" ? ["gluteos"] : [] },
          })
          .select()
          .single();
        if (errRut) throw errRut;
        rutina = nuevaRutina;
      } else {
        await db.from("rutina_items").delete().eq("rutina_id", rutina.id);
        await db
          .from("rutinas")
          .update({
            objetivo,
            dias_por_semana: plantilla.length,
            nivel,
            dias_titulos: plantilla.map((d) => d.titulo),
          })
          .eq("id", rutina.id);
      }

      const items = [];
      plantilla.forEach((dia, diaIdx) => {
        dia.ejercicios.forEach((ej, orden) => {
          if (!ej) return;
          const esCompuesto = orden < 2;
          items.push({
            rutina_id: rutina.id,
            ejercicio_id: ej.id,
            dia: diaIdx + 1,
            orden,
            series: esCompuesto ? 4 : 3,
            repeticiones: esCompuesto ? "6-8" : "10-12",
            nota: null,
          });
        });
      });
      if (items.length > 0) {
        await db.from("rutina_items").insert(items);
      }
    }
    console.log(`✓ ${conRutina.length} rutinas generadas (de ${ejercicios.length} ejercicios disponibles).`);
  }

  // 9. Registro de peso (progreso) de los últimos ~5 controles para 5 socios
  console.log("Insertando historial de peso corporal...");
  const conProgreso = clientesActivos.slice(0, 5);
  for (const cli of conProgreso) {
    const pesoBase = 60 + Math.random() * 35;
    for (let semana = 4; semana >= 0; semana--) {
      const fecha = iso(addDays(hoy, -semana * 7));
      const variacion = (Math.random() - 0.6) * 1.2; // leve tendencia a bajar
      await db.from("registro_peso").upsert(
        {
          gimnasio_id: gym.id,
          cliente_id: cli.id,
          fecha,
          peso: Math.round((pesoBase - semana * 0.3 + variacion) * 10) / 10,
          creado_por: "cliente",
        },
        { onConflict: "cliente_id,fecha" }
      );
    }
  }
  console.log(`✓ Historial de peso cargado para ${conProgreso.length} socios.`);

  // 10. Mensajería: un aviso masivo + un intercambio individual
  console.log("Insertando mensajes de ejemplo...");
  if (duenoProfile) {
    const { data: masivo } = await db
      .from("mensajes")
      .insert({
        gimnasio_id: gym.id,
        remitente_id: duenoProfile.id,
        cuerpo: "¡Bienvenidos a Genesis Gym! Este sábado abrimos a partir de las 8hs por el feriado. Cualquier consulta, escribinos por acá.",
        es_masivo: true,
        respondible: false,
      })
      .select()
      .single();

    if (masivo) {
      const destinatarios = clientesInfo.map((c) => ({
        mensaje_id: masivo.id,
        profile_id: c.profileId,
        leido: Math.random() > 0.4,
      }));
      await db.from("mensaje_destinatarios").insert(destinatarios);
    }

    const clienteChat = clientesActivos[0];
    if (clienteChat) {
      const { data: individual } = await db
        .from("mensajes")
        .insert({
          gimnasio_id: gym.id,
          remitente_id: duenoProfile.id,
          cuerpo: `Hola ${clienteChat.nombre.split(" ")[0]}, vi que te vence la cuota pronto. ¿Te sirve pasar a pagarla esta semana?`,
          es_masivo: false,
          respondible: true,
        })
        .select()
        .single();

      if (individual) {
        await db.from("mensaje_destinatarios").insert({
          mensaje_id: individual.id,
          profile_id: clienteChat.profileId,
          leido: true,
        });
        await db.from("mensaje_respuestas").insert({
          mensaje_id: individual.id,
          autor_id: clienteChat.profileId,
          cuerpo: "Dale, paso el viernes sin falta. Gracias por avisarme!",
        });
      }
    }
  }
  console.log("✓ Mensajes de ejemplo cargados.");

  console.log("\n=======================================================");
  console.log("🎉 GENESIS GYM — DATOS DE PRUEBA COMPLETOS!");
  console.log(`Gimnasio: ${NOMBRE_GYM}  |  Slug: ${SLUG}`);
  console.log("Login dueño:");
  console.log(`  - Gimnasio: ${SLUG}`);
  console.log(`  - DNI: ${dniDueno}`);
  console.log(`  - Clave: ${passDueno}`);
  console.log("Login de un socio de ejemplo (Bruno Acosta, cuota vence hoy):");
  console.log(`  - Gimnasio: ${SLUG}`);
  console.log(`  - DNI: 42210001`);
  console.log(`  - Clave: socio0001`);
  console.log("=======================================================\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
