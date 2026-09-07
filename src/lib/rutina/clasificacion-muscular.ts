// Clasificación estática de ejercicios por cabeza / porción muscular.
// No realiza llamadas a Supabase ni guarda filas en la base de datos.
// Fuente biomecánica: tabla de referencia anatómica (tríceps, bíceps, pecho, deltoides, espalda, piernas, core).

export type GrupoAnatomico =
  | "triceps"
  | "biceps"
  | "pecho"
  | "hombros"
  | "espalda"
  | "piernas"
  | "core";

export type PorcionTriceps =
  | "triceps_cabeza_larga"
  | "triceps_cabeza_lateral"
  | "triceps_cabeza_medial";

export type PorcionBiceps =
  | "biceps_cabeza_larga"
  | "biceps_cabeza_corta"
  | "biceps_braquial";

export type PorcionPecho =
  | "pecho_superior"
  | "pecho_medio"
  | "pecho_inferior";

export type PorcionDeltoides =
  | "deltoides_anterior"
  | "deltoides_lateral"
  | "deltoides_posterior";

export type PorcionEspalda =
  | "espalda_dorsal"
  | "espalda_media_alta"
  | "espalda_lumbar";

export type PorcionPiernas =
  | "piernas_cuadriceps"
  | "piernas_isquiotibiales"
  | "piernas_gluteos"
  | "piernas_gemelos"
  | "piernas_soleo"
  | "piernas_aductores";

export type PorcionCore =
  | "core_recto_superior"
  | "core_recto_inferior"
  | "core_oblicuos"
  | "core_transverso";

export type PorcionId =
  | PorcionTriceps
  | PorcionBiceps
  | PorcionPecho
  | PorcionDeltoides
  | PorcionEspalda
  | PorcionPiernas
  | PorcionCore;

export type ClasificacionPorcion = {
  grupo: GrupoAnatomico;
  porcionId: PorcionId;
  label: string;
  detalle: string;
};

// Metadatos legibles de cada porción muscular
export const METADATOS_PORCIONES: Record<
  PorcionId,
  { grupo: GrupoAnatomico; label: string; detalle: string }
> = {
  // Tríceps (3 cabezas)
  triceps_cabeza_larga: {
    grupo: "triceps",
    label: "Cabeza larga",
    detalle: "Pico posterior del brazo, énfasis con brazos sobre la cabeza",
  },
  triceps_cabeza_lateral: {
    grupo: "triceps",
    label: "Cabeza lateral",
    detalle: "Herradura externa del brazo, énfasis en empujes y jalones",
  },
  triceps_cabeza_medial: {
    grupo: "triceps",
    label: "Cabeza medial",
    detalle: "Densidad profunda del tríceps, activa en todo el recorrido",
  },

  // Bíceps (2 cabezas + braquial)
  biceps_cabeza_larga: {
    grupo: "biceps",
    label: "Cabeza larga",
    detalle: "Pico externo del bíceps, énfasis con codos retrasados respecto al torso",
  },
  biceps_cabeza_corta: {
    grupo: "biceps",
    label: "Cabeza corta",
    detalle: "Grosor interno, énfasis en banco Scott o brazos adelantados",
  },
  biceps_braquial: {
    grupo: "biceps",
    label: "Braquial",
    detalle: "Músculo bajo el bíceps y antebrazo, énfasis con agarre neutro o martillo",
  },

  // Pecho (3 zonas funcionales)
  pecho_superior: {
    grupo: "pecho",
    label: "Pecho superior",
    detalle: "Haz clavicular, banco inclinado 30–45° o empujes ascendentes",
  },
  pecho_medio: {
    grupo: "pecho",
    label: "Pecho medio",
    detalle: "Mayor volumen pectoral, banco plano y aperturas horizontales",
  },
  pecho_inferior: {
    grupo: "pecho",
    label: "Pecho inferior",
    detalle: "Porción costal baja, fondos declinados y cruces descendentes",
  },

  // Hombros / Deltoides (3 porciones)
  deltoides_anterior: {
    grupo: "hombros",
    label: "Deltoides anterior",
    detalle: "Frontal del hombro y empujes verticales",
  },
  deltoides_lateral: {
    grupo: "hombros",
    label: "Deltoides lateral",
    detalle: "Anchura y redondez del hombro, elevaciones laterales",
  },
  deltoides_posterior: {
    grupo: "hombros",
    label: "Deltoides posterior",
    detalle: "Hombro posterior y postura escapular, pájaros y face pulls",
  },

  // Espalda (3 zonas)
  espalda_dorsal: {
    grupo: "espalda",
    label: "Dorsal ancho",
    detalle: "Amplitud y silueta en V, dominadas, jalones y remos unilaterales",
  },
  espalda_media_alta: {
    grupo: "espalda",
    label: "Espalda media / alta",
    detalle: "Grosor postural, trapecios y romboides con remos horizontales",
  },
  espalda_lumbar: {
    grupo: "espalda",
    label: "Lumbar",
    detalle: "Estabilidad espinal y bisagras de cadera pesadas",
  },

  // Piernas
  piernas_cuadriceps: {
    grupo: "piernas",
    label: "Cuádriceps",
    detalle: "Cara frontal del muslo, dominante de rodilla",
  },
  piernas_isquiotibiales: {
    grupo: "piernas",
    label: "Isquiotibiales",
    detalle: "Bíceps femoral y semitendinoso, bisagras y curls femorales",
  },
  piernas_gluteos: {
    grupo: "piernas",
    label: "Glúteos",
    detalle: "Glúteo mayor y medio, extensión y abducción de cadera",
  },
  piernas_gemelos: {
    grupo: "piernas",
    label: "Gemelos",
    detalle: "Gemelo gastrocnemio con pierna extendida en elevaciones de pie",
  },
  piernas_soleo: {
    grupo: "piernas",
    label: "Sóleo",
    detalle: "Músculo profundo bajo el gemelo, rodilla flexionada sentado",
  },
  piernas_aductores: {
    grupo: "piernas",
    label: "Aductores",
    detalle: "Cara interna del muslo, sentadillas sumo y máquina de aducción",
  },

  // Core / Abdomen
  core_recto_superior: {
    grupo: "core",
    label: "Abdomen superior",
    detalle: "Flexión torácica sobre pelvis fija (crunches)",
  },
  core_recto_inferior: {
    grupo: "core",
    label: "Abdomen inferior",
    detalle: "Elevación de pelvis y piernas hacia el torso",
  },
  core_oblicuos: {
    grupo: "core",
    label: "Oblicuos",
    detalle: "Rotación y resistencia lateral de tronco",
  },
  core_transverso: {
    grupo: "core",
    label: "Core profundo / Transverso",
    detalle: "Faja abdominal interna, anti-extensión y planchas",
  },
};

// Mapeo estático por slug del catálogo de ejercicios
const CATALOGO_POR_SLUG: Record<string, PorcionId> = {
  // Pecho
  "press-banca-barra": "pecho_medio",
  "press-banca-mancuernas": "pecho_medio",
  "press-inclinado-mancuernas": "pecho_superior",
  "press-inclinado-barra": "pecho_superior",
  "press-declinado-barra": "pecho_inferior",
  "press-declinado-mancuernas": "pecho_inferior",
  "flexiones": "pecho_medio",
  "press-pecho-maquina": "pecho_medio",
  "aperturas-polea": "pecho_medio",
  "aperturas-mancuernas": "pecho_medio",
  "cruce-poleas-bajas": "pecho_superior",
  "cruce-poleas-altas": "pecho_inferior",
  "press-banca-pausa": "pecho_medio",

  // Espalda
  "dominadas": "espalda_dorsal",
  "jalon-al-pecho": "espalda_dorsal",
  "jalon-polea-agarre-neutro": "espalda_dorsal",
  "remo-barra": "espalda_media_alta",
  "remo-mancuerna": "espalda_dorsal",
  "remo-maquina": "espalda_media_alta",
  "remo-polea-baja": "espalda_media_alta",
  "remo-t": "espalda_media_alta",
  "peso-muerto-barra": "espalda_lumbar",
  "remo-invertido": "espalda_dorsal",
  "hiperextensiones": "espalda_lumbar",
  "face-pull": "espalda_media_alta",

  // Hombros
  "press-militar-barra": "deltoides_anterior",
  "press-militar-estricto": "deltoides_anterior",
  "press-hombro-mancuernas": "deltoides_anterior",
  "press-hombro-maquina": "deltoides_anterior",
  "press-arnold": "deltoides_anterior",
  "elevaciones-frontales": "deltoides_anterior",
  "elevaciones-frontales-disco": "deltoides_anterior",
  "flexiones-pica": "deltoides_anterior",
  "flexiones-declinadas": "deltoides_anterior",
  "elevaciones-laterales": "deltoides_lateral",
  "elevaciones-laterales-polea": "deltoides_lateral",
  "elevaciones-laterales-maquina": "deltoides_lateral",
  "pajaros": "deltoides_posterior",
  "elevaciones-posteriores-polea": "deltoides_posterior",
  "pajaros-peck-deck": "deltoides_posterior",

  // Bíceps
  "curl-barra": "biceps_cabeza_corta",
  "curl-barra-z": "biceps_cabeza_corta",
  "curl-mancuernas": "biceps_cabeza_corta",
  "curl-martillo": "biceps_braquial",
  "curl-polea": "biceps_cabeza_corta",
  "curl-concentrado-mancuerna": "biceps_cabeza_corta",
  "curl-inclinado-mancuernas": "biceps_cabeza_larga",
  "curl-predicador-barra-z": "biceps_cabeza_corta",
  "curl-scott-maquina": "biceps_cabeza_corta",
  "curl-spider": "biceps_cabeza_corta",
  "curl-drag": "biceps_cabeza_larga",

  // Tríceps
  "fondos-banco": "triceps_cabeza_lateral",
  "extension-polea": "triceps_cabeza_lateral",
  "extension-polea-cuerda": "triceps_cabeza_lateral",
  "extension-polea-invertido": "triceps_cabeza_medial",
  "press-frances": "triceps_cabeza_larga",
  "press-frances-barra-z": "triceps_cabeza_larga",
  "extension-triceps-mancuerna": "triceps_cabeza_larga",
  "extension-overhead-polea": "triceps_cabeza_larga",
  "fondos-paralelas": "triceps_cabeza_lateral",
  "flexiones-diamante": "triceps_cabeza_lateral",
  "press-cerrado-barra": "triceps_cabeza_lateral",
  "patada-triceps-polea": "triceps_cabeza_larga",

  // Piernas - Cuádriceps
  "sentadilla-barra": "piernas_cuadriceps",
  "sentadilla-frontal-barra": "piernas_cuadriceps",
  "sentadilla-goblet": "piernas_cuadriceps",
  "prensa-piernas": "piernas_cuadriceps",
  "zancadas-mancuernas": "piernas_cuadriceps",
  "extension-cuadriceps": "piernas_cuadriceps",
  "sentadilla-peso-corporal": "piernas_cuadriceps",
  "sentadilla-hack": "piernas_cuadriceps",
  "sentadilla-sissy": "piernas_cuadriceps",

  // Piernas - Isquiotibiales
  "peso-muerto-rumano": "piernas_isquiotibiales",
  "peso-muerto-rumano-mancuernas": "piernas_isquiotibiales",
  "curl-femoral": "piernas_isquiotibiales",
  "curl-femoral-acostado": "piernas_isquiotibiales",
  "curl-femoral-sentado": "piernas_isquiotibiales",
  "buenos-dias": "piernas_isquiotibiales",
  "curl-nordico": "piernas_isquiotibiales",
  "peso-muerto-rumano-una-pierna": "piernas_isquiotibiales",
  "rdl-unilateral-mancuerna": "piernas_isquiotibiales",

  // Piernas - Glúteos
  "hip-thrust": "piernas_gluteos",
  "hip-thrust-maquina": "piernas_gluteos",
  "hip-thrust-una-pierna": "piernas_gluteos",
  "puente-gluteo": "piernas_gluteos",
  "puente-gluteo-barra": "piernas_gluteos",
  "patada-gluteo-polea": "piernas_gluteos",
  "patada-burro-polea": "piernas_gluteos",
  "abduccion-maquina": "piernas_gluteos",
  "sentadilla-bulgara": "piernas_gluteos",
  "zancada-inversa-deficit": "piernas_gluteos",

  // Piernas - Aductores
  "sentadilla-sumo-mancuerna": "piernas_aductores",
  "sentadilla-sumo-barra": "piernas_aductores",
  "aduccion-maquina": "piernas_aductores",

  // Piernas - Gemelos y Sóleo
  "elevacion-gemelos-pie": "piernas_gemelos",
  "elevacion-gemelos-mancuerna": "piernas_gemelos",
  "elevacion-gemelos-una-pierna": "piernas_gemelos",
  "elevacion-gemelos-sentado": "piernas_soleo",

  // Core
  "plancha": "core_transverso",
  "rueda-abdominal": "core_transverso",
  "crunch-polea": "core_recto_superior",
  "crunch-suelo": "core_recto_superior",
  "crunch-maquina": "core_recto_superior",
  "elevacion-piernas": "core_recto_inferior",
  "elevacion-rodillas-colgado": "core_recto_inferior",
  "pallof-press": "core_oblicuos",
  "lenador-polea": "core_oblicuos",
  "giro-ruso": "core_oblicuos",
  "plancha-lateral": "core_oblicuos",
};

function normalizarTexto(txt: string): string {
  return txt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function inferirPorcionPorNombre(nombre: string, grupo?: string | null): PorcionId {
  const n = normalizarTexto(nombre);
  const g = (grupo || "").toLowerCase();

  // Tríceps
  if (g.includes("tricep") || n.includes("tricep") || n.includes("frances")) {
    if (
      n.includes("overhead") ||
      n.includes("nuca") ||
      n.includes("cabeza") ||
      n.includes("frances")
    ) {
      return "triceps_cabeza_larga";
    }
    if (n.includes("invertid") || n.includes("medial")) return "triceps_cabeza_medial";
    return "triceps_cabeza_lateral";
  }

  // Bíceps
  if (g.includes("bicep") || n.includes("bicep") || n.includes("curl")) {
    if (n.includes("martillo") || n.includes("neutro") || n.includes("braquial")) {
      return "biceps_braquial";
    }
    if (n.includes("inclinado") || n.includes("drag") || n.includes("estrecho")) {
      return "biceps_cabeza_larga";
    }
    return "biceps_cabeza_corta";
  }

  // Pecho
  if (g.includes("pecho") || n.includes("pecho") || n.includes("banca")) {
    if (n.includes("inclinad") || n.includes("superior") || n.includes("clavicular")) {
      return "pecho_superior";
    }
    if (n.includes("declinad") || n.includes("inferior")) return "pecho_inferior";
    return "pecho_medio";
  }

  // Hombros
  if (
    g.includes("hombro") ||
    g.includes("deltoid") ||
    n.includes("militar") ||
    n.includes("hombro")
  ) {
    if (n.includes("lateral") || n.includes("laterales")) return "deltoides_lateral";
    if (n.includes("pajaro") || n.includes("posterior") || n.includes("face pull")) {
      return "deltoides_posterior";
    }
    return "deltoides_anterior";
  }

  // Espalda
  if (
    g.includes("espalda") ||
    n.includes("remo") ||
    n.includes("jalon") ||
    n.includes("dominada")
  ) {
    if (
      n.includes("peso muerto") ||
      n.includes("lumbar") ||
      n.includes("hiperextension")
    ) {
      return "espalda_lumbar";
    }
    if (
      n.includes("remo con barra") ||
      n.includes("remo t") ||
      n.includes("polea baja") ||
      n.includes("maquina")
    ) {
      return "espalda_media_alta";
    }
    return "espalda_dorsal";
  }

  // Piernas
  if (
    g.includes("isquio") ||
    n.includes("femoral") ||
    n.includes("rumano") ||
    n.includes("nordico") ||
    n.includes("buenos dias")
  ) {
    return "piernas_isquiotibiales";
  }
  if (
    g.includes("gluteo") ||
    n.includes("thrust") ||
    n.includes("puente") ||
    n.includes("patada") ||
    n.includes("bulgara")
  ) {
    return "piernas_gluteos";
  }
  if (n.includes("sumo") || n.includes("aductor")) return "piernas_aductores";
  if (g.includes("gemelo") || n.includes("gemelo") || n.includes("talon")) {
    if (n.includes("sentado")) return "piernas_soleo";
    return "piernas_gemelos";
  }
  if (
    g.includes("cuadricep") ||
    n.includes("sentadilla") ||
    n.includes("prensa") ||
    n.includes("cuadricep") ||
    n.includes("zancada")
  ) {
    return "piernas_cuadriceps";
  }

  // Core
  if (
    g.includes("core") ||
    g.includes("abdom") ||
    n.includes("crunch") ||
    n.includes("plancha")
  ) {
    if (n.includes("colgado") || n.includes("inferior") || n.includes("piernas")) {
      return "core_recto_inferior";
    }
    if (
      n.includes("oblicu") ||
      n.includes("pallof") ||
      n.includes("lenador") ||
      n.includes("ruso")
    ) {
      return "core_oblicuos";
    }
    if (n.includes("plancha") || n.includes("rueda") || n.includes("anti")) {
      return "core_transverso";
    }
    return "core_recto_superior";
  }

  return "pecho_medio";
}

/**
 * Obtiene la clasificación anatómica completa (grupo, porción y descripción)
 * para cualquier ejercicio por slug, id o nombre sin realizar queries a la base.
 */
export function obtenerClasificacionEjercicio(ejercicio: {
  slug?: string | null;
  id?: string | null;
  nombre?: string | null;
  grupo_muscular?: string | null;
}): ClasificacionPorcion {
  const slug = (ejercicio.slug || "").toLowerCase().trim();
  let porcionId: PorcionId | undefined = CATALOGO_POR_SLUG[slug];

  if (!porcionId) {
    const slugNormalizado = slug.replace(/_/g, "-");
    porcionId = CATALOGO_POR_SLUG[slugNormalizado];
  }

  if (!porcionId) {
    porcionId = inferirPorcionPorNombre(ejercicio.nombre || slug, ejercicio.grupo_muscular);
  }

  const meta = METADATOS_PORCIONES[porcionId] || {
    grupo: "pecho",
    label: "Porción principal",
    detalle: "Trabajo focalizado",
  };

  return {
    grupo: meta.grupo,
    porcionId,
    label: meta.label,
    detalle: meta.detalle,
  };
}
