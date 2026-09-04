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
  MOLESTIAS,
  PREFERENCIAS_EQUIPO,
  type Ejercicio,
  type Enfasis,
  type EntradaMotor,
  type Molestia,
  type Nivel,
  type Objetivo,
  type OpcionesAvanzadas,
  type PlanGenerado,
  type ItemGenerado,
  type Rango,
  type Sexo,
  type Tecnica,
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
// Un solo primario de espalda (el jalón/dominada pesado de arranque) + dos
// compuestos de apoyo. Antes tenía dos P("espalda") seguidos, que con el +1 de
// avanzado se iban a 5+5 series de espalda antes de los accesorios — volumen
// excesivo para una sola sesión, sobre todo en PPL de 6 días (frecuencia 2).
const PULL: Ranura[] = [
  P("espalda", "traccion_vertical"),
  S("espalda", "traccion_horizontal"),
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

// Avanzado nunca hace full body puro: el volumen semanal por grupo que tolera
// sin fatiga excesiva no entra en sesiones de cuerpo completo (Schoenfeld et
// al., ACSM). Desde 2 días va Upper/Lower; 5–6 pasa a Push/Pull/Legs.
function splitAvanzado(dias: number): Bloque[] {
  const UP: Bloque = { titulo: "Tren superior", ranuras: TORSO };
  const LO: Bloque = { titulo: "Tren inferior", ranuras: PIERNA };
  switch (dias) {
    case 2:
      return [UP, LO];
    case 3:
      return [UP, LO, UP];
    case 4:
      return [UP, LO, UP, LO];
    case 5:
      return [
        { titulo: "Empuje", ranuras: PUSH },
        { titulo: "Tracción", ranuras: PULL },
        { titulo: "Pierna", ranuras: LEGS },
        { titulo: "Empuje", ranuras: PUSH },
        { titulo: "Tracción", ranuras: PULL },
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

// El tipo de split depende del nivel, no solo de los días: principiante e
// intermedio toleran full body en 2–4 días; avanzado se deriva a splitAvanzado.
function splitPorDias(dias: number, nivel: Nivel): Bloque[] {
  if (nivel === "avanzado") return splitAvanzado(dias);
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

// Modo avanzado: el cliente fuerza el split en vez de derivarlo de días+nivel.
// Reusa los mismos arrays de ranuras. La validación días/split la hace el form;
// acá es permisivo (si algo no cierra, cae de nuevo en splitPorDias).
function splitExplicito(
  split: OpcionesAvanzadas["split"],
  dias: number,
): Bloque[] {
  const B = (titulo: string, ranuras: Ranura[]): Bloque => ({ titulo, ranuras });
  switch (split) {
    case "full_body": {
      const arr = [FULL_BODY_A, FULL_BODY_B, FULL_BODY_C];
      return Array.from({ length: dias }, (_, i) =>
        B(`Cuerpo completo ${String.fromCharCode(65 + (i % 3))}`, arr[i % 3]),
      );
    }
    case "upper_lower":
      return Array.from({ length: dias }, (_, i) =>
        i % 2 === 0
          ? B("Tren superior", TORSO)
          : B("Tren inferior", PIERNA),
      );
    case "push_pull_legs": {
      const seq = [B("Empuje", PUSH), B("Tracción", PULL), B("Pierna", LEGS)];
      return Array.from({ length: dias }, (_, i) => seq[i % 3]);
    }
    case "torso_pierna":
      return Array.from({ length: dias }, (_, i) =>
        i % 2 === 0 ? B("Torso", TORSO) : B("Pierna", PIERNA),
      );
    default:
      return [];
  }
}

// El objetivo también moldea la sesión, no solo el rango de reps:
// - fuerza / bajar grasa: pocas accesorias (máx. 2), sesión corta y pesada de
//   compuestos multiarticulares. "Bajar grasa" NO es una rutina liviana de
//   "marcar": entrena como fuerza/hipertrofia para retener masa muscular en
//   déficit (Longland et al. 2016; Helms et al. 2014). El déficit calórico lo
//   hace la dieta, no el rango de reps.
// - resistencia / tonificar: garantiza core al cierre.
// - hipertrofia: se deja como viene.
function moldearPorObjetivo(ranuras: Ranura[], objetivo: Objetivo): Ranura[] {
  if (objetivo === "fuerza" || objetivo === "bajar_grasa") {
    const compuestos = ranuras.filter((r) => r.rol !== "aislamiento");
    const accesorias = ranuras.filter((r) => r.rol === "aislamiento").slice(0, 2);
    return [...compuestos, ...accesorias];
  }
  if (objetivo === "resistencia" || objetivo === "tonificar") {
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

// ── Fase 3 · Intercambio por énfasis (presupuesto cerrado) ──
// NO agrega ranuras. Hace un TRUEQUE: convierte ranuras de músculos secundarios
// del día (nunca un primario) en ranuras del músculo enfatizado. Como la
// cantidad total de ranuras del día no cambia, el presupuesto de series de la
// Fase 2 se mantiene idéntico. Mujer sin zona elegida → glúteos por defecto,
// también por trueque. Hasta 2 trueques por día: 2 si hay una sola zona, 1 por
// zona si hay dos.
//
// Afinidad de día: en un split DIVIDIDO (upper/lower, PPL, torso/pierna) sólo se
// refuerza la zona en los días que ya la entrenan — así el énfasis de pecho no
// se cuela en el día de pierna. En FULL BODY se aplica siempre (no hay día
// dedicado a un grupo puntual).
function elegirDonante(out: Ranura[], gruposEnfasis: Set<string>): number {
  const cand = out
    .map((r, i) => ({ r, i }))
    .filter((x) => x.r.rol !== "primario" && !gruposEnfasis.has(x.r.grupo));
  if (cand.length === 0) return -1;
  // Preferir un grupo que ese día tenga más de una ranura (no dejar un músculo
  // en cero si se puede evitar); si no hay, cae en cualquier ranura secundaria.
  const conSobra = cand.filter(
    (x) => out.filter((y) => y.grupo === x.r.grupo).length > 1,
  );
  const pool = conSobra.length > 0 ? conSobra : cand;
  return pool[pool.length - 1].i; // la última: preserva los apoyos tempranos
}

function intercambiarPorEnfasis(
  ranuras: Ranura[],
  enfasis: Enfasis[],
  sexo: Sexo,
  esFullBody: boolean,
): Ranura[] {
  const zonas: Enfasis[] =
    enfasis.length > 0 ? enfasis : sexo === "mujer" ? ["gluteos"] : [];
  if (zonas.length === 0) return ranuras;

  const out = [...ranuras];
  const gruposBase = new Set(ranuras.map((r) => r.grupo));
  const gruposEnfasis = new Set(zonas.flatMap((z) => ENFASIS_GRUPOS[z]));
  const trueques = zonas.length === 1 ? 2 : 1;

  for (const zona of zonas) {
    const gruposZona = ENFASIS_GRUPOS[zona];
    // Afinidad de día: en split dividido, sólo si el día ya entrena la zona.
    if (!esFullBody && !gruposZona.some((g) => gruposBase.has(g))) continue;
    // Apuntar a un grupo real de la zona que el día ya toque; si no, el primero.
    const grupoObjetivo =
      gruposZona.find((g) => gruposBase.has(g)) ?? gruposZona[0];
    const patron = PATRON_ENFASIS[grupoObjetivo];
    for (let t = 0; t < trueques; t++) {
      const donante = elegirDonante(out, gruposEnfasis);
      if (donante === -1) break;
      out[donante] = {
        grupo: grupoObjetivo,
        patron,
        rol: patron ? "secundario" : "aislamiento",
      };
    }
  }
  return out;
}

// Los ejercicios de las zonas que el cliente pidió priorizar van primero en la
// sesión: más fuerza/energía disponible al inicio (Simão et al., ACSM — orden
// de ejercicios por prioridad). Partición estable: dentro de cada grupo se
// mantiene el orden previo (compuestos antes que aislamiento, etc.).
function priorizarEnfasis(ranuras: Ranura[], enfasis: Enfasis[]): Ranura[] {
  if (enfasis.length === 0) return ranuras;
  const grupos = new Set(enfasis.flatMap((z) => ENFASIS_GRUPOS[z]));
  return [
    ...ranuras.filter((r) => grupos.has(r.grupo)),
    ...ranuras.filter((r) => !grupos.has(r.grupo)),
  ];
}

// Modo avanzado, orden = "prefatiga_zona": dentro de las ranuras de las zonas de
// énfasis, el aislamiento va antes del compuesto (pre-fatiga del músculo objetivo
// antes del básico). Solo reordena dentro de esos grupos; el resto queda igual.
// Simão et al. 2012: el orden define qué recibe más volumen efectivo.
function aplicarPrefatiga(ranuras: Ranura[], enfasis: Enfasis[]): Ranura[] {
  if (enfasis.length === 0) return ranuras;
  const grupos = new Set(enfasis.flatMap((z) => ENFASIS_GRUPOS[z]));
  const rango = ranuras
    .map((r, i) => ({ r, i }))
    .filter((x) => grupos.has(x.r.grupo));
  if (rango.length < 2) return ranuras;
  const orden = [...rango].sort((a, b) => {
    const pa = a.r.rol === "aislamiento" ? 0 : 1;
    const pb = b.r.rol === "aislamiento" ? 0 : 1;
    return pa - pb || a.i - b.i;
  });
  const out = [...ranuras];
  rango.forEach((slot, k) => {
    out[slot.i] = orden[k].r;
  });
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
  // Fuerza = cargas altas, rango estricto 1–5 reps en todos los roles. El
  // objetivo es la adaptación neural (reclutamiento, sincronización de unidades
  // motoras, tasa de desarrollo de fuerza), no el daño muscular. Descanso largo
  // 2–3 min para recuperar el fosfágeno entre series pesadas (ACSM position
  // stand 2009; Schoenfeld et al. 2021, rep-range meta-analysis: <6 reps es lo
  // óptimo para fuerza máxima).
  fuerza: {
    primario: { series: 5, reps: "3–5" },
    secundario: { series: 4, reps: "5" },
    aislamiento: { series: 3, reps: "5" },
    descanso: "Descanso 2–3 min",
  },
  // Hipertrofia clásica = volumen a intensidad media, rango 6–12 reps. El
  // primario pesa 4 y secundario/aislamiento 3 en el reparto de series (peso de
  // rol, Fase 4): así el día no sale todo con el mismo número y el básico se
  // lleva algo más de trabajo. 6–8 en el compuesto para carga alta, 8–12 en el
  // resto para acumular estímulo (Schoenfeld et al. 2017, meta-analysis: la
  // hipertrofia es similar en 6–20 reps si el volumen y el esfuerzo se igualan;
  // 6–12 concentra estímulo mecánico y metabólico). Descanso 90–120 s
  // (Schoenfeld et al. 2016, "Longer inter-set rest periods enhance muscle
  // strength and hypertrophy").
  hipertrofia: {
    primario: { series: 4, reps: "6–8" },
    secundario: { series: 3, reps: "8–12" },
    aislamiento: { series: 3, reps: "10–12" },
    descanso: "Descanso 90–120 s",
  },
  // Tonificar / marcar: hipertrofia liviana + densidad. Reps altas y descanso
  // corto, sin las series pesadas de "masa muscular". La palabra que usa mucha
  // gente para "bajar algo de grasa y dar forma".
  tonificar: {
    primario: { series: 3, reps: "10–12" },
    secundario: { series: 3, reps: "12–15" },
    aislamiento: { series: 3, reps: "15" },
    descanso: "Descanso 45–60 s",
  },
  // Resistencia muscular = estrés metabólico, rango 15–20+ reps. Descanso muy
  // corto para acumular fatiga local (ACSM 2009: >15 reps y <30–60 s de pausa
  // mejoran la resistencia muscular localizada).
  resistencia: {
    primario: { series: 3, reps: "15–20" },
    secundario: { series: 3, reps: "15–20" },
    aislamiento: { series: 2, reps: "20+" },
    descanso: "Descanso 30–45 s",
  },
  // Bajar grasa: se entrena IGUAL que fuerza/hipertrofia, NO con circuitos
  // livianos de 20+ reps. En déficit calórico el entrenamiento pesado de
  // compuestos multiarticulares es la señal que retiene masa muscular; la
  // pérdida de grasa la genera la dieta, no el rango de reps ni el "ritmo de
  // circuito" (Longland et al. 2016; Helms et al. 2014; Murphy & Koehler 2022).
  // Rango 6–8 en el primario (carga alta), 8–12 en el resto, descanso completo.
  bajar_grasa: {
    primario: { series: 4, reps: "6–8" },
    secundario: { series: 4, reps: "8–10" },
    aislamiento: { series: 2, reps: "10–12" },
    descanso: "Descanso 2–3 min",
  },
};

// ── Modo avanzado: esquemas de reps alternativos (SPEC §2.2) ──
// Cada `rango` define un EsquemaObj completo, independiente del objetivo. Todos
// los rangos de reps salen de REPS_OPCIONES (menús del editor).
const ESQUEMA_RANGO: Record<
  "fuerza_hipertrofia" | "hipertrofia" | "metabolico",
  EsquemaObj
> = {
  fuerza_hipertrofia: {
    primario: { series: 4, reps: "6–8" },
    secundario: { series: 3, reps: "8–10" },
    aislamiento: { series: 3, reps: "10–12" },
    descanso: "Descanso 2–3 min",
  },
  hipertrofia: {
    primario: { series: 4, reps: "6–8" },
    secundario: { series: 3, reps: "8–12" },
    aislamiento: { series: 3, reps: "10–12" },
    descanso: "Descanso 90–120 s",
  },
  metabolico: {
    primario: { series: 3, reps: "15–20" },
    secundario: { series: 3, reps: "15–20" },
    aislamiento: { series: 2, reps: "20+" },
    descanso: "Descanso 30–45 s",
  },
};

// Periodización ondulante diaria (DUP): el rango rota PESADO → LIVIANO → MEDIO
// según el índice de día (Rhea et al. 2002; Zourdos et al. 2016). El día liviano
// va segundo a propósito: intercalado entre los dos días de más carga, sirve de
// recuperación activa (irrigar la zona, bajar la fatiga del sistema nervioso)
// sin frenar el estímulo. Evita que se acumulen dos sesiones pesadas seguidas.
// Día 1 pesado (~5 reps) · Día 2 liviano (~15 reps) · Día 3 medio (~10 reps).
const ESQUEMA_ONDULANTE: EsquemaObj[] = [
  {
    primario: { series: 5, reps: "3–5" },
    secundario: { series: 4, reps: "5" },
    aislamiento: { series: 3, reps: "6–8" },
    descanso: "Día pesado · Descanso 2–3 min",
  },
  {
    primario: { series: 3, reps: "15–20" },
    secundario: { series: 3, reps: "15–20" },
    aislamiento: { series: 2, reps: "20+" },
    descanso: "Día liviano · Descanso 45–60 s · irriga la zona y baja la fatiga",
  },
  {
    primario: { series: 4, reps: "8–10" },
    secundario: { series: 3, reps: "10–12" },
    aislamiento: { series: 3, reps: "10–12" },
    descanso: "Día medio · Descanso 90–120 s",
  },
];

function resolverEsquema(
  objetivo: Objetivo,
  avanzado: OpcionesAvanzadas | undefined,
  diaIdx: number,
): EsquemaObj {
  const rango: Rango = avanzado?.rango ?? "estandar";
  if (rango === "estandar") return ESQUEMA[objetivo];
  if (rango === "ondulante") {
    return ESQUEMA_ONDULANTE[diaIdx % ESQUEMA_ONDULANTE.length];
  }
  return ESQUEMA_RANGO[rango];
}

// Texto de RIR que se anexa a la nota de cada ítem (SPEC §2.4). No toca
// series/reps. Grgic et al. 2022.
function notaRir(rir: OpcionesAvanzadas["rir"], rol: Rol): string {
  if (rir === "2-3") return " · Dejá 2–3 repeticiones en reserva";
  if (rir === "1-2") return " · Dejá 1–2 repeticiones en reserva";
  return rol === "primario"
    ? " · Cerca del fallo, sin perder técnica"
    : " · Última serie al fallo";
}

// ── Fase 2 · Presupuesto cerrado de series por día ──
// Techo TOTAL de series del día (no por ranura). Reemplaza al viejo modelo
// aditivo (6 ranuras base + hasta 3 extra de énfasis, cada una 3-5 series, que
// se disparaba a 30-40 series/día). Ahora el día tiene un total fijo por nivel
// y todo lo demás se reparte dentro de ese techo.
const PRESUPUESTO_DIA: Record<Nivel, number> = {
  principiante: 18,
  intermedio: 21,
  avanzado: 24,
};

// Modo avanzado: el volumen semanal elegido escala el presupuesto del día.
// Sin avanzado → factor 1 (estándar).
const FACTOR_VOLUMEN: Record<string, number> = {
  mev: 0.85,
  estandar: 1,
  mav: 1.15,
};

// Fase 2 · ajustarPorSexo: la clienta mujer baja 1 serie por ranura (compuestos
// y aislamientos). Se aplica sobre el TOTAL del día, no ranura por ranura, para
// que el techo quede cerrado antes de repartir. Piso: 2 series por ranura.
function ajustarPorSexo(total: number, sexo: Sexo, nRanuras: number): number {
  const t = sexo === "mujer" ? total - nRanuras : total;
  return Math.max(2 * nRanuras, t);
}

// Fase 4 · Reparte un total FIJO de series entre las ranuras del día, en
// proporción al peso de cada rol (primario > secundario > aislamiento), con
// piso 2 y techo 5 por ranura. La suma resultante es exactamente `presupuesto`
// (recortado a [2·n, 5·n]). No depende de `seed`: el desempate es por orden de
// ranura, así que sin seed la salida sigue siendo determinista.
function repartirSeries(
  roles: Rol[],
  presupuesto: number,
  peso: Record<Rol, number>,
): number[] {
  const n = roles.length;
  if (n === 0) return [];
  const MIN = 2;
  const MAX = 5;
  const objetivo = Math.max(MIN * n, Math.min(MAX * n, presupuesto));
  const sumaPeso = roles.reduce((s, r) => s + (peso[r] || 1), 0);
  const series = roles.map((r) =>
    Math.max(
      MIN,
      Math.min(MAX, Math.round(((peso[r] || 1) / sumaPeso) * objetivo)),
    ),
  );
  // Ajuste fino: sumar/restar de a 1 hasta cuadrar con `objetivo`, tocando
  // primero los roles más pesados al sumar y los más livianos al restar.
  const porPesoDesc = [...series.keys()].sort(
    (a, b) => (peso[roles[b]] || 1) - (peso[roles[a]] || 1) || a - b,
  );
  let diff = objetivo - series.reduce((a, b) => a + b, 0);
  let guarda = 0;
  while (diff !== 0 && guarda++ < 100) {
    const orden = diff > 0 ? porPesoDesc : [...porPesoDesc].reverse();
    let movido = false;
    for (const i of orden) {
      if (diff > 0 && series[i] < MAX) {
        series[i]++;
        diff--;
        movido = true;
      } else if (diff < 0 && series[i] > MIN) {
        series[i]--;
        diff++;
        movido = true;
      }
      if (diff === 0) break;
    }
    if (!movido) break;
  }
  return series;
}

// ─────────────────────────────────────────────────────────────
// Selección de ejercicios
// ─────────────────────────────────────────────────────────────

function nivelIdx(nivel: string | null): number {
  return NIVEL_ORDEN[(nivel as Nivel) ?? "principiante"] ?? 0;
}

// ── Tier 1 · Hardware de gama alta ──
// Movimientos con la mejor relación estímulo/fatiga y curva de carga (tensión
// mecánica, Schoenfeld). Cuando el equipo del cliente los permite, ganan por
// puntaje sobre cualquier otra opción del mismo grupo — así el primario/
// secundario del día cae en un básico probado y no en un accesorio flojo.
// Se identifican por slug (exacto, sin ambigüedad de acentos/nombres).
const TIER_1 = new Set<string>([
  // Pecho
  "press-inclinado-mancuernas",
  "press-pecho-maquina",
  "press-banca-barra",
  // Espalda
  "dominadas",
  "jalon-al-pecho",
  "remo-maquina",
  // Cuádriceps
  "prensa-piernas",
  "sentadilla-bulgara",
  // Glúteo / Isquios
  "peso-muerto-rumano",
  "peso-muerto-rumano-mancuernas",
  "rdl-unilateral-mancuerna",
  "hip-thrust",
  "hip-thrust-barra",
  // Hombro
  "press-hombro-maquina",
  "press-hombro-mancuernas",
  "elevaciones-laterales",
  // Brazos
  "curl-mancuernas",
  "press-frances",
]);

const BONUS_TIER_1 = 30; // supera cualquier match de patrón + equipo del grupo.

// ── Firewall · Prevención de fatiga axial (cuello de botella del SNC) ──
// Ejercicios de demanda axial extrema (columna comprimida bajo carga libre):
// sentadilla, peso muerto convencional, RDL con barra, buenos días. Una vez que
// entra uno de estos en el día, el resto de compuestos de pierna/espalda pasan a
// versión estabilizada (máquina/polea/unilateral) para no encadenar dos lifts
// que frían el sistema nervioso central.
const SLUGS_AXIALES = new Set<string>([
  "sentadilla-barra",
  "peso-muerto-barra",
  "peso-muerto-rumano",
  "buenos-dias",
  "remo-barra",
]);

function esAxialPesado(ej: Ejercicio): boolean {
  return SLUGS_AXIALES.has(ej.slug ?? "");
}

// Grupos que comparten el eje axial (piernas + espalda). Sólo entre estos se
// aplica el bloqueo del segundo compuesto de carga libre.
const GRUPOS_AXIALES = new Set([
  "cuadriceps",
  "isquios",
  "gluteos",
  "espalda",
]);

// Un compuesto de carga libre pesada: barra, patrón compuesto, sobre un grupo
// axial. Es lo que se prohíbe como SEGUNDO lift del día tras un axial.
function esCompuestoLibrePesado(ej: Ejercicio): boolean {
  return (
    (ej.equipo ?? "") === "barra" &&
    ej.patron !== "aislamiento" &&
    GRUPOS_AXIALES.has(ej.grupo_muscular ?? "")
  );
}

// ── Firewall · Orden de booteo estricto ──
// Un aislamiento nunca precede a un compuesto (destruye la producción de fuerza
// posterior). Orden por rol: primario → secundario → aislamiento → core al
// cierre. Estable: preserva el orden previo (incluida la priorización de
// énfasis) dentro de cada nivel. Excepción documentada: prefatiga_zona (avanzado)
// pide deliberadamente aislar antes del compuesto en la zona de énfasis.
function rangoRol(r: Ranura): number {
  if (r.grupo === "core") return 4;
  if (r.rol === "primario") return 1;
  if (r.rol === "secundario") return 2;
  return 3; // aislamiento
}

function ordenarBooteo(ranuras: Ranura[]): Ranura[] {
  return ranuras
    .map((r, i) => ({ r, i }))
    .sort((a, b) => rangoRol(a.r) - rangoRol(b.r) || a.i - b.i)
    .map((x) => x.r);
}

// Consolidación de volumen: tope de ejercicios DISTINTOS por grupo muscular en
// una misma sesión. Más allá de esto es "volumen basura por dispersión" (Helms):
// mejor sumar series a un movimiento probado que agregar un 4º ejercicio del
// mismo grupo. Al llegar al tope, la ranura reusa un ejercicio ya elegido del
// grupo (concentra series) en vez de estrenar uno nuevo.
const MAX_DISTINTOS_POR_GRUPO = 3;

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
      // barra en el primario: más carga absoluta para el estímulo de arranque
      // (rompe el empate alfabético que hacía salir mancuerna).
      if (ranura.rol === "primario" && eq === "barra") return 6;
      // mancuerna / máquina / polea en secundarios y aislados: tensión estable.
      if (
        ranura.rol !== "primario" &&
        (eq === "mancuernas" || eq === "maquina" || eq === "polea")
      ) {
        return 8;
      }
      return 0;
    case "tonificar":
      // como hipertrofia pero con leve preferencia por compuestos de pie /
      // unilaterales y accesorios en polea / máquina.
      if (ranura.rol !== "primario" && (eq === "maquina" || eq === "polea")) {
        return 8;
      }
      if (!aislado && (eq === "mancuernas" || eq === "peso_corporal")) return 4;
      return 0;
    case "resistencia":
      // máquina / polea / peso corporal; evitar barra pesada en primarios.
      if (eq === "maquina" || eq === "polea" || eq === "peso_corporal") return 10;
      if (ranura.rol === "primario" && eq === "barra") return -8;
      return 0;
    case "bajar_grasa":
      // Igual que fuerza: básicos pesados multiarticulares de barra en el
      // arranque, penalizar accesorios. La señal a la placa madre es "necesito
      // este músculo para mover cargas altas" → lo retiene en déficit. Nada de
      // circuitos livianos.
      if (ranura.rol === "primario") {
        if (eq === "barra") return 18;
        if (eq === "mancuernas") return 8;
        if (eq === "maquina" || eq === "polea") return -12;
      }
      return aislado ? -8 : 0;
  }
  return 0;
}

// Sesgo automático para clientes con sexo = "mujer" (SPEC §8.1). Empujón chico,
// del mismo orden que sesgoObjetivo. Es un sesgo de puntaje, NO un filtro:
// ningún ejercicio queda excluido, y un hombre nunca pasa por acá.
// Preferencia de práctica y adherencia; la respuesta al entrenamiento no
// difiere por sexo (Roberts et al. 2020).
const GRUPOS_CADERA = new Set(["gluteos", "isquios"]);

function sesgoSexo(ej: Ejercicio, ranura: Ranura, sexo: Sexo): number {
  if (sexo !== "mujer") return 0;
  const eq = ej.equipo ?? "";
  let p = 0;
  // Cadera / glúteo / isquios en cualquier rol.
  if (GRUPOS_CADERA.has(ej.grupo_muscular ?? "")) p += 6;
  if (ej.patron === "dominante_cadera") p += 4;
  // Accesorios en polea / máquina: fáciles de dosificar, tensión constante.
  if (ranura.rol !== "primario" && (eq === "maquina" || eq === "polea")) p += 4;
  // En el primario del día de empuje, no penaliza barra pero la iguala con
  // mancuerna / máquina (deja de ganar solo por EQUIPO_PESO).
  if (ranura.rol === "primario" && (eq === "mancuernas" || eq === "maquina")) {
    p += 2;
  }
  return p;
}

// Sustitución por molestia (SPEC §7.2). Cada molestia descarta patrones/equipos
// que suelen provocar dolor en esa articulación. Conservador y por patrón, no
// por nombre. Si tras el recorte no queda candidato para la ranura, `elegir`
// ignora el filtro para ese hueco.
const MOLESTIA_BLOQUEA: Record<Molestia, (ej: Ejercicio) => boolean> = {
  hombro: (e) =>
    (e.patron === "empuje_vertical" && e.equipo === "barra") ||
    (e.grupo_muscular === "pecho" && e.patron === "aislamiento"), // aperturas
  rodilla: (e) =>
    (e.patron === "dominante_rodilla" && e.equipo === "barra") ||
    (e.grupo_muscular === "cuadriceps" && e.patron === "aislamiento"),
  lumbar: (e) =>
    e.patron === "dominante_cadera" && e.equipo === "barra",
  muñeca: (e) =>
    (e.grupo_muscular === "biceps" && e.equipo === "barra") ||
    (e.patron === "empuje_horizontal" && e.equipo === "barra"),
  codo: (e) =>
    (e.grupo_muscular === "triceps" && e.equipo === "barra") ||
    (e.patron === "empuje_vertical" && e.equipo === "barra"),
};

export function estaBloqueado(ej: Ejercicio, evitar: readonly Molestia[]): boolean {
  return evitar.some((m) => MOLESTIA_BLOQUEA[m](ej));
}

function puntuar(
  ej: Ejercicio,
  ranura: Ranura,
  equipoPrefs: readonly string[],
  nivelCliente: Nivel,
  objetivo: Objetivo,
  sexo: Sexo,
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
  // Tier 1: sólo empuja compuestos (primario/secundario) hacia los básicos de
  // gama alta. En aislamientos no aplica (elevaciones/curl ya compiten por
  // patrón), salvo que el propio movimiento premium sea un aislamiento del grupo.
  if (esCompuesto && ej.slug && TIER_1.has(ej.slug)) p += BONUS_TIER_1;
  p += sesgoObjetivo(ej, ranura, objetivo);
  p += sesgoSexo(ej, ranura, sexo);
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
  sexo: Sexo,
  evitar: readonly Molestia[],
  usadosSemana: Set<string>,
  usadosDia: Set<string>,
  seed: number,
  claveSlot: string,
  evitarAxial: boolean,
): Ejercicio | null {
  const todos = ejercicios
    .filter((e) => e.grupo_muscular === ranura.grupo && e.slug)
    .map((ej) => ({
      ej,
      p: puntuar(
        ej,
        ranura,
        equipoPrefs,
        nivelCliente,
        objetivo,
        sexo,
        usadosSemana,
        usadosDia,
      ),
    }))
    .filter((r) => Number.isFinite(r.p))
    // Desempate estable por slug para que la salida sea determinista sin seed.
    .sort((x, y) => y.p - x.p || (x.ej.slug ?? "").localeCompare(y.ej.slug ?? ""));

  // Sustitución por molestia: sacar los bloqueados; si eso vacía el hueco,
  // ignorar el filtro para esta ranura (mejor subóptimo que un día incompleto).
  const filtrados =
    evitar.length > 0 ? todos.filter((r) => !estaBloqueado(r.ej, evitar)) : todos;
  // Firewall axial: si ya entró un lift axial pesado en el día, este compuesto
  // de pierna/espalda no puede ser otra barra libre pesada → forzar versión
  // estabilizada. Si eso vacía el hueco, se ignora (nunca dejar la ranura sin
  // ejercicio).
  const sinAxial = evitarAxial
    ? filtrados.filter((r) => !esCompuestoLibrePesado(r.ej))
    : filtrados;
  const conFiltros = sinAxial.length > 0 ? sinAxial : filtrados;
  const rankeados = conFiltros.length > 0 ? conFiltros : todos;

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
  const avanzado = entrada.avanzado;
  const equipoPrefs = PREFERENCIAS_EQUIPO[entrada.preferencia] ?? [];
  // El form de generación ("Evitar dolor en", todos los niveles) y los ajustes
  // avanzados ("Molestias a evitar", solo avanzado) alimentan el MISMO filtro
  // estaBloqueado(). Se normalizan, fusionan y deduplican antes de la selección.
  const zonasDolor = (entrada.zonasDolor ?? []).filter(
    (z): z is Molestia => (MOLESTIAS as readonly string[]).includes(z),
  );
  const evitar: Molestia[] = [
    ...new Set<Molestia>([...(avanzado?.evitar ?? []), ...zonasDolor]),
  ];

  // Fase 2: factor de volumen (solo avanzado) que escala el presupuesto cerrado
  // de series por día. Sin avanzado → 1.
  const factorVol = FACTOR_VOLUMEN[avanzado?.volumen ?? "estandar"] ?? 1;

  // Split: explícito si el avanzado lo pidió y la combinación cierra; si no,
  // el automático de siempre.
  const explicito =
    avanzado && avanzado.split !== "auto"
      ? splitExplicito(avanzado.split, dias)
      : [];
  const bloques =
    explicito.length > 0 ? explicito : splitPorDias(dias, entrada.nivel);

  const usadosSemana = new Set<string>();

  const diasPlan = bloques.map((bloque, di) => {
    const usadosDia = new Set<string>();
    const items: ItemGenerado[] = [];
    const rolItems: Rol[] = [];
    const esquema = resolverEsquema(objetivo, avanzado, di);
    const esFullBody = bloque.titulo.startsWith("Cuerpo completo");

    // ── Fase 1 · Esqueleto: qué músculos entrena el día, sin series todavía. ──
    const esqueleto = moldearPorObjetivo(bloque.ranuras, objetivo);

    // ── Fase 2 · Presupuesto cerrado: techo fijo de series del día (nivel ×
    //    volumen, con ajustarPorSexo). Inamovible: el trueque de Fase 3 no
    //    cambia la cantidad de ranuras y la Fase 4 sólo reparte dentro. ──
    const presupuesto = ajustarPorSexo(
      Math.round(PRESUPUESTO_DIA[entrada.nivel] * factorVol),
      sexo,
      esqueleto.length,
    );

    // ── Fase 3 · Trueque por énfasis: redirige ranuras secundarias a la zona
    //    enfatizada, SIN agregar ni quitar ranuras (presupuesto intacto). ──
    let ranuras = priorizarEnfasis(
      intercambiarPorEnfasis(esqueleto, enfasis, sexo, esFullBody),
      enfasis,
    );
    // Firewall A · orden de booteo: compuestos antes que aislamientos, core al
    // cierre. Excepción: prefatiga_zona (avanzado) pide aislar antes a propósito.
    if (avanzado?.orden === "prefatiga_zona") {
      ranuras = aplicarPrefatiga(ranuras, enfasis);
    } else {
      ranuras = ordenarBooteo(ranuras);
    }

    // ── Fase 4 · Selección: reparte el presupuesto entre las ranuras y llena
    //    cada una con un ejercicio real (objetivo + equipo + molestias). ──
    const seriesPorRanura = repartirSeries(
      ranuras.map((r) => r.rol),
      presupuesto,
      {
        primario: esquema.primario.series,
        secundario: esquema.secundario.series,
        aislamiento: esquema.aislamiento.series,
      },
    );

    // Firewall B/C: rastreo por día para el bloqueo axial (¿ya entró un lift de
    // columna comprimida?) y para la consolidación de volumen (cuántos
    // ejercicios distintos lleva cada grupo, y con qué slug e ítem).
    let axialUsadoDia = false;
    const distintosPorGrupo = new Map<string, number>();
    const slugPorGrupo = new Map<string, string>(); // grupo → primer slug elegido
    const itemPorSlug = new Map<string, ItemGenerado>();

    ranuras.forEach((ranura, si) => {
      const yaEnGrupo = distintosPorGrupo.get(ranura.grupo) ?? 0;

      // Firewall C · consolidación: si el grupo ya llegó al tope de ejercicios
      // distintos, esta ranura NO estrena un 4º movimiento: suma sus series al
      // ejercicio ya elegido para el grupo (concentra volumen, evita dispersión).
      if (yaEnGrupo >= MAX_DISTINTOS_POR_GRUPO) {
        const slug = slugPorGrupo.get(ranura.grupo);
        const prev = slug ? itemPorSlug.get(slug) : undefined;
        if (prev) {
          prev.series = Math.min(6, prev.series + seriesPorRanura[si]);
          return;
        }
      }

      // Firewall B · fatiga axial: este compuesto de pierna/espalda debe ser
      // estabilizado si ya hubo un lift axial pesado en el día.
      const evitarAxial =
        axialUsadoDia &&
        ranura.rol !== "aislamiento" &&
        GRUPOS_AXIALES.has(ranura.grupo);

      const ej = elegir(
        ejercicios,
        ranura,
        equipoPrefs,
        entrada.nivel,
        objetivo,
        sexo,
        evitar,
        usadosSemana,
        usadosDia,
        seed,
        `${di}:${si}:${ranura.grupo}`,
        evitarAxial,
      );
      if (!ej || !ej.slug) return;
      usadosDia.add(ej.id);
      usadosSemana.add(ej.id);
      if (esAxialPesado(ej)) axialUsadoDia = true;
      distintosPorGrupo.set(ranura.grupo, yaEnGrupo + 1);
      if (!slugPorGrupo.has(ranura.grupo)) slugPorGrupo.set(ranura.grupo, ej.slug);

      const nota = avanzado
        ? esquema.descanso + notaRir(avanzado.rir, ranura.rol)
        : esquema.descanso;
      const item: ItemGenerado = {
        ejercicio_slug: ej.slug,
        series: seriesPorRanura[si],
        repeticiones: esquema[ranura.rol].reps,
        nota,
      };
      itemPorSlug.set(ej.slug, item);
      items.push(item);
      rolItems.push(ranura.rol);
    });

    // Técnica de intensidad en la última serie de los últimos 1–2 aislamientos.
    const tec = avanzado?.tecnicaAislamientos ?? "ninguna";
    if (tec !== "ninguna") {
      const aisl = rolItems
        .map((r, i) => (r === "aislamiento" ? i : -1))
        .filter((i) => i >= 0)
        .slice(-2);
      for (const i of aisl) items[i].tecnica = tec as Tecnica;
    }

    return { titulo: `Día ${di + 1} · ${bloque.titulo}`, items };
  });

  return {
    entrada: { ...entrada, dias, sexo, enfasis, zonasDolor },
    dias: diasPlan,
  };
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
