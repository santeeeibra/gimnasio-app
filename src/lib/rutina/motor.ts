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
  VOLUMEN_PARAMS,
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
// - fuerza: pocas accesorias (máx. 2), sesión corta y pesada.
// - resistencia / bajar grasa / tonificar: garantiza core al cierre.
// - hipertrofia: se deja como viene.
function moldearPorObjetivo(ranuras: Ranura[], objetivo: Objetivo): Ranura[] {
  if (objetivo === "fuerza") {
    const compuestos = ranuras.filter((r) => r.rol !== "aislamiento");
    const accesorias = ranuras.filter((r) => r.rol === "aislamiento").slice(0, 2);
    return [...compuestos, ...accesorias];
  }
  if (
    objetivo === "resistencia" ||
    objetivo === "bajar_grasa" ||
    objetivo === "tonificar"
  ) {
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
//
// En splits DIVIDIDOS (upper/lower, PPL, torso/pierna) cada zona ya tiene su
// propio día, así que el refuerzo solo cae en los días que efectivamente
// entrenan esa zona: sin esto, un día de tren superior terminaba con ejercicios
// de pierna que no correspondían. En FULL BODY no hay día dedicado a cada zona,
// así que el énfasis puede caer en cualquiera de los días (comportamiento de
// siempre).
function aplicarEnfasis(
  ranuras: Ranura[],
  enfasis: Enfasis[],
  sexo: Sexo,
  esFullBody: boolean,
  extras = 3,
  maxDia = 8,
): Ranura[] {
  const zonas: Enfasis[] =
    enfasis.length > 0 ? enfasis : sexo === "mujer" ? ["gluteos"] : [];
  if (zonas.length === 0) return ranuras;

  const out = [...ranuras];
  const gruposBase = new Set(ranuras.map((r) => r.grupo));

  // El presupuesto de ranuras extra (3) se reparte en partes iguales entre las
  // zonas elegidas: cada zona recibe la misma cuota, sin importar el orden de
  // inserción ni cuántas ranuras base ya tenga. División impar → el sobrante se
  // descarta (no se prioriza una zona). Si después falta un ejercicio en la
  // base para una zona, `elegir` la deja sin ese item y la otra no lo compensa.
  const cuota = Math.floor(extras / zonas.length);

  for (const zona of zonas) {
    // Split dividido: solo reforzamos la zona si el día ya la entrena; si no,
    // esa zona recibe su volumen en su propio día del split.
    const grupos = esFullBody
      ? ENFASIS_GRUPOS[zona]
      : ENFASIS_GRUPOS[zona].filter((g) => gruposBase.has(g));
    if (grupos.length === 0) continue;
    const porGrupo = new Map<string, number>();
    for (let i = 0; i < cuota && out.length < maxDia; i++) {
      const grupo = grupos[i % grupos.length];
      if ((porGrupo.get(grupo) ?? 0) >= 2) continue; // tope de densidad por grupo
      porGrupo.set(grupo, (porGrupo.get(grupo) ?? 0) + 1);
      const patron = PATRON_ENFASIS[grupo];
      out.push({ grupo, patron, rol: patron ? "secundario" : "aislamiento" });
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
  fuerza: {
    primario: { series: 5, reps: "5" },
    secundario: { series: 4, reps: "6" },
    aislamiento: { series: 3, reps: "8–10" },
    descanso: "Descanso 2–3 min",
  },
  // Hipertrofia = volumen a intensidad media, no fuerza. El primario arranca en
  // 3 series base (avanzado sube a 4 vía ajustarSeries) y 8–10 reps: un rango
  // productivo para el básico sin caer en el 5×5 de fuerza. Descanso 90–120 s:
  // suficiente para sostener la carga entre series (Schoenfeld et al. 2016, "Longer
  // inter-set rest periods enhance muscle strength and hypertrophy").
  hipertrofia: {
    primario: { series: 3, reps: "8–10" },
    secundario: { series: 3, reps: "10–12" },
    aislamiento: { series: 3, reps: "12–15" },
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
    primario: { series: 4, reps: "8–10" },
    secundario: { series: 3, reps: "10–12" },
    aislamiento: { series: 3, reps: "12–15" },
    descanso: "Descanso 90–120 s",
  },
  metabolico: {
    primario: { series: 3, reps: "12–15" },
    secundario: { series: 3, reps: "15–20" },
    aislamiento: { series: 2, reps: "20" },
    descanso: "Descanso 30–45 s",
  },
};

// Periodización ondulante diaria (DUP): el rango rota pesado → medio → liviano
// según el índice de día. Rhea et al. 2002.
const ESQUEMA_ONDULANTE: EsquemaObj[] = [
  {
    primario: { series: 5, reps: "5" },
    secundario: { series: 4, reps: "6–8" },
    aislamiento: { series: 3, reps: "8–10" },
    descanso: "Día pesado · Descanso 2–3 min",
  },
  {
    primario: { series: 4, reps: "8–10" },
    secundario: { series: 3, reps: "10–12" },
    aislamiento: { series: 3, reps: "12–15" },
    descanso: "Día medio · Descanso 90–120 s",
  },
  {
    primario: { series: 3, reps: "12–15" },
    secundario: { series: 3, reps: "15–20" },
    aislamiento: { series: 2, reps: "20" },
    descanso: "Día liviano · Descanso 45–60 s",
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

// Nivel y sexo ajustan volumen sobre la serie base (nunca tocan el rango de
// reps). Principiante entrena más liviano; avanzado sube el trabajo pesado;
// "mujer" baja un set en compuestos ("me queda muy pesado" es la queja).
function ajustarSeries(base: number, rol: Rol, nivel: Nivel, sexo: Sexo): number {
  let s = base;
  if (nivel === "principiante") s -= 1;
  // El +1 de avanzado solo levanta esquemas livianos (estándar hipertrofia
  // arranca en 3 series): nunca empuja a 5 un primario que ya venía en 4 —
  // eso daba 5×8–10 en dos compuestos seguidos, demasiado. El 5×5 queda para
  // fuerza y el día pesado de la ondulante, que ya salen en 5 de base.
  if (nivel === "avanzado" && rol === "primario" && base <= 3) s += 1;
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
      // compuestos de mancuerna / peso corporal, aptos para circuito.
      if (!aislado && (eq === "mancuernas" || eq === "peso_corporal")) return 10;
      if (ranura.rol === "primario" && eq === "barra") return -4;
      return 0;
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
  const rankeados = filtrados.length > 0 ? filtrados : todos;

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
  const evitar: Molestia[] = avanzado?.evitar ?? [];

  // Volumen: modo avanzado ajusta el presupuesto de ranuras extra y el tope
  // por día. Sin avanzado, los valores por defecto reproducen los hardcodes.
  const vol = VOLUMEN_PARAMS[avanzado?.volumen ?? "estandar"];

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

    let ranuras = priorizarEnfasis(
      aplicarEnfasis(
        moldearPorObjetivo(bloque.ranuras, objetivo),
        enfasis,
        sexo,
        esFullBody,
        vol.extras,
        vol.maxDia,
      ),
      enfasis,
    );
    if (avanzado?.orden === "prefatiga_zona") {
      ranuras = aplicarPrefatiga(ranuras, enfasis);
    }

    ranuras.forEach((ranura, si) => {
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
      );
      if (!ej || !ej.slug) return;
      usadosDia.add(ej.id);
      usadosSemana.add(ej.id);

      const rx = esquema[ranura.rol];
      const nota = avanzado
        ? esquema.descanso + notaRir(avanzado.rir, ranura.rol)
        : esquema.descanso;
      items.push({
        ejercicio_slug: ej.slug,
        series: ajustarSeries(rx.series, ranura.rol, entrada.nivel, sexo),
        repeticiones: rx.reps,
        nota,
      });
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
