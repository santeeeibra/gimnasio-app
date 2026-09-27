// Graba clips de pantalla reales de SysGym (gimnasio demo "Volt Gym") para el
// video promocional. Screencast por CDP (JPEG q100, DPR 3) → MP4 H.264 30 fps.
//
// Previo:
//   node scripts/seed-demo-video.mjs        (lo corre este script salvo --sin-seed)
//   npm run build && npx next start -p 3100
// Uso:
//   node scripts/grabar-pantallas.mjs [--sin-seed] [--base http://localhost:3100] [clip ...]
//   ej: node scripts/grabar-pantallas.mjs --sin-seed 03 07
//
// Credenciales en .env.local: VIDEO_DUENO_DNI/CLAVE, VIDEO_SOCIO_DNI/CLAVE.
// Salida: videos/pantallas/NN-nombre.mp4
import { chromium } from "playwright";
import { readFileSync, readdirSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, basename } from "node:path";
import { tmpdir } from "node:os";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim();
}

const args = process.argv.slice(2);
const SIN_SEED = args.includes("--sin-seed");
const iBase = args.indexOf("--base");
const BASE = iBase >= 0 ? args[iBase + 1] : "http://localhost:3100";
const SOLO = args.filter((a, i) => /^\d\d$/.test(a) && args[i - 1] !== "--base");

const SLUG = "voltgym";
const OUT_DIR = "videos/pantallas";
const FPS = 30;
const MOVIL = { width: 390, height: 844 };
const DPR = 3;

// ffmpeg con libx264: FFMPEG_PATH, el del PATH, o el build "full" de winget.
function buscarFfmpeg() {
  const winget = join(process.env.LOCALAPPDATA ?? "", "Microsoft", "WinGet", "Packages");
  const candidatos = [process.env.FFMPEG_PATH, "ffmpeg"];
  try {
    for (const d of readdirSync(winget).filter((x) => /FFmpeg/i.test(x)))
      for (const b of readdirSync(join(winget, d))) candidatos.push(join(winget, d, b, "bin", "ffmpeg.exe"));
  } catch {}
  for (const c of candidatos.filter(Boolean)) {
    try {
      if (execFileSync(c, ["-hide_banner", "-encoders"], { encoding: "utf8" }).includes("libx264")) return c;
    } catch {}
  }
  console.error("No encontré un ffmpeg con libx264 (definí FFMPEG_PATH en .env.local).");
  process.exit(1);
}
const FFMPEG = buscarFfmpeg();

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const CRED = {
  dueno: { dni: process.env.VIDEO_DUENO_DNI, clave: process.env.VIDEO_DUENO_CLAVE },
  socio: { dni: process.env.VIDEO_SOCIO_DNI, clave: process.env.VIDEO_SOCIO_CLAVE },
};
if (!CRED.dueno.dni || !CRED.dueno.clave || !CRED.socio.dni || !CRED.socio.clave) {
  console.error("Faltan VIDEO_DUENO_* / VIDEO_SOCIO_* en .env.local");
  process.exit(1);
}

// ── Estado de datos (service role) ────────────────────────────────────────
const iso = (d) => d.toISOString().slice(0, 10);
const masDias = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};
const { data: GYM } = await db.from("gimnasios").select("id").eq("slug", SLUG).maybeSingle();
async function clientePorDni(dni) {
  const { data: prof } = await db.from("profiles").select("id").eq("gimnasio_id", GYM.id).eq("dni", dni).single();
  const { data: cli } = await db.from("clientes").select("id, plan_id, plan:planes(precio)").eq("profile_id", prof.id).single();
  return { ...cli, profileId: prof.id };
}
async function socioVencido() {
  const c = await clientePorDni(CRED.socio.dni);
  await db.from("pagos").delete().eq("cliente_id", c.id);
  await db
    .from("clientes")
    .update({ fecha_vencimiento: iso(masDias(-3)), estado_cuota: "vencido" })
    .eq("id", c.id);
}
async function socioPaga({ conPago = true } = {}) {
  const c = await clientePorDni(CRED.socio.dni);
  if (conPago) await db.from("pagos").insert({
    gimnasio_id: GYM.id,
    cliente_id: c.id,
    plan_id: c.plan_id,
    monto: c.plan?.precio ?? 38000,
    fecha_pago: iso(new Date()),
    cubre_hasta: iso(masDias(30)),
    estado: "confirmado",
    proveedor: "manual",
    medio_pago: "transferencia",
  });
  await db
    .from("clientes")
    .update({ fecha_vencimiento: iso(masDias(30)), estado_cuota: "al_dia" })
    .eq("id", c.id);
}
async function sinRutina(dni) {
  const c = await clientePorDni(dni);
  await db.from("rutinas").delete().eq("cliente_id", c.id);
}
async function mensajesNoLeidos() {
  const c = await clientePorDni(CRED.socio.dni);
  await db.from("mensaje_destinatarios").update({ leido: false, leido_at: null }).eq("profile_id", c.profileId);
}
async function temaOriginal() {
  const { data } = await db.from("gimnasios").select("tema").eq("id", GYM.id).single();
  await db
    .from("gimnasios")
    .update({
      tema: {
        ...data.tema,
        paper: "#090d14", paper2: "#121722", ink: "#f8fafc", inkSoft: "#94a3b8", rule: "#242e42",
        volt: "#10e7a0", voltInk: "#042417", fuente: "amigable", estiloVisual: "futurista",
        escalaFuente: 1, radiosBordes: "normal", espaciado: "normal",
      },
    })
    .eq("id", GYM.id);
}

// ── Navegador ─────────────────────────────────────────────────────────────
const INIT = () => {
  try {
    for (const k of ["tutorial_dueno_visto", "tutorial_cliente_visto", "sysgym:splash:v3"]) localStorage.setItem(k, "1");
    localStorage.setItem("onboarding_dueno_oculto", "true");
    localStorage.removeItem("aviso_transferencia_enviado_en");
  } catch {}
  const css = `
    *::-webkit-scrollbar{display:none!important}
    html,body{scrollbar-width:none!important}
    [aria-label="Modo Demo"],[aria-label^="Ocultar controles"],[aria-label^="Mostrar controles"],
    nextjs-portal{display:none!important}
    .toque-video{position:fixed;z-index:2147483647;pointer-events:none;width:46px;height:46px;margin:-23px 0 0 -23px;
      border-radius:50%;background:rgba(255,255,255,.38);border:2px solid rgba(255,255,255,.75);
      box-shadow:0 0 0 1px rgba(0,0,0,.18),0 2px 10px rgba(0,0,0,.25);
      animation:toque-video .55s cubic-bezier(.2,.8,.2,1) forwards}
    @keyframes toque-video{0%{transform:scale(.55);opacity:0}25%{transform:scale(1);opacity:1}100%{transform:scale(1.25);opacity:0}}`;
  const montar = () => {
    if (document.getElementById("estilo-video")) return;
    const s = document.createElement("style");
    s.id = "estilo-video";
    s.textContent = css;
    document.head.appendChild(s);
  };
  document.addEventListener("DOMContentLoaded", montar);
  if (document.head) montar();
  addEventListener(
    "pointerdown",
    (e) => {
      const d = document.createElement("div");
      d.className = "toque-video";
      d.style.left = e.clientX + "px";
      d.style.top = e.clientY + "px";
      document.documentElement.appendChild(d);
      setTimeout(() => d.remove(), 700);
    },
    true,
  );
};

const browser = await chromium.launch();
const estados = {};
async function contexto(rol, viewport = MOVIL) {
  const movil = viewport === MOVIL;
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: movil ? DPR : 1,
    isMobile: movil,
    hasTouch: movil,
    acceptDownloads: true,
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
    colorScheme: "dark",
    storageState: estados[rol],
  });
  await ctx.addInitScript(INIT);
  if (!estados[rol]) {
    const p = await ctx.newPage();
    await p.goto(`${BASE}/login?g=${SLUG}`);
    await p.fill('input[name="dni"]', CRED[rol].dni);
    await p.fill('input[name="clave"]', CRED[rol].clave);
    await p.locator('button[type="submit"]').last().click();
    await p.waitForURL(/\/(mi|panel)(\/|$|\?)/, { timeout: 30000 });
    estados[rol] = await ctx.storageState();
    await p.close();
  }
  return ctx;
}

// ── Helpers de interacción (lentos y claros) ─────────────────────────────
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
async function scrollSuave(page, dy, ms = 1100) {
  await page.evaluate(
    ([dy, ms]) =>
      new Promise((res) => {
        const el = document.scrollingElement;
        const y0 = el.scrollTop;
        const t0 = performance.now();
        const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
        const paso = (t) => {
          const k = Math.min(1, (t - t0) / ms);
          el.scrollTop = y0 + dy * ease(k);
          k < 1 ? requestAnimationFrame(paso) : res();
        };
        requestAnimationFrame(paso);
      }),
    [dy, ms],
  );
  await pausa(250);
}
// Lleva el elemento a la zona cómoda de la pantalla con scroll suave (sirve
// también dentro de modales scrolleables).
async function traerAVista(page, loc, ms = 1000) {
  await loc.waitFor({ state: "visible", timeout: 15000 }).catch((e) => {
    throw new Error(`no aparece ${loc} (${page.url()})`);
  });
  await loc.evaluate(
    (el, ms) =>
      new Promise((res) => {
        // Barras fijas (nav inferior, headers): ya están en pantalla.
        // Si antes aparece un contenedor scrolleable (modal), se scrollea ese.
        for (let a = el.parentElement; a; a = a.parentElement) {
          const cs = getComputedStyle(a);
          if (a.scrollHeight > a.clientHeight + 4 && /(auto|scroll)/.test(cs.overflowY)) break;
          if (cs.position === "fixed") return res();
        }
        let c = el.parentElement;
        while (c && !(c.scrollHeight > c.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(c).overflowY)))
          c = c.parentElement;
        c = c || document.scrollingElement;
        const esDoc = c === document.scrollingElement || c === document.body || c === document.documentElement;
        const r = el.getBoundingClientRect();
        const top = esDoc ? 0 : c.getBoundingClientRect().top;
        const alto = esDoc ? innerHeight : c.clientHeight;
        const dy = r.top - top - alto * 0.4;
        if (r.top > top + 70 && r.bottom < top + alto - 110) return res();
        const y0 = c.scrollTop;
        const t0 = performance.now();
        const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
        const paso = (t) => {
          const k = Math.min(1, (t - t0) / ms);
          c.scrollTop = y0 + dy * ease(k);
          k < 1 ? requestAnimationFrame(paso) : res();
        };
        requestAnimationFrame(paso);
      }),
    ms,
  );
  await pausa(350);
}
async function tocar(page, loc, { despues = 850, sinScroll = false } = {}) {
  if (sinScroll) await loc.waitFor({ state: "visible", timeout: 15000 });
  else await traerAVista(page, loc);
  await pausa(350);
  await loc.tap();
  await pausa(despues);
}
async function escribir(page, loc, texto) {
  await tocar(page, loc, { despues: 400 });
  await page.keyboard.type(texto, { delay: 130 });
  await pausa(900);
}
async function esperarQuieto(page, ms = 1500) {
  await page.waitForLoadState("load");
  await page.evaluate(() => document.fonts?.ready);
  await pausa(ms);
}

// ── Grabación por CDP ─────────────────────────────────────────────────────
async function grabar(page, archivo, accion, { ancho, alto }) {
  const dir = join(tmpdir(), `grabacion-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    const f = join(dir, `f${String(frames.length).padStart(5, "0")}.jpg`);
    writeFileSync(f, Buffer.from(data, "base64"));
    frames.push({ f, ts: metadata.timestamp });
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  const opts = { format: "jpeg", quality: 100, maxWidth: ancho, maxHeight: alto, everyNthFrame: 1 };
  await cdp.send("Page.startScreencast", opts);
  // Las navegaciones completas pueden cortar el screencast: lo re-arrancamos.
  const rearrancar = () => cdp.send("Page.startScreencast", opts).catch(() => {});
  page.on("framenavigated", (fr) => fr === page.mainFrame() && rearrancar());
  await pausa(300);
  const t0 = Date.now() / 1000;
  await pausa(1000); // pantalla quieta al inicio
  await accion();
  await pausa(1100); // pantalla quieta al final
  const t1 = Date.now() / 1000;
  page.removeAllListeners("framenavigated");
  await cdp.send("Page.stopScreencast").catch(() => {});
  await cdp.detach().catch(() => {});

  if (frames.length === 0) throw new Error("screencast sin frames");
  // Timeline de duración real → concat de ffmpeg a FPS constante.
  const utiles = frames.filter((x) => x.ts <= t1);
  const lista = [];
  let previo = utiles.filter((x) => x.ts <= t0).pop() ?? utiles[0];
  let t = t0;
  for (const fr of utiles.filter((x) => x.ts > t0)) {
    lista.push(`file '${basename(previo.f)}'\nduration ${(fr.ts - t).toFixed(4)}`);
    previo = fr;
    t = fr.ts;
  }
  lista.push(`file '${basename(previo.f)}'\nduration ${(t1 - t).toFixed(4)}`);
  lista.push(`file '${basename(previo.f)}'`);
  writeFileSync(join(dir, "lista.txt"), lista.join("\n"));
  execFileSync(FFMPEG, [
    "-loglevel", "error", "-y",
    "-f", "concat", "-safe", "0", "-i", join(dir, "lista.txt"),
    "-vf", `scale=${ancho}:${alto}:flags=lanczos,fps=${FPS},format=yuv420p`,
    "-c:v", "libx264", "-preset", "slow", "-crf", "12", "-profile:v", "high",
    "-movflags", "+faststart", "-t", (t1 - t0).toFixed(3),
    archivo,
  ]);
  rmSync(dir, { recursive: true, force: true });
  return { segundos: +(t1 - t0).toFixed(1), frames: utiles.length };
}

// ── Clips ─────────────────────────────────────────────────────────────────
const ANCHO_MOVIL = MOVIL.width * DPR; // 1170
const ALTO_MOVIL = MOVIL.height * DPR; // 2532

const CLIPS = [
  {
    id: "01",
    archivo: "01-aforo.mp4",
    rol: "socio",
    preparar: () => socioPaga({ conPago: false }),
    inicio: "/mi",
    accion: async (p) => {
      const aforo = p.getByRole("button", { name: /Aforo en vivo/ }).first();
      await traerAVista(p, aforo);
      await pausa(1200);
      await tocar(p, aforo, { despues: 2000 });
    },
    // El medidor cuenta con el cliente del socio y RLS sólo le deja ver sus
    // propias entradas: marca 0% aunque haya gente. Se valida antes de grabar.
    validar: async (p) => {
      const txt = await p.getByRole("button", { name: /Aforo en vivo/ }).first().innerText();
      if (/\b0%/.test(txt)) return "el aforo muestra 0% para el socio (RLS de registros_entrada)";
    },
  },
  {
    id: "02",
    archivo: "02-pago-cuota.mp4",
    rol: "socio",
    preparar: socioVencido,
    inicio: "/mi",
    accion: async (p) => {
      await pausa(600);
      await tocar(p, p.getByRole("link", { name: /Mis pagos/ }).filter({ visible: true }).first(), { despues: 1400 });
      await tocar(p, p.getByRole("button", { name: /Ya transferí/ }), { despues: 1200 });
      await socioPaga(); // el gimnasio confirma la transferencia
      await tocar(p, p.getByRole("link", { name: /Volver/ }).filter({ visible: true }).first(), { despues: 1800 });
      await pausa(400);
      await tocar(p, p.getByRole("button", { name: "Actualizar datos" }).first(), { despues: 0 });
      await p.getByText("Al día").first().waitFor({ timeout: 15000 });
      await pausa(1000);
      await tocar(p, p.getByRole("button", { name: /QR de Ingreso/ }).first(), { despues: 2000 });
    },
  },
  {
    id: "03",
    archivo: "03-rutina-hombro.mp4",
    rol: "socio",
    preparar: async () => {
      await socioPaga({ conPago: false });
      await sinRutina(CRED.socio.dni);
    },
    inicio: "/mi/rutina",
    accion: async (p) => {
      await tocar(p, p.getByRole("button", { name: /Opciones opcionales/ }), { despues: 900 });
      await tocar(p, p.locator('label:has(input[name="zonasDolor"][value="hombro"])'), { despues: 1100 });
      await tocar(p, p.getByRole("button", { name: "Listo" }), { despues: 700 });
      await tocar(p, p.getByRole("button", { name: "Generar rutina" }).last(), { despues: 0 });
      await p.getByRole("button", { name: /^Día 1/ }).first().waitFor({ timeout: 30000 }).catch(() => {});
      await esperarQuieto(p, 900);
      await p.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      await pausa(700);
      await scrollSuave(p, 520, 1600);
      await pausa(900);
    },
  },
  {
    id: "04",
    archivo: "04-push-cerrado.mp4",
    rol: "socio",
    preparar: mensajesNoLeidos,
    inicio: "/mi",
    accion: async (p) => {
      await tocar(p, p.getByRole("link", { name: "Mensajes", exact: true }).filter({ visible: true }).last(), { despues: 1400 });
      await tocar(p, p.getByRole("link", { name: /CERRADO/ }).first(), { despues: 2200 });
    },
  },
  {
    id: "05",
    archivo: "05-rutina-socia.mp4",
    rol: "dueno",
    preparar: () => sinRutina(String(40777001 + 37)), // Marta Iglesias (68 años)
    inicio: "/panel/clientes",
    accion: async (p) => {
      await escribir(p, p.getByPlaceholder(/Buscar/).first(), "Marta");
      await tocar(p, p.getByRole("link", { name: /Marta Iglesias/ }).first(), { despues: 1300 });
      await tocar(p, p.getByRole("button", { name: "Rutina", exact: true }), { despues: 900 });
      const objetivo = p.getByLabel("Objetivo");
      await traerAVista(p, objetivo);
      await tocar(p, objetivo, { despues: 300 });
      await objetivo.selectOption({ label: "Tonificar / marcar" }).catch(() => {});
      await pausa(800);
      await tocar(p, p.getByRole("button", { name: "Generar rutina" }).last(), { despues: 0 });
      await p.getByRole("button", { name: "Descargar rutina" }).waitFor({ timeout: 30000 });
      await pausa(1300);
      const descarga = p.waitForEvent("download", { timeout: 20000 }).catch(() => null);
      await tocar(p, p.getByRole("button", { name: "Descargar rutina" }), { despues: 0 });
      const d = await descarga;
      if (d) await d.saveAs(join(OUT_DIR, "05-rutina-marta.pdf")).catch(() => {});
      await pausa(1500);
    },
  },
  {
    id: "06",
    archivo: "06-ingresos.mp4",
    rol: "dueno",
    preparar: async () => {},
    inicio: "/panel/ingresos",
    accion: async (p) => {
      // Comparación entre meses: el total de arriba cambia mes anterior → actual
      // (el total y el selector de período entran juntos en pantalla).
      const periodo = p.locator("select").filter({ hasText: "Todos los meses" }).first();
      const mesAnt = new Date();
      mesAnt.setMonth(mesAnt.getMonth() - 1, 1);
      const nombreMes = (d) => d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
      await tocar(p, periodo, { despues: 250, sinScroll: true });
      await periodo.selectOption({ label: nombreMes(mesAnt) });
      await pausa(1700);
      await tocar(p, periodo, { despues: 250, sinScroll: true });
      await periodo.selectOption({ label: nombreMes(new Date()) });
      await pausa(1700);
      // Ingresos del día: calendario → hoy, y vuelve arriba al total del día.
      await scrollSuave(p, 320, 1000);
      await tocar(p, p.getByRole("button", { name: "Ver pagos por día" }), { despues: 700 });
      const hoy = String(new Date().getDate());
      await tocar(p, p.getByRole("button", { name: hoy, exact: true }).first(), { despues: 900 });
      await scrollSuave(p, -320, 1000);
      await pausa(1300);
    },
  },
  {
    id: "07",
    archivo: "07-tema.mp4",
    rol: "dueno",
    preparar: temaOriginal,
    inicio: "/panel/ajustes",
    accion: async (p) => {
      await traerAVista(p, p.getByText("Tema y marca").first(), 1300);
      await tocar(p, p.getByRole("button", { name: "Configurar" }).first(), { despues: 900 });
      const titanium = p.getByRole("button", { name: /Titanium/ }).last();
      await traerAVista(p, titanium, 1100);
      await tocar(p, titanium, { despues: 1200 });
      await tocar(p, p.getByRole("button", { name: "Guardar cambios" }).first(), { despues: 1600 });
      await tocar(p, p.getByRole("button", { name: "Cerrar modal" }).first(), { despues: 700 });
      await tocar(p, p.getByRole("link", { name: "Resumen", exact: true }).filter({ visible: true }).last(), { despues: 1800 });
    },
    despues: temaOriginal,
  },
  {
    id: "08",
    // No hay pantalla de TV: se graba el ranking de asistencia del mes en /mi.
    archivo: "08-ranking.mp4",
    rol: "socio",
    preparar: () => socioPaga({ conPago: false }),
    inicio: "/mi",
    accion: async (p) => {
      await traerAVista(p, p.getByText("Comunidad", { exact: false }).first(), 1300);
      await tocar(p, p.getByRole("button", { name: "Top", exact: true }), { despues: 2200 });
      await tocar(p, p.getByRole("button", { name: "Reto", exact: true }), { despues: 1800 });
    },
  },
];

// ── Main ─────────────────────────────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true });
if (!SIN_SEED) execFileSync("node", ["scripts/seed-demo-video.mjs"], { stdio: "inherit" });

const resultados = [];
for (const clip of CLIPS) {
  if (SOLO.length && !SOLO.includes(clip.id)) continue;
  if (clip.omitir) {
    resultados.push({ clip: clip.archivo, ok: false, nota: clip.omitir });
    continue;
  }
  let ctx, page;
  try {
    await clip.preparar();
    ctx = await contexto(clip.rol);
    page = await ctx.newPage();
    await page.goto(BASE + clip.inicio);
    await esperarQuieto(page, 2000);
    // Modales que abren solos al entrar (ej. "Hito de constancia"): fuera de cuadro.
    const cerrar = page.getByRole("button", { name: "Cerrar", exact: true }).filter({ visible: true });
    if (await cerrar.count()) {
      await cerrar.first().click();
      await pausa(900);
    }
    const problema = await clip.validar?.(page);
    if (problema) throw new Error(problema);
    const r = await grabar(page, join(OUT_DIR, clip.archivo), () => clip.accion(page), {
      ancho: ANCHO_MOVIL,
      alto: ALTO_MOVIL,
    });
    resultados.push({ clip: clip.archivo, ok: true, nota: `${r.segundos}s, ${r.frames} frames` });
    console.log(`✓ ${clip.archivo} (${r.segundos}s)`);
  } catch (e) {
    await page?.screenshot({ path: join(OUT_DIR, `_error-${clip.id}.png`) }).catch(() => {});
    resultados.push({ clip: clip.archivo, ok: false, nota: e.message.split("\n")[0] });
    console.log(`✗ ${clip.archivo}: ${e.message.split("\n")[0]}`);
  } finally {
    await ctx?.close();
    await clip.despues?.().catch(() => {});
  }
}
await browser.close();

console.log("\nResumen:");
for (const r of resultados) console.log(`${r.ok ? "✓" : "✗"} ${r.clip} — ${r.nota}`);
writeFileSync(join(OUT_DIR, "resumen.json"), JSON.stringify(resultados, null, 2));
if (existsSync(join(OUT_DIR, "05-rutina-marta.pdf"))) console.log("(PDF de la rutina de Marta guardado junto a los clips)");
