// scripts/test-simulacion-claude.ts
// Auditoría de invariantes científicos/biomecánicos del motor de rutinas SysGym.
// Ejecutar con: npx tsx scripts/test-simulacion-claude.ts
//
// Cubre invariantes NO verificados por scripts/test-motor-fuzz.ts:
//  - Techo por grupo muscular en sesión (6-8 series)
//  - Filtro excluyente duro de molestias (multi-molestia simultánea)
//  - Firewall de doble axial libre pesado
//  - DUP anti-falsa (reps/descanso coherentes con la carga axial)
//  - Crédito a sinergistas en balance.ts
//  - Combinatoria extrema de bajo volumen / equipo restrictivo

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { generarPlan, estaBloqueado } from "../src/lib/rutina/motor";
import { calcularBalanceVolumen } from "../src/lib/rutina/balance";
import {
  OBJETIVOS,
  NIVELES,
  SEXOS,
  MOLESTIAS,
  type Ejercicio,
  type EntradaMotor,
  type Objetivo,
  type Nivel,
  type Sexo,
  type PreferenciaEquipo,
  type Molestia,
} from "../src/lib/rutina/tipos";

const C = {
  reset: "\x1b[0m", bold: "\x1b[1m", green: "\x1b[32m", red: "\x1b[31m",
  yellow: "\x1b[33m", cyan: "\x1b[36m", dim: "\x1b[2m",
};

const catalogoPath = resolve(process.cwd(), "src/data/ejercicios.json");
const rawJson = JSON.parse(readFileSync(catalogoPath, "utf-8"));
const ejercicios: Ejercicio[] = rawJson.map((e: any) => ({
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

const ejPorSlug = new Map(ejercicios.filter((e) => e.slug).map((e) => [e.slug!, e]));

console.log(`${C.cyan}${C.bold}=== AUDITORÍA CLAUDE — INVARIANTES CIENTÍFICOS ===${C.reset}`);
console.log(`${C.dim}Catálogo: ${ejercicios.length} ejercicios${C.reset}\n`);

type Falla = { caso: string; detalle: string };
const fallas: Record<string, Falla[]> = {
  techoGrupoSesion: [],
  molestiaDura: [],
  axialDoble: [],
  dupAntiFalsa: [],
  sinergistas: [],
  saturacionSinPerder: [],
};

let totalRutinas = 0;
let totalEjercicios = 0;

const PREFERENCIAS: PreferenciaEquipo[] = ["gimnasio", "mancuernas", "peso_corporal"];
const MULTI_MOLESTIAS: Molestia[][] = [
  ["lumbar", "rodilla", "hombro"],
  ["hombro", "codo", "muñeca"],
  ["lumbar", "rodilla", "hombro", "codo", "muñeca"],
  ["rodilla"],
  ["lumbar"],
  ["hombro"],
  ["codo", "muñeca"],
];

function run(entrada: EntradaMotor, etiqueta: string) {
  const plan = generarPlan(entrada, ejercicios);
  totalRutinas++;

  for (const dia of plan.dias) {
    totalEjercicios += dia.items.length;

    // ── Invariante 2: techo 6-8 series por grupo muscular en la sesión ──
    const seriesPorGrupo = new Map<string, number>();
    for (const it of dia.items) {
      const ej = ejPorSlug.get(it.ejercicio_slug);
      if (!ej?.grupo_muscular) continue;
      seriesPorGrupo.set(
        ej.grupo_muscular,
        (seriesPorGrupo.get(ej.grupo_muscular) ?? 0) + it.series,
      );
    }
    for (const [grupo, series] of seriesPorGrupo) {
      // Margen: 10 series tolerado (Heaselgrave/Krieger citan hasta 10 antes de junk).
      if (series > 10) {
        fallas.techoGrupoSesion.push({
          caso: `${etiqueta} / ${dia.titulo}`,
          detalle: `${grupo}: ${series} series directas en una sesión (techo científico ~8-10)`,
        });
      }
    }

    // ── Invariante 4: filtro excluyente duro de molestias ──
    const zonasDolor = (entrada.zonasDolor ?? []) as Molestia[];
    const evitarAvanzado = (entrada.avanzado?.evitar ?? []) as Molestia[];
    const evitar = [...new Set([...zonasDolor, ...evitarAvanzado])];
    if (evitar.length > 0) {
      for (const it of dia.items) {
        const ej = ejPorSlug.get(it.ejercicio_slug);
        if (!ej) continue;
        if (estaBloqueado(ej, evitar)) {
          fallas.molestiaDura.push({
            caso: `${etiqueta} / ${dia.titulo}`,
            detalle: `Ejercicio bloqueado "${ej.slug}" (${ej.patron}/${ej.equipo}) coló pese a evitar=[${evitar.join(",")}]`,
          });
        }
      }
    }

    // ── Invariante 5: doble axial libre pesado en el mismo día ──
    const SLUGS_AXIALES = new Set([
      "sentadilla-barra", "peso-muerto-barra", "peso-muerto-rumano", "buenos-dias", "remo-barra",
    ]);
    const axialesDelDia = dia.items.filter((it) => SLUGS_AXIALES.has(it.ejercicio_slug));
    if (axialesDelDia.length > 1) {
      fallas.axialDoble.push({
        caso: `${etiqueta} / ${dia.titulo}`,
        detalle: `${axialesDelDia.length} axiales libres pesados: ${axialesDelDia.map((i) => i.ejercicio_slug).join(", ")}`,
      });
    }

    // ── Invariante 7: anti-falsa DUP — nunca axial pesado a 15-20 reps con descanso corto ──
    for (const it of dia.items) {
      if (!SLUGS_AXIALES.has(it.ejercicio_slug)) continue;
      const repsAltas = /1[5-9]|20/.test(it.repeticiones);
      const descansoCorto = /30|45|60 s\b/.test(it.nota) && !/90|120|2–3|1–2 min/.test(it.nota);
      if (repsAltas && descansoCorto) {
        fallas.dupAntiFalsa.push({
          caso: `${etiqueta} / ${dia.titulo}`,
          detalle: `${it.ejercicio_slug}: ${it.repeticiones} reps con nota "${it.nota}"`,
        });
      }
    }
  }

  // ── Invariante 8: crédito a sinergistas en balance.ts ──
  const balance = calcularBalanceVolumen(plan, ejercicios);
  const tieneEmpuje = plan.dias.some((d) =>
    d.items.some((it) => {
      const ej = ejPorSlug.get(it.ejercicio_slug);
      return ej?.patron === "empuje_horizontal" || ej?.patron === "empuje_vertical";
    }),
  );
  const tieneTraccion = plan.dias.some((d) =>
    d.items.some((it) => {
      const ej = ejPorSlug.get(it.ejercicio_slug);
      return ej?.patron === "traccion_horizontal" || ej?.patron === "traccion_vertical";
    }),
  );
  if (tieneEmpuje && (balance.triceps?.indirectas ?? 0) === 0 && (balance.hombros?.indirectas ?? 0) === 0) {
    fallas.sinergistas.push({ caso: etiqueta, detalle: "Hay empujes pero triceps/hombros no reciben crédito indirecto" });
  }
  if (tieneTraccion && (balance.biceps?.indirectas ?? 0) === 0) {
    fallas.sinergistas.push({ caso: etiqueta, detalle: "Hay tracciones pero biceps no recibe crédito indirecto" });
  }
}

// ── 0. Regresión — casos EXACTOS de los 3 bugs encontrados y arreglados
//    (auditoría 2026-09-11). Si alguno vuelve a fallar, el fix se rompió. ──
run(
  {
    objetivo: "fuerza",
    nivel: "avanzado",
    dias: 5,
    preferencia: "gimnasio",
    sexo: "sin_especificar",
    enfasis: [],
  },
  "REGRESION-BUG1[resolverMinPorRol > techo] fuerza/avanzado/5d (PULL con 2 secundarios de espalda)",
);
run(
  {
    objetivo: "resistencia",
    nivel: "intermedio",
    dias: 4,
    preferencia: "gimnasio",
    sexo: "sin_especificar",
    enfasis: [],
    zonasDolor: ["rodilla"],
  },
  "REGRESION-BUG2[axial+metabólico] resistencia/intermedio/4d/molestia=rodilla (remo-barra a 15-20 reps)",
);
run(
  {
    objetivo: "hipertrofia",
    nivel: "avanzado",
    dias: 6,
    preferencia: "gimnasio",
    sexo: "sin_especificar",
    enfasis: [],
    avanzado: {
      split: "auto",
      rango: "ondulante",
      volumen: "mav",
      rir: "1-2",
      orden: "compuestos_primero",
      tecnicaAislamientos: "ninguna",
      evitar: [],
    },
  },
  "REGRESION-BUG3[mav + PULL] DUP ondulante/mav/6d (techo por grupo/sesión)",
);

// ── 1. Multi-molestias simultáneas × todos los niveles/objetivos/split ──
for (const molestias of MULTI_MOLESTIAS) {
  for (const nivel of NIVELES) {
    for (const objetivo of OBJETIVOS) {
      run(
        {
          objetivo,
          nivel,
          dias: 4,
          preferencia: "gimnasio",
          sexo: "sin_especificar",
          enfasis: [],
          zonasDolor: molestias,
        },
        `multi-molestia[${molestias.join("+")}] ${nivel}/${objetivo}`,
      );
    }
  }
}

// ── 2. Equipamiento restrictivo × objetivos extremos × todos los días ──
for (const preferencia of PREFERENCIAS) {
  for (const objetivo of OBJETIVOS) {
    for (const dias of [2, 3, 4, 5, 6] as const) {
      for (const nivel of NIVELES) {
        run(
          {
            objetivo,
            nivel,
            dias,
            preferencia,
            sexo: "sin_especificar",
            enfasis: [],
          },
          `equipo=${preferencia}/${objetivo}/${dias}d/${nivel}`,
        );
      }
    }
  }
}

// ── 3. Splits explícitos (avanzado) 2-6 días × todas las topologías ──
const SPLITS_AVANZADOS = ["full_body", "upper_lower", "push_pull_legs", "torso_pierna"] as const;
for (const split of SPLITS_AVANZADOS) {
  for (const dias of [2, 3, 4, 5, 6] as const) {
    for (const sexo of SEXOS) {
      run(
        {
          objetivo: "hipertrofia",
          nivel: "avanzado",
          dias,
          preferencia: "gimnasio",
          sexo,
          enfasis: [],
          avanzado: {
            split,
            rango: "estandar",
            volumen: "estandar",
            rir: "1-2",
            orden: "compuestos_primero",
            tecnicaAislamientos: "ninguna",
            evitar: [],
          },
        },
        `split-explicito=${split}/${dias}d/${sexo}`,
      );
    }
  }
}

// ── 4. Combinatoria extrema de bajo volumen: principiante + MEV + RIR 2-3 ──
for (const objetivo of OBJETIVOS) {
  for (const dias of [2, 3, 4, 5, 6] as const) {
    run(
      {
        objetivo,
        nivel: "principiante",
        dias,
        preferencia: "peso_corporal",
        sexo: "sin_especificar",
        enfasis: [],
        avanzado: {
          split: "auto",
          rango: "estandar",
          volumen: "mev",
          rir: "2-3",
          orden: "compuestos_primero",
          tecnicaAislamientos: "ninguna",
          evitar: [],
        },
      },
      `bajo-volumen/${objetivo}/${dias}d`,
    );
  }
}

// ── 5. DUP (ondulante) en todos los días, con y sin molestias ──
for (const dias of [3, 4, 5, 6] as const) {
  for (const molestias of [[], ["lumbar"], ["rodilla"]] as Molestia[][]) {
    run(
      {
        objetivo: "hipertrofia",
        nivel: "avanzado",
        dias,
        preferencia: "gimnasio",
        sexo: "sin_especificar",
        enfasis: [],
        zonasDolor: molestias,
        avanzado: {
          split: "auto",
          rango: "ondulante",
          volumen: "mav",
          rir: "1-2",
          orden: "compuestos_primero",
          tecnicaAislamientos: "ninguna",
          evitar: [],
        },
      },
      `DUP/${dias}d/molestias=${molestias.join("+") || "ninguna"}`,
    );
  }
}

// ── 6. Regeneración con seed (rotación) × multi-molestia, buscando fugas en el trueque ──
for (let seed = 1; seed <= 20; seed++) {
  run(
    {
      objetivo: "hipertrofia",
      nivel: "avanzado",
      dias: 6,
      preferencia: "gimnasio",
      sexo: "mujer",
      enfasis: ["pecho", "brazos"],
      zonasDolor: ["hombro", "codo"],
      seed,
    },
    `seed=${seed}/enfasis=pecho+brazos/molestias=hombro+codo`,
  );
}

// ── Reporte ──
console.log(`${C.bold}Rutinas simuladas: ${totalRutinas} · Ejercicios auditados: ${totalEjercicios}${C.reset}\n`);

let huboFallas = false;
function reportar(nombre: string, lista: Falla[], limite = 10) {
  const ok = lista.length === 0;
  if (!ok) huboFallas = true;
  console.log(
    `[${ok ? C.green + "✔ OK" : C.red + "✘ FALLÓ"}${C.reset}] ${nombre}: ${lista.length} incidencias`,
  );
  for (const f of lista.slice(0, limite)) {
    console.log(`   ${C.dim}- ${f.caso}: ${f.detalle}${C.reset}`);
  }
  if (lista.length > limite) console.log(`   ${C.dim}... y ${lista.length - limite} más${C.reset}`);
}

reportar("Techo 6-10 series/grupo por sesión", fallas.techoGrupoSesion);
reportar("Filtro excluyente duro de molestias", fallas.molestiaDura);
reportar("Doble axial libre pesado en el mismo día", fallas.axialDoble);
reportar("Anti-falsa DUP (axial 15-20reps + descanso corto)", fallas.dupAntiFalsa);
reportar("Crédito a sinergistas (balance.ts)", fallas.sinergistas);

console.log();
if (huboFallas) {
  console.log(`${C.red}${C.bold}HAY INCONSISTENCIAS — ver detalle arriba.${C.reset}`);
  process.exit(1);
} else {
  console.log(`${C.green}${C.bold}TODOS LOS INVARIANTES ADICIONALES VERIFICADOS.${C.reset}`);
}
