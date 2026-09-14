// Motor de reglas declarativo para el calentamiento general de sesión.
// 0ms, determinista, sin llamadas a IA. Ver science-workout-engine skill:
// hipertrofia/fuerza no llevan cardio previo (preserva glucógeno para las
// series efectivas), y las sustituciones respetan las molestias articulares
// ya contempladas por el motor científico (sección G, ArticulacionMolestia).
import type { Objetivo } from "@/lib/rutina/tipos";

// ── 1. TIPOS CANÓNICOS DEL MOTOR CIENTÍFICO ────────────────────────────────
export type GrupoMuscular =
  | "pecho"
  | "espalda"
  | "cuadriceps"
  | "isquios"
  | "gluteos"
  | "hombros"
  | "biceps"
  | "triceps"
  | "gemelos"
  | "core";

export type ArticulacionMolestia =
  | "hombro"
  | "rodilla"
  | "lumbar"
  | "muneca"
  | "muñeca"
  | "codo";

export interface EjercicioMovilidad {
  id: string;
  nombre: string;
  repeticionesOTiempo: string;
  nota: string; // Garantía anti-fatiga explícita
  contraindicadoEn?: ArticulacionMolestia[];
  sustitutoSeguro?: EjercicioMovilidad;
}

export interface ProtocoloCardio {
  permitido: boolean;
  modo: "prohibido" | "opcional" | "recomendado";
  tiempoMinutos?: number;
  sugerencia?: string;
}

export interface SesionWarmupResult {
  grupoPrincipal: GrupoMuscular;
  duracionEstimadaTotal: string; // "3–4 min" techo estricto
  ejerciciosMovilidad: EjercicioMovilidad[];
  cardio: ProtocoloCardio;
  avisoMolestiaAplicado?: string;
}

// ── 2. POLÍTICAS DE CARDIO (Raise) ─────────────────────────────────────────
// Hipertrofia y fuerza: prohibido (preserva glucógeno y fatiga para series efectivas)
const POLITICAS_CARDIO: Record<Objetivo, ProtocoloCardio> = {
  hipertrofia: { permitido: false, modo: "prohibido" },
  fuerza: { permitido: false, modo: "prohibido" },
  bajar_grasa: {
    permitido: true,
    modo: "opcional",
    tiempoMinutos: 3,
    sugerencia: "3 min suaves en cinta inclinada o elíptica (RPE 3/10, solo termorregulación).",
  },
  tonificar: {
    permitido: true,
    modo: "opcional",
    tiempoMinutos: 3,
    sugerencia: "3 min suaves de bicicleta fija o cinta para elevar pulso basal.",
  },
  resistencia: {
    permitido: true,
    modo: "recomendado",
    tiempoMinutos: 4,
    sugerencia: "3-4 min de saltos rítmicos o trote ligero.",
  },
};

// ── 3. CATÁLOGO DE MOVILIDAD (Activate & Mobilize) ─────────────────────────
// Regla: 5-6 reps de activación pura, sin carga externa, sin acercarse a RIR.
// Máximo 2 a 3 ejercicios para no sobrepasar los 3-4 minutos de techo.
type PatronInterno = "empuje" | "tiron" | "cadena_anterior" | "cadena_posterior" | "tronco";

const MOVILIDAD_POR_PATRON: Record<PatronInterno, EjercicioMovilidad[]> = {
  empuje: [
    {
      id: "circulos_escapulares",
      nombre: "Círculos de brazos y dislocaciones con pica o banda",
      repeticionesOTiempo: "5-6 por sentido",
      nota: "Sin carga externa. Ritmo suave y rango cómodo (cero fatiga, lejos de RIR).",
    },
    {
      id: "rotacion_externa_manguito",
      nombre: "Rotación externa con mini-band suave",
      repeticionesOTiempo: "6 reps por lado",
      nota: "Tensión mínima. Activación del infraespinoso, no quemazón.",
      contraindicadoEn: ["hombro"],
      sustitutoSeguro: {
        id: "retraccion_escapular_pared",
        nombre: "Deslizamiento escapular en pared (Wall Slides neutros)",
        repeticionesOTiempo: "5 reps suaves",
        nota: "Plano escapular sin rotación forzada. Descomprime el espacio subacromial.",
      },
    },
    {
      id: "pushup_escapular_elevado",
      nombre: "Push-up escapular apoyado en banco/pared",
      repeticionesOTiempo: "5 reps pausadas",
      nota: "Solo movimiento de escápulas. Sin flexionar codos ni buscar esfuerzo muscular.",
      contraindicadoEn: ["muneca", "muñeca", "codo"],
      sustitutoSeguro: {
        id: "protraccion_antebrazo",
        nombre: "Protracción escapular sobre antebrazos (en pared)",
        repeticionesOTiempo: "5 reps suaves",
        nota: "Sin extensión de muñeca ni carga en codos.",
      },
    },
  ],
  tiron: [
    {
      id: "band_pull_apart",
      nombre: "Band pull-aparts livianos",
      repeticionesOTiempo: "6 reps",
      nota: "Banda muy elástica. Foco en juntar escápulas sin fatigar el deltoides.",
    },
    {
      id: "dead_hang_activo",
      nombre: "Colgado pasivo-activo en barra fija",
      repeticionesOTiempo: "1 serie de 15-20 seg",
      nota: "Descompresión espinal y flujo sinovial articular, sin agotar el agarre.",
      contraindicadoEn: ["hombro", "muneca", "muñeca"],
      sustitutoSeguro: {
        id: "lat_stretch_banco",
        nombre: "Estiramiento activo de dorsal en banco con manos neutras",
        repeticionesOTiempo: "2 respiraciones profundas por lado",
        nota: "Cero tracción en muñecas ni tracción axial forzada en el hombro.",
      },
    },
    {
      id: "facepull_isometrico_suave",
      nombre: "Face pull liviano con banda (énfasis escapular)",
      repeticionesOTiempo: "5 reps con pausa de 1 seg",
      nota: "Banda ultraliviana. Activación de trapecio medio e inferior.",
    },
  ],
  cadena_anterior: [
    {
      id: "tobillo_pared",
      nombre: "Dorsiflexión de tobillo dinámica contra pared",
      repeticionesOTiempo: "5 oscilaciones por pie",
      nota: "Mejora el recorrido de rodilla sin cargar los tendones.",
    },
    {
      id: "sentadilla_asistida_aire",
      nombre: "Sentadilla asistida agarrado a soporte",
      repeticionesOTiempo: "5 reps lentas",
      nota: "Sin peso corporal total sobre rodillas ni pausa fatigante.",
      contraindicadoEn: ["rodilla"],
      sustitutoSeguro: {
        id: "puente_gluteo_isometria",
        nombre: "Puente de glúteos suave en suelo",
        repeticionesOTiempo: "5 reps con 2 seg arriba",
        nota: "Activa extensión de cadera con ángulo patelofemoral relajado.",
      },
    },
  ],
  cadena_posterior: [
    {
      id: "cadera_90_90",
      nombre: "Movilidad de cadera en posición 90/90",
      repeticionesOTiempo: "4 transiciones lentas por lado",
      nota: "Fluidez articular en rotación interna/externa de fémur.",
      contraindicadoEn: ["rodilla"],
      sustitutoSeguro: {
        id: "bisagra_pared",
        nombre: "Bisagra de cadera tocando pared con glúteos",
        repeticionesOTiempo: "5 reps controladas",
        nota: "Apertura de isquiosurales y cadera sin torsión de rodilla.",
      },
    },
    {
      id: "gato_camello",
      nombre: "Gato-camello segmentario suave (Cat-Cow)",
      repeticionesOTiempo: "5 ciclos de respiración",
      nota: "Lubricación de la columna vertebral sin forzar rangos finales.",
      contraindicadoEn: ["lumbar"],
      sustitutoSeguro: {
        id: "respiracion_diafragmatica_supina",
        nombre: "Respiración diafragmática 90/90 pies apoyados",
        repeticionesOTiempo: "5 ciclos lentos",
        nota: "Alineación pélvica neutral sin flexoextensión lumbar bajo carga.",
      },
    },
  ],
  tronco: [
    {
      id: "deadbug_suave",
      nombre: "Deadbug controlado en colchoneta",
      repeticionesOTiempo: "4 reps lentas por lado",
      nota: "Fijar zona lumbar contra el suelo. Activación de core sin fatiga.",
    },
    {
      id: "bird_dog_isometrico",
      nombre: "Bird-dog con pausa de 1 segundo",
      repeticionesOTiempo: "4 reps por lado",
      nota: "Estabilidad cruzada, columna neutra sin oscilaciones.",
    },
  ],
};

// ── 4. MAPEO GRUPO CANÓNICO A PATRÓN INTERNO ───────────────────────────────
const GRUPO_A_PATRON: Record<GrupoMuscular, PatronInterno> = {
  pecho: "empuje",
  hombros: "empuje",
  triceps: "empuje",
  espalda: "tiron",
  biceps: "tiron",
  cuadriceps: "cadena_anterior",
  isquios: "cadena_posterior",
  gluteos: "cadena_posterior",
  gemelos: "cadena_anterior",
  core: "tronco",
};

// ── 5. RESOLUTOR PRINCIPAL (0ms, pura, determinista) ───────────────────────
export function resolverWarmupSesion({
  gruposDia,
  objetivo,
  evitarDolor = [],
}: {
  gruposDia: GrupoMuscular[] | string[] | string | undefined;
  objetivo: Objetivo | string | undefined;
  evitarDolor?: ArticulacionMolestia[];
}): SesionWarmupResult {
  // Normalizar lista de grupos de entrada a GrupoMuscular canónico
  const rawList = Array.isArray(gruposDia)
    ? gruposDia
    : (gruposDia ?? "pecho").toLowerCase().split(/[\s,/+-]+/);

  const grupoPrincipal: GrupoMuscular =
    (rawList.find((g): g is GrupoMuscular => g in GRUPO_A_PATRON) as GrupoMuscular) ?? "pecho";

  const patron = GRUPO_A_PATRON[grupoPrincipal] ?? "empuje";
  const ejerciciosCandidatos = MOVILIDAD_POR_PATRON[patron];

  // Normalizar lista de dolores (unificar muneca / muñeca)
  const molestiasSet = new Set(
    evitarDolor.map((m) => (m === "muñeca" ? "muneca" : m.toLowerCase())),
  );

  // Filtrado / sustitución biomecánica fina
  let sustitucionAplicada = false;
  const ejerciciosFinales: EjercicioMovilidad[] = [];
  for (const ej of ejerciciosCandidatos) {
    const hayConflicto = ej.contraindicadoEn?.some((art) =>
      molestiasSet.has(art === "muñeca" ? "muneca" : art),
    );
    if (hayConflicto) {
      if (ej.sustitutoSeguro) {
        ejerciciosFinales.push(ej.sustitutoSeguro);
        sustitucionAplicada = true;
      }
      // Si no tiene sustituto seguro, se descarta para no causar molestia
    } else {
      ejerciciosFinales.push(ej);
    }
  }

  // Techo estricto: máximo 3 ejercicios de movilidad para asegurar <= 3.5 min
  const ejerciciosFiltrados = ejerciciosFinales.slice(0, 3);

  // Resolver cardio según objetivo
  const keyObj = ((objetivo as Objetivo) || "hipertrofia").toLowerCase() as Objetivo;
  const cardio = POLITICAS_CARDIO[keyObj] ?? POLITICAS_CARDIO.hipertrofia;

  return {
    grupoPrincipal,
    duracionEstimadaTotal: "3-4 min",
    ejerciciosMovilidad: ejerciciosFiltrados,
    cardio,
    avisoMolestiaAplicado: sustitucionAplicada
      ? "Movilidad adaptada para proteger tus articulaciones con molestia."
      : undefined,
  };
}
