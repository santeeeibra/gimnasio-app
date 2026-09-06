// src/lib/rutina/recuperacion.ts
// Buffer Inteligente de Recuperación Inter-Día (Inter-Day Recovery Buffer).
// Audita y reorganiza la secuencia semanal de bloques para garantizar que los
// mismos grupos musculares o trenes no sufran impactos pesados consecutivos sin descanso.

import EJERCICIOS_CATALOGO from "../../data/ejercicios.json";
import {
  GRUPO_MUSCULAR_LABEL,
  type Bloque,
  type Ejercicio,
  type PlanGenerado,
  type Ranura,
} from "./tipos";

// Grupos musculares primarios de alta fatiga sistémica / articular.
export const GRUPOS_ALTA_FATIGA: ReadonlySet<string> = new Set([
  "pecho",
  "espalda",
  "cuadriceps",
  "isquios",
  "gluteos",
  "hombros",
]);

export type TipoBloque =
  | "empuje"
  | "traccion"
  | "pierna"
  | "torso"
  | "full_body"
  | "otro";

/**
 * Obtiene los grupos musculares primarios trabajados en un bloque.
 * Prioriza ranuras con rol "primario"; si no hay, toma compuestos o todas.
 */
export function obtenerGruposPrimarios(bloque: Bloque): string[] {
  const primarias = bloque.ranuras
    .filter((r) => r.rol === "primario")
    .map((r) => r.grupo.toLowerCase().trim());
  if (primarias.length > 0) {
    return Array.from(new Set(primarias));
  }

  const compuestos = bloque.ranuras
    .filter((r) => r.rol !== "aislamiento")
    .map((r) => r.grupo.toLowerCase().trim());
  if (compuestos.length > 0) {
    return Array.from(new Set(compuestos));
  }

  return Array.from(
    new Set(bloque.ranuras.map((r) => r.grupo.toLowerCase().trim())),
  );
}

/**
 * Determina si dos bloques consecutivos son idénticos en título o composición.
 */
export function sonBloquesIdenticos(a: Bloque, b: Bloque): boolean {
  if (a.titulo.toLowerCase().trim() === b.titulo.toLowerCase().trim()) {
    return true;
  }
  if (a.ranuras.length !== b.ranuras.length) {
    return false;
  }
  return a.ranuras.every(
    (r, idx) =>
      r.grupo === b.ranuras[idx]?.grupo &&
      r.patron === b.ranuras[idx]?.patron &&
      r.rol === b.ranuras[idx]?.rol,
  );
}

/**
 * Determina si dos bloques comparten grupos musculares primarios de alta fatiga.
 */
export function compartenGruposAltaFatiga(a: Bloque, b: Bloque): boolean {
  const gruposA = obtenerGruposPrimarios(a);
  const gruposB = new Set(obtenerGruposPrimarios(b));
  return gruposA.some((g) => GRUPOS_ALTA_FATIGA.has(g) && gruposB.has(g));
}

/**
 * Clasifica la categoría biomecánica principal de un bloque.
 */
export function clasificarTipoBloque(bloque: Bloque): TipoBloque {
  const tit = bloque.titulo.toLowerCase();
  if (tit.includes("empuje") || tit.includes("push")) return "empuje";
  if (tit.includes("tracción") || tit.includes("traccion") || tit.includes("pull")) return "traccion";
  if (tit.includes("pierna") || tit.includes("legs") || tit.includes("inferior")) return "pierna";
  if (tit.includes("torso") || tit.includes("superior")) return "torso";
  if (tit.includes("completo") || tit.includes("full")) return "full_body";

  const prim = obtenerGruposPrimarios(bloque);
  const tienePechoOHombro = prim.some((g) => g === "pecho" || g === "hombros");
  const tieneEspalda = prim.some((g) => g === "espalda");
  const tienePierna = prim.some((g) => g === "cuadriceps" || g === "isquios" || g === "gluteos");

  if (tienePierna && (tienePechoOHombro || tieneEspalda)) return "full_body";
  if (tienePierna) return "pierna";
  if (tienePechoOHombro && tieneEspalda) return "torso";
  if (tienePechoOHombro) return "empuje";
  if (tieneEspalda) return "traccion";

  return "otro";
}

/**
 * Audita y optimiza la secuencia de bloques para evitar fatiga acumulada
 * en días consecutivos.
 *
 * 1. Para splits de 3 días: asegura que nunca haya 2 días idénticos seguidos
 *    e intercala tren opuesto (ej: Empuje -> Pierna -> Tracción en vez de Empuje -> Tracción -> Pierna).
 * 2. Para splits de 5 días: secuencia óptima [Empuje, Tracción, Pierna, Torso, Pierna]
 *    o [Torso, Pierna, Empuje, Tracción, Pierna].
 * 3. En general: detecta si dos días consecutivos comparten grupos primarios de alta fatiga
 *    (ej: Torso seguido de Empuje, o Pierna seguida de Pierna) e intercala un día antagonista
 *    o de tren opuesto.
 */
export function auditarYEspaciarDias(bloques: Bloque[]): Bloque[] {
  if (bloques.length <= 1) {
    return [...bloques];
  }

  // ── 1. Caso especial: Splits de 3 días ──
  if (bloques.length === 3) {
    const tipos = bloques.map(clasificarTipoBloque);
    const hayEmpuje = tipos.includes("empuje");
    const hayTraccion = tipos.includes("traccion");
    const hayPierna = tipos.includes("pierna");

    // Push / Pull / Legs: intercala Pierna entre ambos trenes superiores
    if (hayEmpuje && hayTraccion && hayPierna) {
      const bEmpuje = bloques[tipos.indexOf("empuje")];
      const bTraccion = bloques[tipos.indexOf("traccion")];
      const bPierna = bloques[tipos.indexOf("pierna")];

      // Si tracción vino antes que empuje, respeta ese inicio
      if (tipos.indexOf("traccion") < tipos.indexOf("empuje")) {
        return [bTraccion, bPierna, bEmpuje];
      }
      return [bEmpuje, bPierna, bTraccion];
    }

    // Si hay 2 días idénticos seguidos, intercala el tercero en el medio
    if (sonBloquesIdenticos(bloques[0], bloques[1])) {
      return [bloques[0], bloques[2], bloques[1]];
    }
    if (sonBloquesIdenticos(bloques[1], bloques[2])) {
      return [bloques[1], bloques[0], bloques[2]];
    }

    // Si los dos primeros comparten alta fatiga, intercala el tercero
    if (compartenGruposAltaFatiga(bloques[0], bloques[1])) {
      return [bloques[0], bloques[2], bloques[1]];
    }

    return [...bloques];
  }

  // ── 2. Caso especial: Splits de 5 días (secuencia óptima estandarizada) ──
  if (bloques.length === 5) {
    const tipos = bloques.map(clasificarTipoBloque);
    const empujes = bloques.filter((_, i) => tipos[i] === "empuje");
    const tracciones = bloques.filter((_, i) => tipos[i] === "traccion");
    const piernas = bloques.filter((_, i) => tipos[i] === "pierna");
    const torsos = bloques.filter((_, i) => tipos[i] === "torso");

    // Composición estándar de 5 días: 1 Empuje, 1 Tracción, 2 Piernas, 1 Torso
    if (
      empujes.length === 1 &&
      tracciones.length === 1 &&
      piernas.length === 2 &&
      torsos.length === 1
    ) {
      const bEmpuje = empujes[0];
      const bTraccion = tracciones[0];
      const bPierna1 = piernas[0];
      const bPierna2 = piernas[1];
      const bTorso = torsos[0];

      // Si la rutina originalmente empezaba por Torso: [Torso, Pierna, Empuje, Tracción, Pierna]
      if (tipos[0] === "torso" || tipos.indexOf("torso") < tipos.indexOf("empuje")) {
        return [bTorso, bPierna1, bEmpuje, bTraccion, bPierna2];
      }

      // Secuencia óptima principal: [Empuje, Tracción, Pierna, Torso, Pierna]
      return [bEmpuje, bTraccion, bPierna1, bTorso, bPierna2];
    }
  }

  // ── 3. Algoritmo general de intercalación para evitar colisiones ──
  const resultado = [...bloques];
  let huboCambio = true;
  let iteraciones = 0;
  const MAX_ITERACIONES = bloques.length * 2;

  while (huboCambio && iteraciones < MAX_ITERACIONES) {
    huboCambio = false;
    iteraciones++;

    for (let i = 0; i < resultado.length - 1; i++) {
      const diaActual = resultado[i];
      const diaSiguiente = resultado[i + 1];

      const sonIdenticos = sonBloquesIdenticos(diaActual, diaSiguiente);
      const chocanAltaFatiga = compartenGruposAltaFatiga(diaActual, diaSiguiente);

      if (sonIdenticos || chocanAltaFatiga) {
        // Buscar un día más adelante que sea compatible para intercalar
        let mejorCandidatoIdx = -1;

        for (let j = i + 2; j < resultado.length; j++) {
          const candidato = resultado[j];
          const noChocaConActual =
            !sonBloquesIdenticos(diaActual, candidato) &&
            !compartenGruposAltaFatiga(diaActual, candidato);
          const noChocaConSiguiente =
            !sonBloquesIdenticos(diaSiguiente, candidato) &&
            !compartenGruposAltaFatiga(diaSiguiente, candidato);

          if (noChocaConActual && noChocaConSiguiente) {
            mejorCandidatoIdx = j;
            break;
          }

          if (noChocaConActual && mejorCandidatoIdx === -1) {
            mejorCandidatoIdx = j;
          }
        }

        if (mejorCandidatoIdx !== -1) {
          const [extraido] = resultado.splice(mejorCandidatoIdx, 1);
          resultado.splice(i + 1, 0, extraido);
          huboCambio = true;
          break;
        }
      }
    }
  }

  return resultado;
}

// ─────────────────────────────────────────────────────────────
// Verificación 48h entre impactos directos pesados
// ─────────────────────────────────────────────────────────────

type InfoEjercicio = {
  grupo_muscular: string;
  patron?: string | null;
  nombre?: string | null;
};

// Índice global por slug para resolver grupo y patrón de forma instantánea
const CATALOGO_SLUG_MAP: Map<string, InfoEjercicio> = new Map(
  (EJERCICIOS_CATALOGO as Array<{
    slug: string;
    grupo_muscular: string;
    patron?: string | null;
    nombre?: string | null;
  }>).map((e) => [
    e.slug,
    {
      grupo_muscular: e.grupo_muscular,
      patron: e.patron ?? null,
      nombre: e.nombre ?? null,
    },
  ]),
);

/**
 * Identifica si un ejercicio constituye un impacto directo pesado para un grupo muscular.
 */
function esImpactoDirectoPesado(
  item: {
    ejercicio_slug: string;
    series: number;
    repeticiones: string;
    rol?: string;
  },
  info?: InfoEjercicio,
): boolean {
  // Si explícitamente tiene rol primario
  if (item.rol === "primario") return true;

  // Si no tiene rol pero es un ejercicio compuesto no-aislamiento
  if (info && info.patron && info.patron !== "aislamiento") {
    return true;
  }

  // Si son series de fuerza/tensión pesada (<= 8 reps o series >= 3)
  const repsLimpias = item.repeticiones.replace(/[^0-9–-]/g, "");
  const partes = repsLimpias.split(/[–-]/).map((n) => parseInt(n, 10)).filter((n) => !isNaN(n));
  const maxReps = partes.length > 0 ? Math.max(...partes) : 10;
  if (item.series >= 3 && maxReps <= 8 && info?.patron !== "aislamiento") {
    return true;
  }

  return false;
}

/**
 * Deduce los grupos con impacto directo pesado en un día específico.
 */
function obtenerGruposPesadosDia(
  dia: PlanGenerado["dias"][number],
  ejerciciosExtra?: Ejercicio[],
): Set<string> {
  const grupos = new Set<string>();

  const extraMap = ejerciciosExtra
    ? new Map(
        ejerciciosExtra
          .filter((e) => e.slug)
          .map((e) => [
            e.slug!,
            {
              grupo_muscular: e.grupo_muscular ?? "",
              patron: e.patron,
              nombre: e.nombre,
            },
          ]),
      )
    : null;

  for (const item of dia.items) {
    const info = extraMap?.get(item.ejercicio_slug) ?? CATALOGO_SLUG_MAP.get(item.ejercicio_slug);
    if (!info || !info.grupo_muscular) continue;

    if (esImpactoDirectoPesado(item, info)) {
      grupos.add(info.grupo_muscular.toLowerCase().trim());
    }
  }

  // Respaldo heurístico según el título si el día no tiene items mapeados
  if (grupos.size === 0) {
    const tit = dia.titulo.toLowerCase();
    if (tit.includes("empuje") || tit.includes("push")) {
      grupos.add("pecho");
      grupos.add("hombros");
    } else if (tit.includes("tracción") || tit.includes("traccion") || tit.includes("pull")) {
      grupos.add("espalda");
    } else if (tit.includes("pierna") || tit.includes("legs") || tit.includes("inferior")) {
      grupos.add("cuadriceps");
      grupos.add("isquios");
    } else if (tit.includes("torso") || tit.includes("superior")) {
      grupos.add("pecho");
      grupos.add("espalda");
    }
  }

  return grupos;
}

/**
 * Revisa si algún grupo muscular tiene < 48h de descanso entre impactos directos pesados
 * en días de entrenamiento consecutivos dentro del plan semanal.
 *
 * @param plan El plan generado a inspeccionar.
 * @param ejercicios Opcional: catálogo adicional para mapear ejercicios locales o personalizados.
 * @returns { ok: boolean, advertencias: string[] }
 */
export function verificarRecuperacion48h(
  plan: PlanGenerado,
  ejercicios?: Ejercicio[],
): { ok: boolean; advertencias: string[] } {
  const advertencias: string[] = [];

  if (!plan.dias || plan.dias.length <= 1) {
    return { ok: true, advertencias: [] };
  }

  for (let i = 0; i < plan.dias.length - 1; i++) {
    const diaA = plan.dias[i];
    const diaB = plan.dias[i + 1];

    const gruposA = obtenerGruposPesadosDia(diaA, ejercicios);
    const gruposB = obtenerGruposPesadosDia(diaB, ejercicios);

    // Comparar colisiones en grupos principales de alta fatiga
    for (const grupo of gruposA) {
      if (GRUPOS_ALTA_FATIGA.has(grupo) && gruposB.has(grupo)) {
        const nombreGrupo = GRUPO_MUSCULAR_LABEL[grupo] ?? grupo;
        const nombreDiaA = diaA.titulo || `Día ${i + 1}`;
        const nombreDiaB = diaB.titulo || `Día ${i + 2}`;

        advertencias.push(
          `El grupo muscular "${nombreGrupo}" recibe impactos directos pesados en días consecutivos (${nombreDiaA} y ${nombreDiaB}) con menos de 48 horas de recuperación entre sesiones.`,
        );
      }
    }
  }

  return {
    ok: advertencias.length === 0,
    advertencias,
  };
}
