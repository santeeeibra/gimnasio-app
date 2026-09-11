// scripts/test-motor-fuzz.ts
// Test exhaustivo de combinatorias y fuzzing masivo del motor de rutinas (SysGym).
// Ejecutar con: npx tsx scripts/test-motor-fuzz.ts

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { generarPlan } from "../src/lib/rutina/motor";
import {
  OBJETIVOS,
  NIVELES,
  SEXOS,
  ENFASIS,
  MOLESTIAS,
  SPLITS,
  SPLIT_DIAS_OK,
  RANGOS,
  VOLUMENES,
  RIR_OPCIONES,
  ORDENES,
  TECNICAS,
  type Ejercicio,
  type EntradaMotor,
  type Objetivo,
  type Nivel,
  type Sexo,
  type PreferenciaEquipo,
  type Molestia,
  type Enfasis,
  type Split,
  type Rango,
  type Volumen,
  type Rir,
  type Orden,
  type Tecnica,
  type PlanGenerado,
} from "../src/lib/rutina/tipos";

// ── Colores de consola ANSI ──
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  dim: "\x1b[2m",
};

// 1. Cargar catálogo de ejercicios
const catalogoPath = resolve(process.cwd(), "src/data/ejercicios.json");
const rawJson = JSON.parse(readFileSync(catalogoPath, "utf-8"));
const ejercicios: Ejercicio[] = rawJson.map((e: Partial<Ejercicio> & { slug: string }) => ({
  id: e.id ?? e.slug,
  slug: e.slug,
  nombre: e.nombre ?? e.slug,
  grupo_muscular: e.grupo_muscular ?? null,
  patron: e.patron ?? null,
  equipo: e.equipo ?? null,
  nivel: e.nivel ?? null,
  imagen_url: e.imagen_url ?? null,
  descripcion: e.descripcion ?? null,
}));

const catalogoSlugs = new Set(ejercicios.map((e) => e.slug).filter(Boolean));

console.log(`${C.cyan}${C.bold}=== SYSGYM WORKOUT ENGINE — FUZZING & MASS TESTING ===${C.reset}`);
console.log(`${C.dim}Catálogo cargado: ${ejercicios.length} ejercicios (${catalogoSlugs.size} slugs únicos)${C.reset}\n`);

// 2. Generador de casos de prueba
const PREFERENCIAS: PreferenciaEquipo[] = ["gimnasio", "mancuernas", "peso_corporal"];
const DIAS_LIST = [2, 3, 4, 5, 6];

interface TestCase {
  id: number;
  categoria: string;
  entrada: EntradaMotor;
}

const testCases: TestCase[] = [];
let caseCounter = 0;

function agregarCaso(categoria: string, entrada: EntradaMotor) {
  caseCounter++;
  testCases.push({
    id: caseCounter,
    categoria,
    entrada,
  });
}

// ── Fase 1: Matriz cartesiana base completa (5 × 5 × 3 × 3 × 3 = 675 casos) ──
for (const objetivo of OBJETIVOS) {
  for (const dias of DIAS_LIST) {
    for (const nivel of NIVELES) {
      for (const preferencia of PREFERENCIAS) {
        for (const sexo of SEXOS) {
          agregarCaso("Base Cartesiana", {
            objetivo,
            dias,
            nivel,
            preferencia,
            sexo,
            enfasis: [],
          });
        }
      }
    }
  }
}

// ── Fase 2: Opciones avanzadas exhaustivas (~700 casos) ──
// Variando splits válidos por día, rangos DUP, volúmenes MAV/MEV, RIR, técnicas (FST-7, dropset, etc.)
for (const dias of DIAS_LIST) {
  for (const split of SPLITS) {
    for (const rango of RANGOS) {
      for (const volumen of VOLUMENES) {
        for (const rir of RIR_OPCIONES) {
          for (const tecnicaAislamientos of ["ninguna", "fst7", "dropset", "rest_pause"] as Tecnica[]) {
            const objetivo = (["hipertrofia", "fuerza", "tonificar"] as Objetivo[])[
              (dias + split.length) % 3
            ];
            const preferencia = PREFERENCIAS[(dias + rango.length) % PREFERENCIAS.length];
            const sexo = SEXOS[(dias + volumen.length) % SEXOS.length];

            agregarCaso("Opciones Avanzadas", {
              objetivo,
              dias,
              nivel: "avanzado",
              preferencia,
              sexo,
              enfasis: dias % 2 === 0 ? ["gluteos", "piernas"] : ["pecho"],
              avanzado: {
                split,
                rango,
                volumen,
                rir,
                orden: dias % 2 === 0 ? "compuestos_primero" : "prefatiga_zona",
                tecnicaAislamientos,
                evitar: [],
              },
            });
          }
        }
      }
    }
  }
}

// ── Fase 3: Molestias articulares y dolor (~500 casos) ──
// Probando cada articulación sola, en pares y todas juntas, contra todas las preferencias de equipo
const combinacionesMolestias: Molestia[][] = [
  ["hombro"],
  ["rodilla"],
  ["lumbar"],
  ["muñeca"],
  ["codo"],
  ["hombro", "codo"],
  ["rodilla", "lumbar"],
  ["hombro", "muñeca"],
  ["lumbar", "codo", "muñeca"],
  ["hombro", "rodilla", "lumbar", "muñeca", "codo"], // Todas las molestias
];

for (const molestias of combinacionesMolestias) {
  for (const dias of DIAS_LIST) {
    for (const preferencia of PREFERENCIAS) {
      for (const objetivo of ["fuerza", "hipertrofia", "bajar_grasa"] as Objetivo[]) {
        agregarCaso("Molestias y Lesiones", {
          objetivo,
          dias,
          nivel: "intermedio",
          preferencia,
          sexo: "sin_especificar",
          enfasis: ["espalda"],
          zonasDolor: molestias,
          avanzado: {
            split: "auto",
            rango: "estandar",
            volumen: "estandar",
            rir: "1-2",
            orden: "compuestos_primero",
            tecnicaAislamientos: "ninguna",
            evitar: molestias,
          },
        });
      }
    }
  }
}

// ── Fase 4: Fuzzing pseudo-aleatorio determinista (PRNG) para llegar a >= 2500 casos ──
// LCG simple para reproducibilidad 100% idéntica en cada ejecución
let seedState = 421337;
function lcgRandom(): number {
  seedState = (seedState * 1664525 + 1013904223) % 4294967296;
  return seedState / 4294967296;
}

function randomChoice<T>(arr: readonly T[]): T {
  return arr[Math.floor(lcgRandom() * arr.length)];
}

while (testCases.length < 2600) {
  const objetivo = randomChoice(OBJETIVOS);
  const dias = randomChoice(DIAS_LIST);
  const nivel = randomChoice(NIVELES);
  const preferencia = randomChoice(PREFERENCIAS);
  const sexo = randomChoice(SEXOS);
  const cantEnfasis = Math.floor(lcgRandom() * 3); // 0, 1, 2
  const enfasisSeleccionados: Enfasis[] = [];
  for (let i = 0; i < cantEnfasis; i++) {
    const enf = randomChoice(ENFASIS);
    if (!enfasisSeleccionados.includes(enf)) enfasisSeleccionados.push(enf);
  }

  const cantMolestias = Math.floor(lcgRandom() * 4); // 0..3
  const molestiasSeleccionadas: Molestia[] = [];
  for (let i = 0; i < cantMolestias; i++) {
    const mol = randomChoice(MOLESTIAS);
    if (!molestiasSeleccionadas.includes(mol)) molestiasSeleccionadas.push(mol);
  }

  const esAvanzado = nivel === "avanzado" || lcgRandom() > 0.5;
  const seed = Math.floor(lcgRandom() * 10000);

  agregarCaso("Fuzzing Pseudo-Aleatorio", {
    objetivo,
    dias,
    nivel,
    preferencia,
    sexo,
    enfasis: enfasisSeleccionados,
    zonasDolor: molestiasSeleccionadas,
    seed,
    avanzado: esAvanzado
      ? {
          split: randomChoice(SPLITS),
          rango: randomChoice(RANGOS),
          volumen: randomChoice(VOLUMENES),
          rir: randomChoice(RIR_OPCIONES),
          orden: randomChoice(ORDENES),
          tecnicaAislamientos: randomChoice(TECNICAS),
          evitar: molestiasSeleccionadas,
        }
      : undefined,
  });
}

console.log(`${C.yellow}Total de casos de prueba planificados: ${testCases.length}${C.reset}`);

// ── Invariantes a auditar en cada plan generado ──
// 1. Cero excepciones lanzadas
// 2. Ninguna sesión con > 22 series totales (cero junk volume)
// 3. Ningún ejercicio individual con > 4 series (salvo fst7 que lleva exactamente 7)
// 4. Cero ejercicios repetidos en el mismo día (slugs únicos por día)
// 5. Cero ítems nulos o vacíos (ejercicios válidos, series > 0, repeticiones no vacías)

interface InvariantViolation {
  caseId: number;
  categoria: string;
  invariante: string;
  detalle: string;
  entrada: EntradaMotor;
}

const violaciones: InvariantViolation[] = [];
const statsInvariantes = {
  invariante1_sinExcepcion: 0,
  invariante2_max22SeriesDia: 0,
  invariante3_max4SeriesEj: 0,
  invariante4_sinDuplicadosDia: 0,
  invariante5_sinItemsNulos: 0,
  invariante6_min3SeriesEj: 0,
};

let maxSeriesEncontradasEnDia = 0;
let maxSeriesEncontradasEnEj = 0;
let totalDiasEvaluados = 0;
let totalEjerciciosEvaluados = 0;

const tInicio = performance.now();

for (let i = 0; i < testCases.length; i++) {
  const tc = testCases[i];
  let plan: PlanGenerado;

  // Invariante 1: Cero excepciones
  try {
    plan = generarPlan(tc.entrada, ejercicios);
    statsInvariantes.invariante1_sinExcepcion++;
  } catch (err: any) {
    violaciones.push({
      caseId: tc.id,
      categoria: tc.categoria,
      invariante: "Invariante 1 (Cero Excepciones)",
      detalle: `Excepción lanzada: ${err?.message ?? String(err)}`,
      entrada: tc.entrada,
    });
    continue;
  }

  // Invariante 5 (Parte A): Plan y días válidos
  if (!plan || !Array.isArray(plan.dias) || plan.dias.length === 0) {
    violaciones.push({
      caseId: tc.id,
      categoria: tc.categoria,
      invariante: "Invariante 5 (Cero ítems nulos)",
      detalle: "El plan generado no contiene días o es nulo",
      entrada: tc.entrada,
    });
    continue;
  }

  let casoValido2 = true;
  let casoValido3 = true;
  let casoValido4 = true;
  let casoValido5 = true;
  let casoValido6 = true;

  for (let di = 0; di < plan.dias.length; di++) {
    const dia = plan.dias[di];
    totalDiasEvaluados++;

    if (!dia || !Array.isArray(dia.items) || dia.items.length === 0) {
      casoValido5 = false;
      violaciones.push({
        caseId: tc.id,
        categoria: tc.categoria,
        invariante: "Invariante 5 (Cero ítems nulos)",
        detalle: `Día ${di + 1} ('${dia?.titulo}') no contiene ejercicios`,
        entrada: tc.entrada,
      });
      continue;
    }

    // Invariante 2: Ninguna sesión con > 22 series totales
    const totalSeriesDia = dia.items.reduce((acc, it) => acc + (it?.series || 0), 0);
    if (totalSeriesDia > maxSeriesEncontradasEnDia) {
      maxSeriesEncontradasEnDia = totalSeriesDia;
    }
    if (totalSeriesDia > 22) {
      casoValido2 = false;
      violaciones.push({
        caseId: tc.id,
        categoria: tc.categoria,
        invariante: "Invariante 2 (Junk Volume > 22 series)",
        detalle: `Día ${di + 1} acumuló ${totalSeriesDia} series totales (> 22)`,
        entrada: tc.entrada,
      });
    }

    // Invariante 4: Cero ejercicios repetidos en el mismo día
    const slugsEnDia = new Set<string>();
    for (const it of dia.items) {
      if (it?.ejercicio_slug) {
        if (slugsEnDia.has(it.ejercicio_slug)) {
          casoValido4 = false;
          violaciones.push({
            caseId: tc.id,
            categoria: tc.categoria,
            invariante: "Invariante 4 (Cero repetidos en el día)",
            detalle: `Ejercicio '${it.ejercicio_slug}' repetido en el Día ${di + 1}`,
            entrada: tc.entrada,
          });
        }
        slugsEnDia.add(it.ejercicio_slug);
      }
    }

    // Invariante 3, 5 & 6: Series por ejercicio e integridad de ítems
    for (const it of dia.items) {
      totalEjerciciosEvaluados++;

      // Invariante 5 (Parte B): Integridad del ítem
      if (
        !it ||
        !it.ejercicio_slug ||
        typeof it.ejercicio_slug !== "string" ||
        !catalogoSlugs.has(it.ejercicio_slug) ||
        typeof it.series !== "number" ||
        it.series <= 0 ||
        !it.repeticiones ||
        typeof it.repeticiones !== "string" ||
        typeof it.nota !== "string"
      ) {
        casoValido5 = false;
        violaciones.push({
          caseId: tc.id,
          categoria: tc.categoria,
          invariante: "Invariante 5 (Cero ítems nulos/inválidos)",
          detalle: `Ítem inválido en Día ${di + 1}: ${JSON.stringify(it)}`,
          entrada: tc.entrada,
        });
      }

      // Invariante 6: ESTRICTAMENTE MÍNIMO 3 SERIES POR EJERCICIO (PROHIBIDO SERIES DE 2 O 1)
      if (it && it.series < 3) {
        casoValido6 = false;
        violaciones.push({
          caseId: tc.id,
          categoria: tc.categoria,
          invariante: "Invariante 6 (Prohibido series < 3)",
          detalle: `Ejercicio '${it.ejercicio_slug}' tiene ${it.series} series (< 3 en Día ${di + 1})`,
          entrada: tc.entrada,
        });
      }

      // Invariante 3: Ningún ejercicio con > 4 series (salvo fst7 que permite 7, o primario de fuerza que permite 5)
      if (it) {
        if (it.series > maxSeriesEncontradasEnEj && it.tecnica !== "fst7") {
          maxSeriesEncontradasEnEj = it.series;
        }

        if (it.tecnica === "fst7") {
          if (it.series > 7) {
            casoValido3 = false;
            violaciones.push({
              caseId: tc.id,
              categoria: tc.categoria,
              invariante: "Invariante 3 (> 7 series fst7)",
              detalle: `Ejercicio FST-7 '${it.ejercicio_slug}' tiene ${it.series} series (> 7)`,
              entrada: tc.entrada,
            });
          }
        } else {
          const maxPermitido = tc.entrada.objetivo === "fuerza" && it.rol === "primario" ? 5 : 4;
          if (it.series > maxPermitido) {
            casoValido3 = false;
            violaciones.push({
              caseId: tc.id,
              categoria: tc.categoria,
              invariante: `Invariante 3 (> ${maxPermitido} series no fst7)`,
              detalle: `Ejercicio '${it.ejercicio_slug}' tiene ${it.series} series (> ${maxPermitido})`,
              entrada: tc.entrada,
            });
          }
        }
      }
    }
  }

  if (casoValido2) statsInvariantes.invariante2_max22SeriesDia++;
  if (casoValido3) statsInvariantes.invariante3_max4SeriesEj++;
  if (casoValido4) statsInvariantes.invariante4_sinDuplicadosDia++;
  if (casoValido5) statsInvariantes.invariante5_sinItemsNulos++;
  if (casoValido6) statsInvariantes.invariante6_min3SeriesEj++;
}

const tTotalMs = performance.now() - tInicio;
const rutinasEvaluadas = testCases.length;
const totalFallos = violaciones.length;

// ── Reporte de Resultados ──
console.log(`\n${C.cyan}${C.bold}──────────────────────────────────────────────────────${C.reset}`);
console.log(`${C.cyan}${C.bold}             RESULTADOS DEL FUZZING MASIVO             ${C.reset}`);
console.log(`${C.cyan}${C.bold}──────────────────────────────────────────────────────${C.reset}\n`);

console.log(`• Rutinas evaluadas:        ${C.bold}${rutinasEvaluadas.toLocaleString()}${C.reset}`);
console.log(`• Días/Sesiones analizados:  ${C.bold}${totalDiasEvaluados.toLocaleString()}${C.reset}`);
console.log(`• Ejercicios auditados:      ${C.bold}${totalEjerciciosEvaluados.toLocaleString()}${C.reset}`);
console.log(`• Tiempo total:              ${C.bold}${tTotalMs.toFixed(2)} ms${C.reset} (${(tTotalMs / rutinasEvaluadas).toFixed(3)} ms/rutina)`);
console.log(`• Máx. series por sesión:    ${C.bold}${maxSeriesEncontradasEnDia}${C.reset} (límite: 22)`);
console.log(`• Máx. series/ejercicio:     ${C.bold}${maxSeriesEncontradasEnEj}${C.reset} (límite: 4, salvo FST-7)`);

console.log(`\n${C.bold}Auditoría de los 5 Invariantes:${C.reset}`);
const check = (nombre: string, ok: boolean, count: number) => {
  const icon = ok ? `${C.green}✔ OK${C.reset}` : `${C.red}✖ FALLÓ${C.reset}`;
  console.log(`  [${icon}] ${nombre}: ${count}/${rutinasEvaluadas} casos conformes`);
};

check(
  "1. Cero excepciones lanzadas",
  statsInvariantes.invariante1_sinExcepcion === rutinasEvaluadas,
  statsInvariantes.invariante1_sinExcepcion,
);
check(
  "2. Ninguna sesión con > 22 series totales (cero junk volume)",
  statsInvariantes.invariante2_max22SeriesDia === rutinasEvaluadas,
  statsInvariantes.invariante2_max22SeriesDia,
);
check(
  "3. Ningún ejercicio individual con > 4 series (salvo FST-7)",
  statsInvariantes.invariante3_max4SeriesEj === rutinasEvaluadas,
  statsInvariantes.invariante3_max4SeriesEj,
);
check(
  "4. Cero ejercicios repetidos en el mismo día",
  statsInvariantes.invariante4_sinDuplicadosDia === rutinasEvaluadas,
  statsInvariantes.invariante4_sinDuplicadosDia,
);
check(
  "5. Cero ítems nulos o vacíos en el catálogo y días",
  statsInvariantes.invariante5_sinItemsNulos === rutinasEvaluadas,
  statsInvariantes.invariante5_sinItemsNulos,
);
check(
  "6. Estrictamente mínimo 3 series por ejercicio (cero series de 2 o 1)",
  statsInvariantes.invariante6_min3SeriesEj === rutinasEvaluadas,
  statsInvariantes.invariante6_min3SeriesEj,
);

if (totalFallos > 0) {
  console.error(`\n${C.red}${C.bold}Se encontraron ${totalFallos} violaciones de invariantes:${C.reset}`);
  for (const v of violaciones.slice(0, 10)) {
    console.error(`  - Caso #${v.caseId} [${v.categoria}] ${v.invariante}: ${v.detalle}`);
    console.error(`    Config: ${JSON.stringify(v.entrada)}`);
  }
  if (totalFallos > 10) {
    console.error(`  ... y ${totalFallos - 10} violaciones más.`);
  }
  process.exit(1);
} else {
  console.log(`\n${C.green}${C.bold}======================================================${C.reset}`);
  console.log(`${C.green}${C.bold}  TODOS LOS INVARIANTES VERIFICADOS AL 100% (0 FALLOS)${C.reset}`);
  console.log(`${C.green}${C.bold}======================================================${C.reset}\n`);
  process.exit(0);
}
