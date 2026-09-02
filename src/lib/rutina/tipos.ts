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
