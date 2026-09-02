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

export const MAX_ENFASIS = 2;

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
