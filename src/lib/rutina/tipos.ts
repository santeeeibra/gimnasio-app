// Tipos compartidos del motor de rutinas.

export const OBJETIVOS = [
  "fuerza",
  "hipertrofia",
  "tonificar",
  "resistencia",
  "bajar_grasa",
] as const;
export const NIVELES = ["principiante", "intermedio", "avanzado"] as const;
export const EQUIPOS = ["barra", "mancuernas", "maquina", "polea", "peso_corporal"] as const;

export type Objetivo = (typeof OBJETIVOS)[number];
export type Nivel = (typeof NIVELES)[number];
export type Equipo = (typeof EQUIPOS)[number];

export const OBJETIVO_LABEL: Record<Objetivo, string> = {
  fuerza: "Fuerza (cargas altas)",
  hipertrofia: "Hipertrofia (masa muscular)",
  tonificar: "Tonificar / marcar",
  resistencia: "Resistencia",
  bajar_grasa: "Bajar grasa",
};

// Texto de ayuda bajo cada opción de objetivo (una línea, sin jerga).
export const OBJETIVO_AYUDA: Record<Objetivo, string> = {
  fuerza: "Levantar más peso. Series pesadas, pocas repeticiones, descansos largos.",
  hipertrofia: "Ganar volumen muscular. Series medias, repeticiones moderadas.",
  tonificar:
    "Bajar algo de grasa y dar forma sin buscar volumen. Repeticiones altas, descansos cortos.",
  resistencia: "Aguantar más. Muchas repeticiones, descansos muy cortos.",
  bajar_grasa:
    "Perder grasa sin perder músculo. Compuestos pesados, pocas repeticiones; el déficit se hace en la comida.",
};

export const NIVEL_LABEL: Record<Nivel, string> = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

export type InfoNivel = {
  tiempo: string;
  resumen: string;
  criterioSeleccion: string;
  seguridad: string;
  ejemplos: string[];
};

export const NIVEL_DETALLE: Record<Nivel, InfoNivel> = {
  principiante: {
    tiempo: "< 6 meses entrenando o retomando",
    resumen: "Ejercicios guiados, seguros y de fácil control motor.",
    criterioSeleccion:
      "El sistema selecciona exclusivamente máquinas y poleas con trayectoria fija o mancuernas con soporte. Se descartan movimientos técnicamente riesgosos o con alta compresión de columna (sin peso muerto ni dominadas libres).",
    seguridad: "Máxima estabilidad articular · Riesgo de lesión nulo · Foco en técnica",
    ejemplos: ["Prensa de piernas", "Jalón al pecho", "Press de pecho en máquina", "Remo en polea baja", "Sentadilla goblet"],
  },
  intermedio: {
    tiempo: "6 meses a 2 años constante",
    resumen: "Sobrecarga progresiva con barras y mancuernas libres.",
    criterioSeleccion:
      "Desbloquea ejercicios con barra libre y pesos libres fundamentales. El motor combina variantes compuestas clásicas con accesorios guiados para optimizar estímulo e hipertrofia.",
    seguridad: "Estabilidad media · Exige control de postura y core",
    ejemplos: ["Sentadilla con barra", "Press de banca con barra", "Remo con barra", "Hip thrust con barra", "Press militar"],
  },
  avanzado: {
    tiempo: "+2 años con técnica sólida",
    resumen: "Máxima demanda neuromuscular y levantamientos pesados.",
    criterioSeleccion:
      "Acceso irrestricto a todo el catálogo. Se priorizan movimientos de alta demanda técnica, cadenas cinéticas complejas, variantes con pausas isométricas y calistenia pesada.",
    seguridad: "Exige dominio total de cargas axiales y autorregulación de fatiga",
    ejemplos: ["Peso muerto convencional", "Dominadas libres", "Fondos en paralelas", "Rueda abdominal", "Sentadilla frontal"],
  },
};


// Presets de equipo que se ofrecen en el cuestionario.
export const PREFERENCIAS_EQUIPO = {
  gimnasio: [] as Equipo[], // sin restricción
  mancuernas: ["mancuernas", "peso_corporal"] as Equipo[],
  peso_corporal: ["peso_corporal"] as Equipo[],
} as const;
export type PreferenciaEquipo = keyof typeof PREFERENCIAS_EQUIPO;

export const PREFERENCIA_EQUIPO_LABEL: Record<PreferenciaEquipo, string> = {
  gimnasio: "Gimnasio completo",
  mancuernas: "Mancuernas y peso corporal",
  peso_corporal: "Solo peso corporal",
};

// Sexo: ajusta el volumen del plan. "mujer" baja un set en compuestos y, si no
// se elige zona, enfatiza glúteos por defecto (queja habitual: "muy pesado").
export const SEXOS = ["mujer", "hombre", "sin_especificar"] as const;
export type Sexo = (typeof SEXOS)[number];

export const SEXO_LABEL: Record<Sexo, string> = {
  mujer: "Mujer",
  hombre: "Hombre",
  sin_especificar: "Prefiero no decirlo",
};

// Zonas que el cliente puede pedir enfatizar. Cada una mapea a grupos reales
// de la tabla `ejercicios` (columna grupo_muscular).
export const ENFASIS = [
  "gluteos",
  "piernas",
  "pecho",
  "espalda",
  "hombros",
  "brazos",
  "core",
] as const;
export type Enfasis = (typeof ENFASIS)[number];

export const ENFASIS_LABEL: Record<Enfasis, string> = {
  gluteos: "Glúteos",
  piernas: "Piernas",
  pecho: "Pecho",
  espalda: "Espalda",
  hombros: "Hombros",
  brazos: "Brazos",
  core: "Abdomen",
};

export const ENFASIS_GRUPOS: Record<Enfasis, string[]> = {
  gluteos: ["gluteos"],
  piernas: ["cuadriceps", "isquios", "gemelos"],
  pecho: ["pecho"],
  espalda: ["espalda"],
  hombros: ["hombros"],
  brazos: ["biceps", "triceps"],
  core: ["core"],
};

// Reverso de ENFASIS_GRUPOS: grupo_muscular real → zona de énfasis. Se usa para
// inferir el énfasis desde los ejercicios que el cliente eligió en el armado
// manual cuando pide "generar automático con lo que tengo".
export const GRUPO_A_ENFASIS: Record<string, Enfasis> = Object.fromEntries(
  (Object.entries(ENFASIS_GRUPOS) as [Enfasis, string[]][]).flatMap(
    ([enf, grupos]) => grupos.map((g) => [g, enf] as const),
  ),
);

export const MAX_ENFASIS = 2;

// ── Modo manual (SPEC_PANEL_AVANZADO_RUTINA.md) ──
// Técnicas de intensidad que el cliente puede asignar por ejercicio cuando arma
// la rutina a mano. "ninguna" es el default; en la base se guarda como null.
// La descripción se muestra siempre como texto de ayuda, nunca solo el nombre.
export const TECNICAS = [
  "ninguna",
  "dropset",
  "rest_pause",
  "myo_reps",
  "superserie",
  "cluster_set",
  "fst7",
] as const;
export type Tecnica = (typeof TECNICAS)[number];

export const TECNICA_LABEL: Record<Tecnica, string> = {
  ninguna: "Sin técnica",
  dropset: "Dropset",
  rest_pause: "Rest-pause",
  myo_reps: "Myo-reps",
  superserie: "Superserie",
  cluster_set: "Cluster set",
  fst7: "FST-7 (Hany Rambod)",
};

export const TECNICA_DESC: Record<Tecnica, string> = {
  ninguna: "",
  dropset: "Bajás el peso sin descansar y seguís hasta el fallo.",
  rest_pause: "Descanso corto de 10-15s dentro de la misma serie.",
  myo_reps: "Una serie de activación + mini-series cortas con poco descanso.",
  superserie: "Dos ejercicios seguidos sin descanso entre ellos.",
  cluster_set: "Repeticiones divididas en bloques con micro-pausas.",
  fst7: "7 series finales de 10–12 reps con 30–45s de descanso para estiramiento y bombeo fascial.",
};

// Tope de ejercicios por día: el mismo que usa aplicarEnfasis() en el motor.
export const MAX_EJERCICIOS_DIA = 8;
// Tope de días en el armado manual (el motor automático llega hasta 6).
export const MAX_DIAS_MANUAL = 6;

// Opciones fijas para el editor de la rutina (menús desplegables, sin escritura
// libre). Los valores de REPS_OPCIONES cubren todo lo que emite el motor.
export const SERIES_OPCIONES = [1, 2, 3, 4, 5] as const;
export const REPS_OPCIONES = [
  "3–5",
  "5",
  "6",
  "6–8",
  "6–12",
  "8–10",
  "8–12",
  "10–12",
  "12–15",
  "15",
  "15–20",
  "20",
  "20+",
] as const;

// ── Modo avanzado (SPEC_RUTINA_AVANZADA.md) ──
// Solo se ofrece a clientes de nivel avanzado. Afinan la generación automática:
// el motor sigue siendo el mismo, con más entrada. Si `EntradaMotor.avanzado`
// es undefined, la salida es idéntica a la de antes.

export const SPLITS = [
  "auto",
  "full_body",
  "upper_lower",
  "push_pull_legs",
  "torso_pierna",
] as const;
export type Split = (typeof SPLITS)[number];

export const SPLIT_LABEL: Record<Split, string> = {
  auto: "Automático (según días y nivel)",
  full_body: "Cuerpo completo",
  upper_lower: "Tren superior / Tren inferior",
  push_pull_legs: "Empuje / Tracción / Pierna",
  torso_pierna: "Torso / Pierna",
};

// Días válidos por split. El form bloquea las combinaciones que no cierran.
export const SPLIT_DIAS_OK: Record<Split, number[]> = {
  auto: [2, 3, 4, 5, 6],
  full_body: [2, 3, 4],
  upper_lower: [2, 3, 4, 5, 6],
  push_pull_legs: [3, 6],
  torso_pierna: [4],
};

export const RANGOS = [
  "estandar",
  "fuerza_hipertrofia",
  "hipertrofia",
  "metabolico",
  "ondulante",
] as const;
export type Rango = (typeof RANGOS)[number];

export const RANGO_LABEL: Record<Rango, string> = {
  estandar: "Según el objetivo (por defecto)",
  fuerza_hipertrofia: "Fuerza-hipertrofia (6–8)",
  hipertrofia: "Hipertrofia clásica (6–12)",
  metabolico: "Metabólico (15–20+)",
  ondulante: "Ondulante: pesado / medio / liviano por día",
};

export const VOLUMENES = ["mev", "estandar", "mav"] as const;
export type Volumen = (typeof VOLUMENES)[number];

export const VOLUMEN_LABEL: Record<Volumen, string> = {
  mev: "Mínimo efectivo (~10 series/grupo/semana)",
  estandar: "Estándar (~14)",
  mav: "Alto (~18–20)",
};

// Presupuesto de ranuras extra de énfasis y tope de ejercicios por día, por
// nivel de volumen. `estandar` reproduce los hardcodes actuales (3 y 8).
export const VOLUMEN_PARAMS: Record<
  Volumen,
  { extras: number; maxDia: number }
> = {
  mev: { extras: 1, maxDia: 6 },
  estandar: { extras: 3, maxDia: 8 },
  mav: { extras: 5, maxDia: 10 },
};

export const RIR_OPCIONES = ["2-3", "1-2", "0-1"] as const;
export type Rir = (typeof RIR_OPCIONES)[number];

export const RIR_LABEL: Record<Rir, string> = {
  "2-3": "Suave: dejá 2–3 repeticiones en reserva",
  "1-2": "Exigente: dejá 1–2 repeticiones en reserva",
  "0-1": "Al límite: 0–1 en reserva (permite fallo)",
};

export const ORDENES = ["compuestos_primero", "prefatiga_zona"] as const;
export type Orden = (typeof ORDENES)[number];

export const ORDEN_LABEL: Record<Orden, string> = {
  compuestos_primero: "Compuestos primero (por defecto)",
  prefatiga_zona: "Prefatiga: aislar la zona de énfasis antes del compuesto",
};

export const MOLESTIAS = ["hombro", "rodilla", "lumbar", "muñeca", "codo"] as const;
export type Molestia = (typeof MOLESTIAS)[number];

export const MOLESTIA_LABEL: Record<Molestia, string> = {
  hombro: "Hombro",
  rodilla: "Rodilla",
  lumbar: "Zona lumbar",
  muñeca: "Muñeca",
  codo: "Codo",
};

// Nombre en castellano llano del grupo muscular, para la vista del cliente.
export const GRUPO_MUSCULAR_LABEL: Record<string, string> = {
  pecho: "pecho",
  espalda: "espalda",
  hombros: "hombros",
  biceps: "bíceps",
  triceps: "tríceps",
  cuadriceps: "cuádriceps",
  isquios: "isquiotibiales",
  gluteos: "glúteos",
  gemelos: "gemelos",
  core: "abdomen",
};

export type OpcionesAvanzadas = {
  split: Split;
  rango: Rango;
  volumen: Volumen;
  rir: Rir;
  orden: Orden;
  tecnicaAislamientos: Tecnica; // "ninguna" = sin técnica
  evitar: Molestia[];
};

export const OPCIONES_AVANZADAS_DEFAULT: OpcionesAvanzadas = {
  split: "auto",
  rango: "estandar",
  volumen: "estandar",
  rir: "2-3",
  orden: "compuestos_primero",
  tecnicaAislamientos: "ninguna",
  evitar: [],
};

export type Ejercicio = {
  id: string;
  slug: string | null;
  nombre: string;
  grupo_muscular: string | null;
  patron: string | null;
  equipo: string | null;
  nivel: string | null;
  imagen_url: string | null;
  descripcion: string | null;
};

export type EntradaMotor = {
  objetivo: Objetivo;
  dias: number; // 2..6
  nivel: Nivel;
  preferencia: PreferenciaEquipo;
  sexo: Sexo;
  enfasis: Enfasis[]; // 0..MAX_ENFASIS zonas a priorizar
  // Zonas con dolor/molestia a evitar desde el armado inicial. Mismo vocabulario
  // que MOLESTIAS; se pasa al filtro estaBloqueado() en la selección (Fase 4).
  // Aplica a todos los niveles (el "evitar" de OpcionesAvanzadas es solo avanzado).
  zonasDolor?: string[];
  seed?: number; // varía la selección entre candidatos equivalentes (regenerar)
  avanzado?: OpcionesAvanzadas; // solo nivel avanzado; undefined = flujo actual
  // Solo para el simulador de /admin: acumula un trace legible de qué le suma
  // cada elección al plan. El flujo real nunca lo pasa → cero cambio de salida.
  debug?: boolean;
};

// Rol de la ranura que ocupa el ejercicio dentro del día.
export type Rol = "primario" | "secundario" | "aislamiento";

export type Ranura = {
  grupo: string;
  patron?: string;
  rol: Rol;
};

export type Bloque = {
  titulo: string;
  ranuras: Ranura[];
};

export type ItemGenerado = {
  ejercicio_slug: string;
  series: number;
  repeticiones: string;
  nota: string; // descanso / cue corto / RIR
  tecnica?: Tecnica; // técnica de intensidad en la última serie (modo avanzado)
  rol?: Rol; // informativo (lo usa el simulador de /admin); no se persiste
};

export type DiaGenerado = {
  titulo: string;
  items: ItemGenerado[];
};

export type PlanGenerado = {
  entrada: EntradaMotor;
  dias: DiaGenerado[];
  // Presente solo si entrada.debug === true (simulador del panel de soporte).
  trace?: string[];
};
