// Catálogo universal de emergencia y degradación elegante (Graceful Degradation).
// Provee ejercicios infalibles independientes de la base de datos ante caídas de conexión,
// tablas vacías o restricciones severas de molestias articulares.

import type { Ejercicio, Molestia } from "./tipos";

export type EjercicioUniversal = Ejercicio & {
  id: string;
  slug: string;
  nombre: string;
  grupo_muscular: string;
  patron: string;
  equipo: string;
  nivel: string;
};

// ── 1. Sustitutos seguros específicos para molestias articulares ────────────
export const SUSTITUTOS_MOLESTIA: Record<string, EjercicioUniversal> = {
  "puente-gluteo-suelo": {
    id: "fallback-puente-gluteo-suelo",
    slug: "puente-gluteo-suelo",
    nombre: "Puente de glúteos en suelo",
    grupo_muscular: "gluteos",
    patron: "dominante_cadera",
    equipo: "peso_corporal",
    nivel: "principiante",
    imagen_url: "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/Butt_Lift_Bridge/0.jpg",
    descripcion: "Variante segura para rodilla: extensión de cadera en suelo sin cizalla patelofemoral.",
  },
  "prensa-pies-altos": {
    id: "fallback-prensa-pies-altos",
    slug: "prensa-pies-altos",
    nombre: "Prensa con pies altos",
    grupo_muscular: "cuadriceps",
    patron: "dominante_rodilla",
    equipo: "maquina",
    nivel: "principiante",
    imagen_url: "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/Leg_Press/0.jpg",
    descripcion: "Pies colocados altos en la plataforma para minimizar momento sobre rodillas y cargar cadena posterior.",
  },
  "plancha-frontal": {
    id: "fallback-plancha-frontal",
    slug: "plancha-frontal",
    nombre: "Plancha frontal isométrica",
    grupo_muscular: "core",
    patron: "core_anti_extension",
    equipo: "peso_corporal",
    nivel: "principiante",
    imagen_url: "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/Plank/0.jpg",
    descripcion: "Contracción isométrica neutra sin torque ni flexión sobre la columna lumbar.",
  },
  "remo-pecho-apoyado": {
    id: "fallback-remo-pecho-apoyado",
    slug: "remo-pecho-apoyado",
    nombre: "Remo con pecho apoyado",
    grupo_muscular: "espalda",
    patron: "traccion_horizontal",
    equipo: "mancuernas",
    nivel: "principiante",
    imagen_url: "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/Lying_T-Bar_Row/0.jpg",
    descripcion: "Pecho totalmente apoyado en banco inclinado; elimina cualquier sobrecarga en erectores lumbares.",
  },
  "flexiones-neutras": {
    id: "fallback-flexiones-neutras",
    slug: "flexiones-neutras",
    nombre: "Flexiones con agarre neutro",
    grupo_muscular: "pecho",
    patron: "empuje_horizontal",
    equipo: "peso_corporal",
    nivel: "principiante",
    imagen_url: "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/Pushups/0.jpg",
    descripcion: "Agarre neutro con soportes para abrir el espacio subacromial y proteger el hombro.",
  },
  "elevaciones-laterales-inclinadas": {
    id: "fallback-elevaciones-laterales-inclinadas",
    slug: "elevaciones-laterales-inclinadas",
    nombre: "Elevaciones laterales en plano escapular",
    grupo_muscular: "hombros",
    patron: "aislamiento",
    equipo: "mancuernas",
    nivel: "principiante",
    imagen_url: "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/Side_Lateral_Raise/0.jpg",
    descripcion: "Elevación a 30° en plano escapular para evitar rozamiento acromioclavicular.",
  },
  "curl-mancuernas-neutro": {
    id: "fallback-curl-mancuernas-neutro",
    slug: "curl-mancuernas-neutro",
    nombre: "Curl martillo con agarre neutro",
    grupo_muscular: "biceps",
    patron: "aislamiento",
    equipo: "mancuernas",
    nivel: "principiante",
    imagen_url: "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/Hammer_Curls/0.jpg",
    descripcion: "Agarre neutro que distribuye la carga al braquiorradial y descarga muñeca y codo.",
  },
  "extension-polea-cuerda": {
    id: "fallback-extension-polea-cuerda",
    slug: "extension-polea-cuerda",
    nombre: "Extensión de tríceps en polea con cuerda",
    grupo_muscular: "triceps",
    patron: "aislamiento",
    equipo: "polea",
    nivel: "principiante",
    imagen_url: "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/Triceps_Pushdown/0.jpg",
    descripcion: "Cuerda libre que permite libertad de rotación articular sin tensiones lesivas en codos o muñecas.",
  },
};

// ── 2. Mapa universal infalible por grupo muscular (peso corporal / equipo básico) ──
export const FALLBACKS_POR_GRUPO: Record<string, EjercicioUniversal> = {
  pecho: {
    id: "fallback-flexiones",
    slug: "flexiones",
    nombre: "Flexiones de brazos",
    grupo_muscular: "pecho",
    patron: "empuje_horizontal",
    equipo: "peso_corporal",
    nivel: "principiante",
    imagen_url: "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/Pushups/0.jpg",
    descripcion: "Empuje horizontal básico con peso corporal y tronco firme en línea recta.",
  },
  espalda: {
    id: "fallback-remo-mancuerna",
    slug: "remo-mancuerna",
    nombre: "Remo a una mano con mancuerna",
    grupo_muscular: "espalda",
    patron: "traccion_horizontal",
    equipo: "mancuernas",
    nivel: "principiante",
    imagen_url: "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/One-Arm_Dumbbell_Row/0.jpg",
    descripcion: "Tracción horizontal unilateral con apoyo seguro sobre banco para la espalda media.",
  },
  cuadriceps: {
    id: "fallback-sentadilla-peso-corporal",
    slug: "sentadilla-peso-corporal",
    nombre: "Sentadilla libre",
    grupo_muscular: "cuadriceps",
    patron: "dominante_rodilla",
    equipo: "peso_corporal",
    nivel: "principiante",
    imagen_url: "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/Bodyweight_Squat/0.jpg",
    descripcion: "Patrón dominante de rodilla con peso corporal, alineación controlada de rodillas con los pies.",
  },
  isquios: {
    id: "fallback-peso-muerto-rumano-mancuernas",
    slug: "peso-muerto-rumano-mancuernas",
    nombre: "Peso muerto rumano con mancuernas",
    grupo_muscular: "isquios",
    patron: "dominante_cadera",
    equipo: "mancuernas",
    nivel: "principiante",
    imagen_url: "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/Stiff-Legged_Dumbbell_Deadlift/0.jpg",
    descripcion: "Bisagra de cadera controlada con mancuernas cerca de las piernas y tensión en isquiotibiales.",
  },
  gluteos: {
    id: "fallback-puente-gluteo",
    slug: "puente-gluteo",
    nombre: "Puente de glúteos",
    grupo_muscular: "gluteos",
    patron: "dominante_cadera",
    equipo: "peso_corporal",
    nivel: "principiante",
    imagen_url: "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/Butt_Lift_Bridge/0.jpg",
    descripcion: "Extensión de cadera en suelo con peso corporal, compresión glútea sin arquear la zona lumbar.",
  },
  hombros: {
    id: "fallback-elevaciones-laterales",
    slug: "elevaciones-laterales",
    nombre: "Elevaciones laterales",
    grupo_muscular: "hombros",
    patron: "aislamiento",
    equipo: "mancuernas",
    nivel: "principiante",
    imagen_url: "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/Side_Lateral_Raise/0.jpg",
    descripcion: "Aislamiento de deltoides lateral con mancuernas ligeras hasta la línea de los hombros.",
  },
  biceps: {
    id: "fallback-curl-mancuernas",
    slug: "curl-mancuernas",
    nombre: "Curl alternado con mancuernas",
    grupo_muscular: "biceps",
    patron: "aislamiento",
    equipo: "mancuernas",
    nivel: "principiante",
    imagen_url: "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/Dumbbell_Bicep_Curl/0.jpg",
    descripcion: "Flexión de codo controlada manteniendo los codos pegados al torso sin balanceos.",
  },
  triceps: {
    id: "fallback-fondos-banco",
    slug: "fondos-banco",
    nombre: "Fondos en banco",
    grupo_muscular: "triceps",
    patron: "empuje_vertical",
    equipo: "peso_corporal",
    nivel: "principiante",
    imagen_url: "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/Bench_Dips/0.jpg",
    descripcion: "Empuje vertical en apoyo de banco para tríceps, bajada controlada hasta 90°.",
  },
  gemelos: {
    id: "fallback-elevacion-gemelos-pie",
    slug: "elevacion-gemelos-pie",
    nombre: "Elevación de gemelos de pie",
    grupo_muscular: "gemelos",
    patron: "aislamiento",
    equipo: "peso_corporal",
    nivel: "principiante",
    imagen_url: "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/Standing_Calf_Raises/0.jpg",
    descripcion: "Elevación de talones con pausa isométrica en la contracción y descenso completo.",
  },
  core: {
    id: "fallback-plancha",
    slug: "plancha",
    nombre: "Plancha abdominal",
    grupo_muscular: "core",
    patron: "core_anti_extension",
    equipo: "peso_corporal",
    nivel: "principiante",
    imagen_url: "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/Plank/0.jpg",
    descripcion: "Isometría de estabilización lumbo-pélvica con glúteos y transverso activo.",
  },
};

// Aliases para mapear peticiones con variaciones léxicas comunes
const GRUPO_ALIAS: Record<string, string> = {
  pecho: "pecho",
  pectoral: "pecho",
  espalda: "espalda",
  dorsal: "espalda",
  dorsales: "espalda",
  cuadriceps: "cuadriceps",
  pierna: "cuadriceps",
  piernas: "cuadriceps",
  isquios: "isquios",
  isquiotibiales: "isquios",
  femorales: "isquios",
  femoral: "isquios",
  gluteos: "gluteos",
  gluteo: "gluteos",
  hombros: "hombros",
  hombro: "hombros",
  deltoides: "hombros",
  biceps: "biceps",
  triceps: "triceps",
  brazos: "biceps",
  gemelos: "gemelos",
  gemelo: "gemelos",
  pantorrillas: "gemelos",
  pantorrilla: "gemelos",
  core: "core",
  abdomen: "core",
  abdominales: "core",
};

/**
 * Catálogo universal completo de ejercicios infalibles sin dependencias de base de datos.
 */
export const CATALOGO_UNIVERSAL_EMERGENCIA: readonly EjercicioUniversal[] = [
  ...Object.values(FALLBACKS_POR_GRUPO),
  ...Object.values(SUSTITUTOS_MOLESTIA),
];

/**
 * Obtiene un ejercicio infalible garantizado para cualquier grupo muscular, rol o molestia articular.
 * Retorna siempre un objeto Ejercicio 100% completo, no nulo y con strings válidos en todos los campos esenciales.
 */
export function obtenerFallbackSeguro(
  grupo: string,
  rol?: string,
  molestias?: readonly Molestia[],
): Ejercicio {
  const grupoLimpio = (grupo || "").trim().toLowerCase();
  const grupoNormalizado = GRUPO_ALIAS[grupoLimpio] ?? grupoLimpio;
  const listaMolestias = molestias ?? [];

  // 1. Evaluación prioritaria de molestias articulares específicas
  if (listaMolestias.includes("rodilla")) {
    if (grupoNormalizado === "cuadriceps" || grupoNormalizado === "piernas") {
      // Si el rol busca compuesto de máquina seguro, prensa pies altos; sino puente en suelo
      return rol === "primario" || rol === "secundario"
        ? SUSTITUTOS_MOLESTIA["prensa-pies-altos"]
        : SUSTITUTOS_MOLESTIA["puente-gluteo-suelo"];
    }
  }

  if (listaMolestias.includes("lumbar")) {
    if (grupoNormalizado === "espalda") {
      return SUSTITUTOS_MOLESTIA["remo-pecho-apoyado"];
    }
    if (grupoNormalizado === "core") {
      return SUSTITUTOS_MOLESTIA["plancha-frontal"];
    }
    if (grupoNormalizado === "isquios") {
      // Evita sobrecarga espinal de peso muerto tradicional
      return SUSTITUTOS_MOLESTIA["puente-gluteo-suelo"];
    }
  }

  if (listaMolestias.includes("hombro")) {
    if (grupoNormalizado === "pecho") {
      return SUSTITUTOS_MOLESTIA["flexiones-neutras"];
    }
    if (grupoNormalizado === "hombros") {
      return SUSTITUTOS_MOLESTIA["elevaciones-laterales-inclinadas"];
    }
    if (grupoNormalizado === "triceps") {
      return SUSTITUTOS_MOLESTIA["extension-polea-cuerda"];
    }
  }

  if (listaMolestias.includes("codo") || listaMolestias.includes("muñeca")) {
    if (grupoNormalizado === "biceps") {
      return SUSTITUTOS_MOLESTIA["curl-mancuernas-neutro"];
    }
    if (grupoNormalizado === "triceps") {
      return SUSTITUTOS_MOLESTIA["extension-polea-cuerda"];
    }
    if (grupoNormalizado === "pecho") {
      return SUSTITUTOS_MOLESTIA["flexiones-neutras"];
    }
  }

  // 2. Selección del catálogo universal infalible por grupo
  const fallbackBase = FALLBACKS_POR_GRUPO[grupoNormalizado];
  if (fallbackBase) {
    return fallbackBase;
  }

  // 3. Degradación ultra-segura de último recurso (grupo muscular no estándar o vacío)
  const grupoDefinitivo = grupoNormalizado || "core";
  return {
    id: `fallback-universal-${grupoDefinitivo}`,
    slug: "plancha",
    nombre: "Plancha abdominal",
    grupo_muscular: grupoDefinitivo,
    patron: "core_anti_extension",
    equipo: "peso_corporal",
    nivel: "principiante",
    imagen_url: "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/Plank/0.jpg",
    descripcion: "Ejercicio seguro de emergencia con peso corporal y activación de estabilizadores.",
  };
}
