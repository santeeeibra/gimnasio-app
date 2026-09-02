// Motor de rutinas — reglas fijas, determinista salvo `seed`, sin dependencias.
//
// Es el "cerebro" v1: no usa IA ni llamadas externas. Codifica criterio de
// entrenador en heurísticas puras. Toda la app depende solo de `generarPlan`
// y `ejerciciosSimilares`, así que más adelante se puede reemplazar la
// implementación por un modelo local (ONNX) o un LLM propio sin tocar la UI
// ni la persistencia.
//
// Qué mira para armar el plan: objetivo + nivel + días + equipo + sexo +
// zonas de énfasis. El objetivo no solo cambia series/reps: también sesga
// qué ejercicios entran y recorta/estira la sesión. `seed` (opcional) hace
// que "Regenerar" devuelva un plan distinto pero igual de válido: rota entre
// los candidatos que quedaron a tiro del mejor puntaje.

import {
  ENFASIS_GRUPOS,
  PREFERENCIAS_EQUIPO,
  type Ejercicio,
  type Enfasis,
  type EntradaMotor,
  type Nivel,
  type Objetivo,
  type PlanGenerado,
  type ItemGenerado,
  type Sexo,
} from "./tipos";

const NIVEL_ORDEN: Record<Nivel, number> = {
  principiante: 0,
  intermedio: 1,
  avanzado: 2,
};

// Cuánto "básico" es cada implemento para un ejercicio compuesto. Rompe empates
// hacia los movimientos de barra/mancuerna cuando no hay restricción de equipo,
// sin castigar a los compuestos de peso corporal difíciles (dominadas, fondos).
const EQUIPO_PESO: Record<string, number> = {
  barra: 6,
  mancuernas: 5,
  maquina: 3,
  polea: 3,
  peso_corporal: 3,
};

// ─────────────────────────────────────────────────────────────
// Ranuras: cada día es una lista de "huecos" a llenar
// ─────────────────────────────────────────────────────────────

type Rol = "primario" | "secundario" | "aislamiento";

type Ranura = {
  grupo: string;
  patron?: string;
  rol: Rol;
};

// primario = movimiento pesado de arranque · secundario = compuesto de apoyo
// aislamiento = accesorio de una articulación.
const P = (grupo: string, patron?: string): Ranura => ({ grupo, patron, rol: "primario" });
const S = (grupo: string, patron?: string): Ranura => ({ grupo, patron, rol: "secundario" });
const A = (grupo: string, patron?: string): Ranura => ({ grupo, patron, rol: "aislamiento" });

const FULL_BODY_A: Ranura[] = [
  P("cuadriceps", "dominante_rodilla"),
  P("espalda", "traccion_horizontal"),
  S("pecho", "empuje_horizontal"),
  S("isquios", "dominante_cadera"),
  S("hombros", "empuje_vertical"),
  A("core"),
];
const FULL_BODY_B: Ranura[] = [
  P("isquios", "dominante_cadera"),
  P("espalda", "traccion_vertical"),
  S("pecho", "empuje_horizontal"),
  S("cuadriceps", "dominante_rodilla"),
  A("hombros"),
  A("core"),
];
const FULL_BODY_C: Ranura[] = [
  P("gluteos", "dominante_cadera"),
  P("espalda", "traccion_horizontal"),
  S("hombros", "empuje_vertical"),
  S("cuadriceps", "dominante_rodilla"),
  A("biceps"),
  A("triceps"),
];

const TORSO: Ranura[] = [
  P("pecho", "empuje_horizontal"),
  P("espalda", "traccion_horizontal"),
  S("hombros", "empuje_vertical"),
  S("espalda", "traccion_vertical"),
  A("biceps"),
  A("triceps"),
];
const PIERNA: Ranura[] = [
  P("cuadriceps", "dominante_rodilla"),
  P("isquios", "dominante_cadera"),
  S("gluteos", "dominante_cadera"),
  A("cuadriceps"),
  A("gemelos"),
  A("core"),
];

const PUSH: Ranura[] = [
  P("pecho", "empuje_horizontal"),
  S("pecho", "empuje_horizontal"),
  S("hombros", "empuje_vertical"),
  A("hombros"),
  A("triceps"),
  A("triceps"),
];
const PULL: Ranura[] = [
  P("espalda", "traccion_vertical"),
  P("espalda", "traccion_horizontal"),
  S("espalda", "traccion_horizontal"),
  A("hombros"),
  A("biceps"),
  A("core"),
];
const LEGS: Ranura[] = [
  P("cuadriceps", "dominante_rodilla"),
  P("isquios", "dominante_cadera"),
  S("gluteos", "dominante_cadera"),
  A("isquios"),
  A("gemelos"),
  A("core"),
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

// El objetivo también moldea la sesión, no solo el rango de reps:
// - fuerza: pocas accesorias (máx. 2), sesión corta y pesada.
// - resistencia / bajar grasa: garantiza core al cierre (tono de circuito).
// - hipertrofia: se deja como viene.
function moldearPorObjetivo(ranuras: Ranura[], objetivo: Objetivo): Ranura[] {
  if (objetivo === "fuerza") {
    const compuestos = ranuras.filter((r) => r.rol !== "aislamiento");
    const accesorias = ranuras.filter((r) => r.rol === "aislamiento").slice(0, 2);
    return [...compuestos, ...accesorias];
  }
  if (objetivo === "resistencia" || objetivo === "bajar_grasa") {
    return ranuras.some((r) => r.grupo === "core") ? ranuras : [...ranuras, A("core")];
  }
  return ranuras;
}

// Patrón preferido al agregar una ranura de énfasis, para que caiga un
// movimiento real del grupo (hip thrust, remo, press…) y no un accesorio flojo.
const PATRON_ENFASIS: Record<string, string | undefined> = {
  gluteos: "dominante_cadera",
  isquios: "dominante_cadera",
  cuadriceps: "dominante_rodilla",
  pecho: "empuje_horizontal",
  espalda: "traccion_horizontal",
  hombros: "empuje_vertical",
};

// Suma ranuras extra para las zonas que el cliente pidió priorizar. Si no pidió
// ninguna y es mujer, prioriza glúteos por defecto. Tope: +3 ranuras y 8 por
// día para no inflar la sesión. Si la zona tiene un patrón compuesto asociado,
// la ranura extra entra como "secundario" (más carga real para esa zona).
function aplicarEnfasis(
  ranuras: Ranura[],
  enfasis: Enfasis[],
  sexo: Sexo,
): Ranura[] {
  const zonas: Enfasis[] =
    enfasis.length > 0 ? enfasis : sexo === "mujer" ? ["gluteos"] : [];
  if (zonas.length === 0) return ranuras;

  const grupos = zonas.flatMap((z) => ENFASIS_GRUPOS[z]);
  const out = [...ranuras];
  let sumadas = 0;

  for (const grupo of grupos) {
    const presentes = out.filter((r) => r.grupo === grupo).length;
    for (let k = presentes; k < 2 && out.length < 8 && sumadas < 3; k++) {
      const patron = PATRON_ENFASIS[grupo];
      out.push({ grupo, patron, rol: patron ? "secundario" : "aislamiento" });
      sumadas++;
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// Esquema de series / repeticiones / descanso por objetivo y rol
// ─────────────────────────────────────────────────────────────

type Rx = { series: number; reps: string };
type EsquemaObj = {
  primario: Rx;
  secundario: Rx;
  aislamiento: Rx;
  descanso: string;
};

// Antes todo compuesto salía "5 series". Ahora cada rol tiene su prescripción:
// el plan mezcla 5×5, 4×6, 3×8–10… como una rutina real. Todos los rangos de
// reps salen de REPS_OPCIONES (menús del editor).
const ESQUEMA: Record<Objetivo, EsquemaObj> = {
  fuerza: {
    primario: { series: 5, reps: "5" },
    secundario: { series: 4, reps: "6" },
    aislamiento: { series: 3, reps: "8–10" },
    descanso: "Descanso 2–3 min",
  },
  hipertrofia: {
    primario: { series: 4, reps: "6–8" },
    secundario: { series: 3, reps: "8–12" },
    aislamiento: { series: 3, reps: "12–15" },
    descanso: "Descanso 60–90 s",
  },
  resistencia: {
    primario: { series: 3, reps: "15–20" },
    secundario: { series: 3, reps: "15–20" },
    aislamiento: { series: 2, reps: "20" },
    descanso: "Descanso 30–45 s",
  },
  bajar_grasa: {
    primario: { series: 4, reps: "10–12" },
    secundario: { series: 3, reps: "12–15" },
    aislamiento: { series: 3, reps: "15" },
    descanso: "Descanso 45 s · ritmo de circuito",
  },
};

// Nivel y sexo ajustan volumen sobre la serie base (nunca tocan el rango de
// reps). Principiante entrena más liviano; avanzado sube el trabajo pesado;
// "mujer" baja un set en compuestos ("me queda muy pesado" es la queja).
function ajustarSeries(base: number, rol: Rol, nivel: Nivel, sexo: Sexo): number {
  let s = base;
  if (nivel === "principiante") s -= 1;
  if (nivel === "avanzado" && rol === "primario") s += 1;
  if (sexo === "mujer" && rol !== "aislamiento") s -= 1;
  const min = rol === "aislamiento" ? 2 : 3;
  return Math.max(min, Math.min(5, s));
}

// ─────────────────────────────────────────────────────────────
// Selección de ejercicios
// ─────────────────────────────────────────────────────────────

function nivelIdx(nivel: string | null): number {
  return NIVEL_ORDEN[(nivel as Nivel) ?? "principiante"] ?? 0;
}

// Empuja la selección hacia el tipo de ejercicio que pide cada objetivo, para
// que 4 objetivos con los mismos datos NO devuelvan la misma rutina.
function sesgoObjetivo(ej: Ejercicio, ranura: Ranura, objetivo: Objetivo): number {
  const aislado = ej.patron === "aislamiento";
  const eq = ej.equipo ?? "";
  switch (objetivo) {
    case "fuerza":
      // barra y básicos pesados en los slots de arranque; menos accesorios.
      if (ranura.rol === "primario") {
        if (eq === "barra") return 18;
        if (eq === "mancuernas") return 8;
        if (eq === "maquina" || eq === "polea") return -12;
      }
      return aislado ? -8 : 0;
    case "hipertrofia":
      // mancuerna / máquina / polea en secundarios y aislados: tensión estable.
      if (
        ranura.rol !== "primario" &&
        (eq === "mancuernas" || eq === "maquina" || eq === "polea")
      ) {
        return 8;
      }
      return 0;
    case "resistencia":
      // máquina / polea / peso corporal; evitar barra pesada en primarios.
      if (eq === "maquina" || eq === "polea" || eq === "peso_corporal") return 10;
      if (ranura.rol === "primario" && eq === "barra") return -8;
      return 0;
    case "bajar_grasa":
      // compuestos de mancuerna / peso corporal, aptos para circuito.
      if (!aislado && (eq === "mancuernas" || eq === "peso_corporal")) return 10;
      if (ranura.rol === "primario" && eq === "barra") return -4;
      return 0;
  }
  return 0;
}

function puntuar(
  ej: Ejercicio,
  ranura: Ranura,
  equipoPrefs: readonly string[],
  nivelCliente: Nivel,
  objetivo: Objetivo,
  usadosSemana: Set<string>,
  usadosDia: Set<string>,
): number {
  if (usadosDia.has(ej.id)) return -Infinity; // nunca repetir en el mismo día
  let p = 0;
  const esCompuesto = ranura.rol !== "aislamiento";
  if (ranura.patron && ej.patron === ranura.patron) p += 40;
  if (!esCompuesto && ej.patron === "aislamiento") p += 15;
  if (esCompuesto && ej.patron !== "aislamiento") {
    p += 15;
    p += EQUIPO_PESO[ej.equipo ?? ""] ?? 0;
  }
  if (equipoPrefs.length === 0 || (ej.equipo && equipoPrefs.includes(ej.equipo))) {
    p += 20;
  } else {
    p -= 25; // fuera de las preferencias: solo si no queda otra
  }
  if (nivelIdx(ej.nivel) <= NIVEL_ORDEN[nivelCliente]) p += 10;
  else p -= 15 * (nivelIdx(ej.nivel) - NIVEL_ORDEN[nivelCliente]);
  if (!usadosSemana.has(ej.id)) p += 8; // preferir variedad en la semana
  p += sesgoObjetivo(ej, ranura, objetivo);
  return p;
}

// Hash estable (FNV-1a) para derivar una elección reproducible a partir de
// `seed` + la clave del hueco.
function hashKey(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function elegir(
  ejercicios: Ejercicio[],
  ranura: Ranura,
  equipoPrefs: readonly string[],
  nivelCliente: Nivel,
  objetivo: Objetivo,
  usadosSemana: Set<string>,
  usadosDia: Set<string>,
  seed: number,
  claveSlot: string,
): Ejercicio | null {
  const rankeados = ejercicios
    .filter((e) => e.grupo_muscular === ranura.grupo && e.slug)
    .map((ej) => ({
      ej,
      p: puntuar(ej, ranura, equipoPrefs, nivelCliente, objetivo, usadosSemana, usadosDia),
    }))
    .filter((r) => Number.isFinite(r.p))
    // Desempate estable por slug para que la salida sea determinista sin seed.
    .sort((x, y) => y.p - x.p || (x.ej.slug ?? "").localeCompare(y.ej.slug ?? ""));

  if (rankeados.length === 0) return null;
  if (!seed) return rankeados[0].ej;

  // Con seed: rotar solo entre los que quedaron a ≤10 pts del mejor (hasta 3).
  // Un match fuerte de patrón (+40) nunca se pierde; sí rotan accesorios y
  // segundos compuestos, que es lo que hace que "Regenerar" se sienta nuevo.
  const tope = rankeados[0].p;
  const cerca = rankeados.filter((r) => r.p >= tope - 10).slice(0, 3);
  return cerca[hashKey(`${seed}:${claveSlot}`) % cerca.length].ej;
}

// ─────────────────────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────────────────────

export function generarPlan(
  entrada: EntradaMotor,
  ejercicios: Ejercicio[],
): PlanGenerado {
  const dias = Math.min(6, Math.max(2, Math.round(entrada.dias)));
  const sexo = entrada.sexo ?? "sin_especificar";
  const enfasis = entrada.enfasis ?? [];
  const seed = entrada.seed ?? 0;
  const objetivo = entrada.objetivo;
  const equipoPrefs = PREFERENCIAS_EQUIPO[entrada.preferencia] ?? [];
  const esquema = ESQUEMA[objetivo];
  const bloques = splitPorDias(dias);
  const usadosSemana = new Set<string>();

  const diasPlan = bloques.map((bloque, di) => {
    const usadosDia = new Set<string>();
    const items: ItemGenerado[] = [];
    const ranuras = aplicarEnfasis(
      moldearPorObjetivo(bloque.ranuras, objetivo),
      enfasis,
      sexo,
    );

    ranuras.forEach((ranura, si) => {
      const ej = elegir(
        ejercicios,
        ranura,
        equipoPrefs,
        entrada.nivel,
        objetivo,
        usadosSemana,
        usadosDia,
        seed,
        `${di}:${si}:${ranura.grupo}`,
      );
      if (!ej || !ej.slug) return;
      usadosDia.add(ej.id);
      usadosSemana.add(ej.id);

      const rx = esquema[ranura.rol];
      items.push({
        ejercicio_slug: ej.slug,
        series: ajustarSeries(rx.series, ranura.rol, entrada.nivel, sexo),
        repeticiones: rx.reps,
        nota: esquema.descanso,
      });
    });

    return { titulo: `Día ${di + 1} · ${bloque.titulo}`, items };
  });

  return { entrada: { ...entrada, dias, sexo, enfasis }, dias: diasPlan };
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
