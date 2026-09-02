// Tipos compartidos del motor de rutinas.

export const OBJETIVOS = ["fuerza", "hipertrofia", "resistencia", "bajar_grasa"] as const;
export const NIVELES = ["principiante", "intermedio", "avanzado"] as const;
export const EQUIPOS = ["barra", "mancuernas", "maquina", "polea", "peso_corporal"] as const;

export type Objetivo = (typeof OBJETIVOS)[number];
export type Nivel = (typeof NIVELES)[number];
export type Equipo = (typeof EQUIPOS)[number];

export const OBJETIVO_LABEL: Record<Objetivo, string> = {
  fuerza: "Fuerza",
  hipertrofia: "Masa muscular",
  resistencia: "Resistencia",
  bajar_grasa: "Bajar grasa",
};

export const NIVEL_LABEL: Record<Nivel, string> = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
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
] as const;
export type Tecnica = (typeof TECNICAS)[number];

export const TECNICA_LABEL: Record<Tecnica, string> = {
  ninguna: "Sin técnica",
  dropset: "Dropset",
  rest_pause: "Rest-pause",
  myo_reps: "Myo-reps",
  superserie: "Superserie",
  cluster_set: "Cluster set",
};

export const TECNICA_DESC: Record<Tecnica, string> = {
  ninguna: "",
  dropset: "Bajás el peso sin descansar y seguís hasta el fallo.",
  rest_pause: "Descanso corto de 10-15s dentro de la misma serie.",
  myo_reps: "Una serie de activación + mini-series cortas con poco descanso.",
  superserie: "Dos ejercicios seguidos sin descanso entre ellos.",
  cluster_set: "Repeticiones divididas en bloques con micro-pausas.",
};

// Tope de ejercicios por día: el mismo que usa aplicarEnfasis() en el motor.
export const MAX_EJERCICIOS_DIA = 8;
// Tope de días en el armado manual (el motor automático llega hasta 6).
export const MAX_DIAS_MANUAL = 6;

// Opciones fijas para el editor de la rutina (menús desplegables, sin escritura
// libre). Los valores de REPS_OPCIONES cubren todo lo que emite el motor.
export const SERIES_OPCIONES = [1, 2, 3, 4, 5] as const;
export const REPS_OPCIONES = [
  "5",
  "6",
  "6–8",
  "8–10",
  "8–12",
  "10–12",
  "12–15",
  "15",
  "15–20",
  "20",
] as const;

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
  seed?: number; // varía la selección entre candidatos equivalentes (regenerar)
};

export type ItemGenerado = {
  ejercicio_slug: string;
  series: number;
  repeticiones: string;
  nota: string; // descanso / cue corto
};

export type DiaGenerado = {
  titulo: string;
  items: ItemGenerado[];
};

export type PlanGenerado = {
  entrada: EntradaMotor;
  dias: DiaGenerado[];
};
