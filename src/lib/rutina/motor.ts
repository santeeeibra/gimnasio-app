// Motor de rutinas — reglas fijas, determinista, sin dependencias.
//
// Es el "cerebro" v1: no usa IA ni llamadas externas. Codifica criterio de
// entrenador en heurísticas puras. Toda la app depende solo de `generarPlan`
// y `ejerciciosSimilares`, así que más adelante se puede reemplazar la
// implementación por un modelo local (ONNX) o un LLM propio sin tocar la UI
// ni la persistencia.

import {
  PREFERENCIAS_EQUIPO,
  type Ejercicio,
  type EntradaMotor,
  type Nivel,
  type Objetivo,
  type PlanGenerado,
  type ItemGenerado,
} from "./tipos";

const NIVEL_ORDEN: Record<Nivel, number> = {
  principiante: 0,
  intermedio: 1,
  avanzado: 2,
};

// ─────────────────────────────────────────────────────────────
// Esquema de series / repeticiones / descanso por objetivo
// ─────────────────────────────────────────────────────────────

type Esquema = {
  seriesCompuesto: number;
  seriesAislamiento: number;
  repsCompuesto: string;
  repsAislamiento: string;
  descanso: string;
};

const ESQUEMA: Record<Objetivo, Esquema> = {
  fuerza: {
    seriesCompuesto: 4,
    seriesAislamiento: 3,
    repsCompuesto: "5",
    repsAislamiento: "8",
    descanso: "Descanso 2–3 min",
  },
  hipertrofia: {
    seriesCompuesto: 4,
    seriesAislamiento: 3,
    repsCompuesto: "8–10",
    repsAislamiento: "12–15",
    descanso: "Descanso 60–90 s",
  },
  resistencia: {
    seriesCompuesto: 3,
    seriesAislamiento: 3,
    repsCompuesto: "15–20",
    repsAislamiento: "15–20",
    descanso: "Descanso 30–45 s",
  },
  bajar_grasa: {
    seriesCompuesto: 3,
    seriesAislamiento: 3,
    repsCompuesto: "12–15",
    repsAislamiento: "15",
    descanso: "Descanso 45 s · ritmo de circuito",
  },
};

function ajustarPorNivel(esquema: Esquema, nivel: Nivel): Esquema {
  if (nivel === "principiante") {
    return {
      ...esquema,
      seriesCompuesto: Math.max(2, esquema.seriesCompuesto - 1),
      seriesAislamiento: Math.max(2, esquema.seriesAislamiento - 1),
    };
  }
  if (nivel === "avanzado") {
    return { ...esquema, seriesCompuesto: esquema.seriesCompuesto + 1 };
  }
  return esquema;
}

// ─────────────────────────────────────────────────────────────
// Splits: para cada día, la lista de "ranuras" a llenar
// ─────────────────────────────────────────────────────────────

type Ranura = {
  grupo: string;
  patron?: string;
  rol: "compuesto" | "aislamiento";
};

const c = (grupo: string, patron?: string): Ranura => ({ grupo, patron, rol: "compuesto" });
const a = (grupo: string, patron?: string): Ranura => ({ grupo, patron, rol: "aislamiento" });

const FULL_BODY_A: Ranura[] = [
  c("cuadriceps", "dominante_rodilla"),
  c("espalda", "traccion_horizontal"),
  c("pecho", "empuje_horizontal"),
  c("isquios", "dominante_cadera"),
  c("hombros", "empuje_vertical"),
  a("core"),
];
const FULL_BODY_B: Ranura[] = [
  c("isquios", "dominante_cadera"),
  c("espalda", "traccion_vertical"),
  c("pecho", "empuje_horizontal"),
  c("cuadriceps", "dominante_rodilla"),
  a("hombros"),
  a("core"),
];
const FULL_BODY_C: Ranura[] = [
  c("gluteos", "dominante_cadera"),
  c("espalda", "traccion_horizontal"),
  c("hombros", "empuje_vertical"),
  c("cuadriceps", "dominante_rodilla"),
  a("biceps"),
  a("triceps"),
];

const TORSO: Ranura[] = [
  c("pecho", "empuje_horizontal"),
  c("espalda", "traccion_horizontal"),
  c("hombros", "empuje_vertical"),
  c("espalda", "traccion_vertical"),
  a("biceps"),
  a("triceps"),
];
const PIERNA: Ranura[] = [
  c("cuadriceps", "dominante_rodilla"),
  c("isquios", "dominante_cadera"),
  c("gluteos", "dominante_cadera"),
  a("cuadriceps"),
  a("gemelos"),
  a("core"),
];

const PUSH: Ranura[] = [
  c("pecho", "empuje_horizontal"),
  c("pecho", "empuje_horizontal"),
  c("hombros", "empuje_vertical"),
  a("hombros"),
  a("triceps"),
  a("triceps"),
];
const PULL: Ranura[] = [
  c("espalda", "traccion_vertical"),
  c("espalda", "traccion_horizontal"),
  c("espalda", "traccion_horizontal"),
  a("hombros"),
  a("biceps"),
  a("core"),
];
const LEGS: Ranura[] = [
  c("cuadriceps", "dominante_rodilla"),
  c("isquios", "dominante_cadera"),
  c("gluteos", "dominante_cadera"),
  a("isquios"),
  a("gemelos"),
  a("core"),
];

type Bloque = { titulo: string; ranuras: Ranura[] };

function splitPorDias(dias: number): Bloque[] {
  switch (dias) {
    case 2:
      return [
        { titulo: "Cuerpo completo A", ranuras: FULL_BODY_A },
        { titulo: "Cuerpo completo B", ranuras: FULL_BODY_B },
      ];
    case 3:
      return [
        { titulo: "Cuerpo completo A", ranuras: FULL_BODY_A },
        { titulo: "Cuerpo completo B", ranuras: FULL_BODY_B },
        { titulo: "Cuerpo completo C", ranuras: FULL_BODY_C },
      ];
    case 4:
      return [
        { titulo: "Torso", ranuras: TORSO },
        { titulo: "Pierna", ranuras: PIERNA },
        { titulo: "Torso", ranuras: TORSO },
        { titulo: "Pierna", ranuras: PIERNA },
      ];
    case 5:
      return [
        { titulo: "Empuje", ranuras: PUSH },
        { titulo: "Tracción", ranuras: PULL },
        { titulo: "Pierna", ranuras: LEGS },
        { titulo: "Torso", ranuras: TORSO },
        { titulo: "Pierna", ranuras: PIERNA },
      ];
    default: // 6
      return [
        { titulo: "Empuje", ranuras: PUSH },
        { titulo: "Tracción", ranuras: PULL },
        { titulo: "Pierna", ranuras: LEGS },
        { titulo: "Empuje", ranuras: PUSH },
        { titulo: "Tracción", ranuras: PULL },
        { titulo: "Pierna", ranuras: LEGS },
      ];
  }
}

// ─────────────────────────────────────────────────────────────
// Selección de ejercicios
// ─────────────────────────────────────────────────────────────

function nivelIdx(nivel: string | null): number {
  return NIVEL_ORDEN[(nivel as Nivel) ?? "principiante"] ?? 0;
}

function puntuar(
  ej: Ejercicio,
  ranura: Ranura,
  equipoPrefs: readonly string[],
  nivelCliente: Nivel,
  usadosSemana: Set<string>,
  usadosDia: Set<string>,
): number {
  let p = 0;
  if (usadosDia.has(ej.id)) return -Infinity; // nunca repetir en el mismo día
  if (ranura.patron && ej.patron === ranura.patron) p += 40;
  if (ranura.rol === "aislamiento" && ej.patron === "aislamiento") p += 15;
  if (ranura.rol === "compuesto" && ej.patron !== "aislamiento") p += 15;
  if (equipoPrefs.length === 0 || (ej.equipo && equipoPrefs.includes(ej.equipo))) {
    p += 20;
  } else {
    p -= 25; // fuera de las preferencias: solo si no queda otra
  }
  if (nivelIdx(ej.nivel) <= NIVEL_ORDEN[nivelCliente]) p += 10;
  else p -= 15 * (nivelIdx(ej.nivel) - NIVEL_ORDEN[nivelCliente]);
  if (!usadosSemana.has(ej.id)) p += 8; // preferir variedad en la semana
  return p;
}

function elegir(
  ejercicios: Ejercicio[],
  ranura: Ranura,
  equipoPrefs: readonly string[],
  nivelCliente: Nivel,
  usadosSemana: Set<string>,
  usadosDia: Set<string>,
): Ejercicio | null {
  const candidatos = ejercicios.filter((e) => e.grupo_muscular === ranura.grupo);
  if (candidatos.length === 0) return null;
  let mejor: Ejercicio | null = null;
  let mejorP = -Infinity;
  for (const ej of candidatos) {
    const p = puntuar(ej, ranura, equipoPrefs, nivelCliente, usadosSemana, usadosDia);
    // Desempate estable por slug para que la salida sea determinista.
    if (p > mejorP || (p === mejorP && mejor && (ej.slug ?? "") < (mejor.slug ?? ""))) {
      mejor = ej;
      mejorP = p;
    }
  }
  return mejor;
}

// ─────────────────────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────────────────────

export function generarPlan(
  entrada: EntradaMotor,
  ejercicios: Ejercicio[],
): PlanGenerado {
  const dias = Math.min(6, Math.max(2, Math.round(entrada.dias)));
  const equipoPrefs = PREFERENCIAS_EQUIPO[entrada.preferencia] ?? [];
  const esquema = ajustarPorNivel(ESQUEMA[entrada.objetivo], entrada.nivel);
  const bloques = splitPorDias(dias);
  const usadosSemana = new Set<string>();

  const diasPlan = bloques.map((bloque, i) => {
    const usadosDia = new Set<string>();
    const items: ItemGenerado[] = [];

    for (const ranura of bloque.ranuras) {
      const ej = elegir(
        ejercicios,
        ranura,
        equipoPrefs,
        entrada.nivel,
        usadosSemana,
        usadosDia,
      );
      if (!ej || !ej.slug) continue;
      usadosDia.add(ej.id);
      usadosSemana.add(ej.id);

      const esComp = ranura.rol === "compuesto";
      const series = esComp
        ? esquema.seriesCompuesto
        : esquema.seriesAislamiento;

      items.push({
        ejercicio_slug: ej.slug,
        series,
        repeticiones: esComp ? esquema.repsCompuesto : esquema.repsAislamiento,
        nota: esquema.descanso,
      });
    }

    const numero = `Día ${i + 1}`;
    return { titulo: `${numero} · ${bloque.titulo}`, items };
  });

  return { entrada: { ...entrada, dias }, dias: diasPlan };
}

/**
 * Candidatos para "no conozco este ejercicio, cambialo".
 * Heurística gratis: mismo grupo, ordenados por cercanía de patrón, equipo y nivel.
 */
export function ejerciciosSimilares(
  base: Ejercicio,
  todos: Ejercicio[],
  limite = 6,
): Ejercicio[] {
  return todos
    .filter((e) => e.id !== base.id && e.grupo_muscular === base.grupo_muscular)
    .map((e) => {
      let p = 0;
      if (e.patron === base.patron) p += 3;
      if (e.equipo === base.equipo) p += 2;
      if (e.nivel === base.nivel) p += 1;
      return { e, p };
    })
    .sort((x, y) => y.p - x.p || (x.e.slug ?? "").localeCompare(y.e.slug ?? ""))
    .slice(0, limite)
    .map((x) => x.e);
}
