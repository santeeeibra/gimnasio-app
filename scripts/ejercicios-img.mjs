// Setea imagen_url en src/data/ejercicios.json con fotos de free-exercise-db
// (dominio público, https://github.com/yuhonas/free-exercise-db). Fondo blanco,
// centradas, 2 cuadros por ejercicio (inicio/fin). El editor alterna 0.jpg↔1.jpg
// para simular un GIF.
//
//   node scripts/ejercicios-img.mjs            → parchea el JSON
//   node scripts/ejercicios-img.mjs --refresh  → rebaja scripts/fedb-cache.json
//
// Después: node scripts/seed-ejercicios.mjs  (manual, sube las URLs a la tabla)
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const CACHE = "scripts/fedb-cache.json";
const JSON_EJ = "src/data/ejercicios.json";
const CDN = "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/";

// slug propio → índice en fedb-cache.json (mapa curado a mano)
const MAPA = {
  "press-banca-barra": 43,
  "press-banca-mancuernas": 221,
  "press-inclinado-mancuernas": 343,
  flexiones: 567,
  "press-pecho-maquina": 455,
  "aperturas-polea": 270,
  dominadas: 559,
  "jalon-al-pecho": 175,
  "remo-barra": 79,
  "remo-mancuerna": 482,
  "remo-maquina": 453,
  "remo-polea-baja": 625,
  "peso-muerto-barra": 46,
  "press-militar-barra": 58,
  "press-hombro-mancuernas": 243,
  "press-hombro-maquina": 458,
  "elevaciones-laterales": 664,
  pajaros: 588,
  "curl-barra": 44,
  "curl-mancuernas": 223,
  "curl-martillo": 308,
  "curl-polea": 745,
  "fondos-banco": 70,
  "extension-polea": 824,
  "press-frances": 757,
  "fondos-paralelas": 209,
  "sentadilla-barra": 63,
  "sentadilla-goblet": 301,
  "prensa-piernas": 411,
  "zancadas-mancuernas": 229,
  "extension-cuadriceps": 409,
  "sentadilla-peso-corporal": 94,
  "peso-muerto-rumano": 603,
  "peso-muerto-rumano-mancuernas": 790,
  "curl-femoral": 447,
  "buenos-dias": 302,
  "hip-thrust": 51,
  "puente-gluteo": 107,
  "patada-gluteo-polea": 504,
  "abduccion-maquina": 814,
  "elevacion-gemelos-pie": 751,
  "elevacion-gemelos-mancuerna": 753,
  plancha: 538,
  "rueda-abdominal": 3,
  "crunch-polea": 111,
  "elevacion-piernas": 318,
  "pallof-press": 525,
  "remo-invertido": 355,
  "sentadilla-bulgara": 733,
  "peso-muerto-rumano-una-pierna": 375,
  "curl-nordico": 474,
  "hip-thrust-una-pierna": 684,
  "elevacion-gemelos-una-pierna": 242,
};

async function refrescarCache() {
  const r = await fetch(
    "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/dist/exercises.json",
  );
  const d = await r.json();
  const slim = d
    .filter((e) => e.images && e.images.length)
    .map((e) => ({
      name: e.name,
      eq: e.equipment,
      cat: e.category,
      pm: (e.primaryMuscles || []).join("/"),
      img: e.images,
    }));
  writeFileSync(CACHE, JSON.stringify(slim));
  console.log(`Cache: ${slim.length} ejercicios.`);
  return slim;
}

let cache;
if (process.argv.includes("--refresh") || !existsSync(CACHE)) {
  cache = await refrescarCache();
} else {
  cache = JSON.parse(readFileSync(CACHE, "utf8"));
}

const ejercicios = JSON.parse(readFileSync(JSON_EJ, "utf8"));
let ok = 0;
const faltan = [];
for (const ej of ejercicios) {
  const i = MAPA[ej.slug];
  const w = i != null ? cache[i] : null;
  if (!w) {
    faltan.push(ej.slug);
    ej.imagen_url = null;
    continue;
  }
  // frame 0; el cliente deriva frame 1 (/1.jpg) para animar.
  ej.imagen_url = CDN + w.img[0];
  ok++;
}

writeFileSync(JSON_EJ, JSON.stringify(ejercicios, null, 2) + "\n");
console.log(`imagen_url: ${ok}/${ejercicios.length}`);
if (faltan.length) console.log("Sin mapear:", faltan.join(", "));
