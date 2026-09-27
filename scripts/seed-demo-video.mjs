// Puebla el gimnasio demo "Volt Gym" (slug voltgym) para grabar el video promo.
// Idempotente: se puede correr las veces que haga falta (resetea pagos,
// entradas, mensajes y el estado de cuota del socio demo).
//
// Uso: node scripts/seed-demo-video.mjs
// Requiere en .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//   VIDEO_DUENO_DNI, VIDEO_DUENO_CLAVE, VIDEO_SOCIO_DNI, VIDEO_SOCIO_CLAVE
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim();
}

const SLUG = "voltgym";
const NOMBRE_GYM = "Volt Gym";
const { VIDEO_DUENO_DNI, VIDEO_DUENO_CLAVE, VIDEO_SOCIO_DNI, VIDEO_SOCIO_CLAVE } = process.env;
if (!VIDEO_DUENO_DNI || !VIDEO_DUENO_CLAVE || !VIDEO_SOCIO_DNI || !VIDEO_SOCIO_CLAVE) {
  console.error("Faltan VIDEO_DUENO_DNI / VIDEO_DUENO_CLAVE / VIDEO_SOCIO_DNI / VIDEO_SOCIO_CLAVE en .env.local");
  process.exit(1);
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const chk = (res, ctx) => {
  if (res.error) throw new Error(`${ctx}: ${res.error.message}`);
  return res.data;
};

// Random determinístico: mismos datos en cada corrida.
let semilla = 20260924;
const rnd = () => ((semilla = (semilla * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const entre = (a, b) => a + Math.floor(rnd() * (b - a + 1));

const hoy = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const masDias = (n, base = hoy) => {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
};

// ── 1. Gimnasio + dueño (vía scripts/seed.mjs la primera vez) ─────────────
let gym = chk(await db.from("gimnasios").select("id").eq("slug", SLUG).maybeSingle(), "buscar gym");
if (!gym) {
  execFileSync("node", ["scripts/seed.mjs", NOMBRE_GYM, SLUG, VIDEO_DUENO_DNI, "Diego Ferreyra"], {
    stdio: "inherit",
  });
  gym = chk(await db.from("gimnasios").select("id").eq("slug", SLUG).single(), "gym creado");
}
const GYM = gym.id;

// Logo: SVG subido al bucket público "logos".
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3dffc0"/><stop offset="1" stop-color="#0bb37c"/></linearGradient></defs>
<rect width="256" height="256" rx="64" fill="#0b1118"/>
<circle cx="128" cy="128" r="92" fill="none" stroke="url(#g)" stroke-width="10"/>
<path d="M142 44 76 142h46l-12 70 70-102h-48z" fill="url(#g)"/>
</svg>`;
const logoPath = `${SLUG}/logo-volt.svg`;
chk(
  await db.storage.from("logos").upload(logoPath, Buffer.from(logoSvg), {
    contentType: "image/svg+xml",
    upsert: true,
  }),
  "subir logo",
);
const logoUrl = db.storage.from("logos").getPublicUrl(logoPath).data.publicUrl;

const { data: planElite } = await db.from("planes_plataforma").select("id").eq("nombre", "Elite").maybeSingle();
chk(
  await db
    .from("gimnasios")
    .update({
      nombre: NOMBRE_GYM,
      estado: "activo",
      plan_plataforma_id: planElite?.id ?? null,
      plan_plataforma_vence_el: iso(masDias(365)),
      logo_url: logoUrl,
      capacidad_maxima: 60,
      pago_alias: "VOLT.GYM.BB",
      pago_titular: "Volt Gym SRL",
      pin_ingresos_desactivado: true,
      tour_pago_visto: true,
      tema: {
        paper: "#090d14",
        paper2: "#121722",
        ink: "#f8fafc",
        inkSoft: "#94a3b8",
        rule: "#242e42",
        volt: "#10e7a0",
        voltInk: "#042417",
        fuente: "amigable",
        estiloVisual: "futurista",
        escalaFuente: 1,
        radiosBordes: "normal",
        espaciado: "normal",
      },
    })
    .eq("id", GYM),
  "actualizar gym",
);

// Asegura usuario auth + profile con la clave indicada y sin pedir cambio.
async function asegurarUsuario({ dni, nombre, rol, clave }) {
  const email = `${dni}@${SLUG}.gym.local`;
  let prof = chk(
    await db.from("profiles").select("id").eq("gimnasio_id", GYM).eq("dni", dni).maybeSingle(),
    "buscar profile",
  );
  if (!prof) {
    let userId;
    const creado = await db.auth.admin.createUser({ email, password: clave, email_confirm: true });
    if (creado.error) {
      // Quedó un auth.user huérfano de una corrida anterior: lo reutilizamos.
      const lista = chk(await db.auth.admin.listUsers({ perPage: 1000 }), "listar users");
      userId = lista.users.find((u) => u.email === email)?.id;
      if (!userId) throw creado.error;
    } else userId = creado.data.user.id;
    prof = chk(
      await db
        .from("profiles")
        .insert({ id: userId, gimnasio_id: GYM, rol, dni, nombre })
        .select("id")
        .single(),
      "crear profile",
    );
  }
  chk(await db.auth.admin.updateUserById(prof.id, { password: clave }), "setear clave");
  chk(
    await db
      .from("profiles")
      .update({ nombre, debe_cambiar_clave: false, tyc_aceptado_en: new Date().toISOString(), activo: true })
      .eq("id", prof.id),
    "actualizar profile",
  );
  return prof.id;
}

const DUENO = await asegurarUsuario({
  dni: VIDEO_DUENO_DNI,
  nombre: "Diego Ferreyra",
  rol: "dueno",
  clave: VIDEO_DUENO_CLAVE,
});
console.log("✓ Gimnasio y dueño listos");

// ── 2. Planes ─────────────────────────────────────────────────────────────
const planesDef = [
  { nombre: "Pase Libre", precio: 38000, duracion_dias: 30 },
  { nombre: "Musculación 3x semana", precio: 29000, duracion_dias: 30 },
  { nombre: "Funcional + Sala", precio: 34000, duracion_dias: 30 },
];
const planes = [];
for (const p of planesDef) {
  let plan = chk(
    await db.from("planes").select("id, nombre, precio").eq("gimnasio_id", GYM).eq("nombre", p.nombre).maybeSingle(),
    "buscar plan",
  );
  if (!plan)
    plan = chk(
      await db.from("planes").insert({ gimnasio_id: GYM, activo: true, ...p }).select("id, nombre, precio").single(),
      "crear plan",
    );
  planes.push(plan);
}
console.log(`✓ ${planes.length} planes`);

// ── 3. Socios (~40, nombres argentinos) ──────────────────────────────────
const nombres = [
  "Lucía Benítez", "Marta Iglesias", "Tomás Acosta", "Valentina Sosa", "Joaquín Herrera",
  "Camila Ledesma", "Matías Romero", "Florencia Paz", "Nicolás Quiroga", "Agustina Molina",
  "Facundo Giménez", "Julieta Correa", "Bautista Villalba", "Sofía Ramírez", "Lautaro Medina",
  "Milagros Ojeda", "Franco Castillo", "Rocío Aguirre", "Santiago Luna", "Micaela Suárez",
  "Ignacio Peralta", "Carolina Vera", "Gonzalo Figueroa", "Antonella Ríos", "Emiliano Cabrera",
  "Daniela Godoy", "Thiago Ponce", "Belén Arias", "Maximiliano Toledo", "Victoria Rojas",
  "Leandro Farías", "Paula Domínguez", "Ezequiel Núñez", "Brenda Luque", "Hernán Maldonado",
  "Candela Ortiz", "Rodrigo Bustos", "Abril Carrizo", "Cristian Palacios", "Graciela Moreno",
];
const esMujer = (n) => /a$|Belén|Abril|Rocío|Sofía|Lucía|Marta|Candela|Victoria/.test(n.split(" ")[0]);

const socios = [];
for (let i = 0; i < nombres.length; i++) {
  const nombre = nombres[i];
  const dni = i === 0 ? VIDEO_SOCIO_DNI : String(40777001 + i * 37);
  const clave = i === 0 ? VIDEO_SOCIO_CLAVE : `v${randomBytes(6).toString("hex")}`;
  const profileId = await asegurarUsuario({ dni, nombre, rol: "cliente", clave });
  const plan = planes[i % planes.length];

  // Lucía (socia demo) arranca vencida; Marta es la socia mayor; el resto variado.
  const offset = i === 0 ? -3 : i === 1 ? 20 : i % 9 === 0 ? -entre(2, 10) : entre(1, 29);
  const fila = {
    gimnasio_id: GYM,
    profile_id: profileId,
    plan_id: plan.id,
    fecha_inicio: iso(masDias(-entre(95, 400))),
    fecha_vencimiento: iso(masDias(offset)),
    estado_cuota: offset < 0 ? "vencido" : offset <= 5 ? "por_vencer" : "al_dia",
    sexo: esMujer(nombre) ? "mujer" : "hombre",
    en_prueba: false,
    acceso_habilitado: true,
    fecha_nacimiento: i === 1 ? "1958-04-17" : iso(new Date(1975 + entre(0, 30), entre(0, 11), entre(1, 28))),
  };
  let cli = chk(await db.from("clientes").select("id").eq("profile_id", profileId).maybeSingle(), "buscar cliente");
  if (cli) chk(await db.from("clientes").update(fila).eq("id", cli.id), "actualizar cliente");
  else cli = chk(await db.from("clientes").insert(fila).select("id").single(), "crear cliente");
  socios.push({ id: cli.id, profileId, plan, nombre });
}
console.log(`✓ ${socios.length} socios`);

// ── 4. Pagos: 3 meses anteriores + mes actual (crecimiento visible) ──────
chk(await db.from("pagos").delete().eq("gimnasio_id", GYM), "borrar pagos");
const pagos = [];
const medios = ["efectivo", "transferencia", "transferencia", "mercadopago", "efectivo"];
const cobrosPorMes = [24, 28, 33]; // hace 3, 2 y 1 mes
for (let m = 3; m >= 1; m--) {
  const cant = cobrosPorMes[3 - m];
  for (let k = 0; k < cant; k++) {
    const s = socios[(k + m * 5) % socios.length];
    const f = new Date(hoy.getFullYear(), hoy.getMonth() - m, entre(1, 27));
    pagos.push({ s, f });
  }
}
// Mes actual: pagos hasta ayer + 5 cobros hoy.
for (let k = 0; k < 30; k++) {
  const s = socios[(k + 3) % socios.length];
  if (s === socios[0]) continue; // la socia demo está vencida
  const dia = entre(1, Math.max(1, hoy.getDate() - 1));
  pagos.push({ s, f: new Date(hoy.getFullYear(), hoy.getMonth(), dia) });
}
for (let k = 0; k < 5; k++) pagos.push({ s: socios[5 + k * 3], f: new Date(hoy) });

const filasPagos = pagos.map(({ s, f }) => ({
  gimnasio_id: GYM,
  cliente_id: s.id,
  plan_id: s.plan.id,
  monto: s.plan.precio,
  fecha_pago: iso(f),
  cubre_hasta: iso(masDias(30, f)),
  estado: "confirmado",
  proveedor: "manual",
  medio_pago: medios[entre(0, medios.length - 1)],
  registrado_por: DUENO,
  creado_at: new Date(f.getFullYear(), f.getMonth(), f.getDate(), entre(8, 21), entre(0, 59)).toISOString(),
}));
chk(await db.from("pagos").insert(filasPagos), "insertar pagos");
console.log(`✓ ${filasPagos.length} pagos`);

// ── 5. Registros de entrada: 30 días + gente en sala ahora (aforo) ──────
chk(await db.from("registros_entrada").delete().eq("gimnasio_id", GYM), "borrar entradas");
const entradas = [];
for (let d = 30; d >= 1; d--) {
  const dia = masDias(-d);
  if (dia.getDay() === 0) continue; // domingo cerrado
  const cant = entre(18, 32);
  const vinieron = new Set(); // una entrada por socio por día
  for (let k = 0; k < cant; k++) {
    // Sesgo: los primeros socios van más seguido (ranking con diferencias).
    const idx = Math.floor(rnd() ** 1.8 * socios.length);
    if (vinieron.has(idx)) continue;
    vinieron.add(idx);
    const t = new Date(dia);
    t.setHours(entre(7, 21), entre(0, 59), 0, 0);
    entradas.push({ gimnasio_id: GYM, cliente_id: socios[idx].id, creado_en: t.toISOString() });
  }
}
// En sala ahora (últimos 80 min): 34 de 60 → aforo "moderado".
for (let k = 0; k < 34; k++) {
  const t = new Date(Date.now() - entre(3, 80) * 60 * 1000);
  entradas.push({ gimnasio_id: GYM, cliente_id: socios[(k + 2) % socios.length].id, creado_en: t.toISOString() });
}
for (let i = 0; i < entradas.length; i += 500)
  chk(await db.from("registros_entrada").insert(entradas.slice(i, i + 500)), "insertar entradas");
console.log(`✓ ${entradas.length} registros de entrada (34 en sala ahora)`);

// ── 6. Aviso de gym cerrado en la bandeja de mensajes ────────────────────
chk(await db.from("mensajes").delete().eq("gimnasio_id", GYM), "borrar mensajes");
const proximoLunes = masDias(((8 - hoy.getDay()) % 7) || 7);
const fechaCierre = proximoLunes.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
const avisos = [
  {
    cuerpo: "¡Nuevo horario de verano! Desde el 1° abrimos 6:30 a 23 hs. 💪",
    creado_at: masDias(-6).toISOString(),
  },
  {
    cuerpo: `🔒 Aviso: el ${fechaCierre} el gimnasio permanece CERRADO por feriado. Retomamos el martes en el horario habitual. ¡Aprovechen para descansar!`,
    creado_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
  },
];
for (const a of avisos) {
  const msg = chk(
    await db
      .from("mensajes")
      .insert({ gimnasio_id: GYM, remitente_id: DUENO, es_masivo: true, respondible: false, ...a })
      .select("id")
      .single(),
    "crear mensaje",
  );
  chk(
    await db
      .from("mensaje_destinatarios")
      .insert(socios.map((s) => ({ mensaje_id: msg.id, profile_id: s.profileId, leido: false }))),
    "destinatarios",
  );
}
console.log("✓ Mensajes (incluye aviso de gym cerrado)");

// ── 7. Socia demo sin rutina previa ni pagos → arranca limpia ────────────
chk(await db.from("rutinas").delete().eq("cliente_id", socios[0].id), "borrar rutina socia demo");
chk(await db.from("rutinas").delete().eq("cliente_id", socios[1].id), "borrar rutina socia mayor");

console.log("\nListo. Login en /login?g=voltgym con VIDEO_DUENO_* / VIDEO_SOCIO_* de .env.local");
