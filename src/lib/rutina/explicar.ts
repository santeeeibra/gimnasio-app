// "Explicame esta rutina" (SPEC §7.1). Texto por reglas, sin IA: convierte el
// PlanGenerado en un párrafo por día + un resumen general, citando la teoría de
// teoria.ts. Se corre en la generación y se guarda en rutinas.preferencias para
// que la vista del cliente y la del dueño solo tengan que mostrarlo.

import { TEORIA } from "./teoria";
import {
  ENFASIS_GRUPOS,
  ENFASIS_LABEL,
  GRUPO_MUSCULAR_LABEL,
  OBJETIVO_LABEL,
  SPLIT_LABEL,
  RANGO_LABEL,
  VOLUMEN_LABEL,
  type Ejercicio,
  type EntradaMotor,
  type PlanGenerado,
} from "./tipos";

const GRUPO_LABEL = GRUPO_MUSCULAR_LABEL;

function listar(palabras: string[]): string {
  if (palabras.length === 0) return "";
  if (palabras.length === 1) return palabras[0];
  return `${palabras.slice(0, -1).join(", ")} y ${palabras[palabras.length - 1]}`;
}

export function explicarGeneral(entrada: EntradaMotor): string {
  const partes: string[] = [];
  const obj = OBJETIVO_LABEL[entrada.objetivo] ?? entrada.objetivo;
  partes.push(
    `Plan de ${entrada.dias} días para "${obj.toLowerCase()}", nivel ${entrada.nivel}.`,
  );

  const av = entrada.avanzado;
  if (av && av.split !== "auto") {
    partes.push(
      `Estructura elegida: ${SPLIT_LABEL[av.split].toLowerCase()}. ${TEORIA.frecuencia.resumen} (${TEORIA.frecuencia.fuente})`,
    );
  } else {
    partes.push(
      `Estructurada bajo Frecuencia 2x Óptima (${TEORIA.frecuencia.fuente}) para maximizar la síntesis proteica por grupo muscular sin acumular fatiga innecesaria.`,
    );
  }

  partes.push(
    `${TEORIA.volumen.resumen} (${TEORIA.volumen.fuente}), ajustado al techo de 6–8 series por sesión para evitar junk volume (${TEORIA.schoenfeld_techo.fuente}).`,
  );

  partes.push(
    `Proximidad al fallo graduada a RIR 1–2 (${TEORIA.rir.fuente}), priorizando tensión mecánica en repeticiones efectivas (${TEORIA.beardsley_rep_efectivas.fuente}) y estabilidad articular (${TEORIA.pradells_estabilidad.fuente}; ${TEORIA.glass_angulacion.fuente}).`,
  );

  if (av && av.rango !== "estandar") {
    partes.push(
      `Repeticiones: ${RANGO_LABEL[av.rango].toLowerCase()}.` +
        (av.rango === "ondulante" ? ` ${TEORIA.dup.resumen} (${TEORIA.dup.fuente})` : ""),
    );
  }
  if (av && av.volumen !== "estandar") {
    partes.push(
      `Ajuste de volumen: ${VOLUMEN_LABEL[av.volumen].toLowerCase()}.`,
    );
  }
  if (av && av.tecnicaAislamientos !== "ninguna") {
    partes.push(
      `Técnica de intensidad en la serie final de aislamientos (${TEORIA.tecnicas.fuente}).`,
    );
  }
  if (av && av.orden === "prefatiga_zona") {
    partes.push(`${TEORIA.orden.resumen} (${TEORIA.orden.fuente}).`);
  }
  if (av && av.evitar.length > 0) {
    partes.push(`${TEORIA.molestia.resumen} (${TEORIA.molestia.fuente}).`);
  }
  if (entrada.sexo === "mujer") {
    partes.push(`${TEORIA.sexo_mujer.resumen} (${TEORIA.sexo_mujer.fuente}).`);
  }
  return partes.join(" ");
}

export function explicarPlan(
  plan: PlanGenerado,
  entrada: EntradaMotor,
  ejercicios: Ejercicio[],
): string[] {
  const porSlug = new Map(ejercicios.filter((e) => e.slug).map((e) => [e.slug!, e]));
  const enfasisGrupos = new Set(
    entrada.enfasis.flatMap((z) => ENFASIS_GRUPOS[z]),
  );
  const prefatiga = entrada.avanzado?.orden === "prefatiga_zona";

  const frasesAccesorios = [
    "El bloque secundario combina multiarticulares y máquinas guiadas para acumular volumen hipertrófico efectivo sin colapsar la zona lumbar.",
    "Los ejercicios complementarios se trabajan en ángulos de máxima elongación muscular para estimular la hipertrofia mediada por estiramiento (Pedrosa et al. 2022; Jeff Nippard).",
    "El cierre de sesión integra monoarticulares en poleas a RIR 1–0, agotando fibras de alto umbral con total estabilidad biomecánica (Joan Pradells / Charles Glass).",
    "El resto del trabajo incluye variantes unilaterales y aislamientos guiados para corregir asimetrías y proteger la articulación lumbopélvica (Don Saladino).",
  ];

  return plan.dias.map((dia, di) => {
    const ejs = dia.items
      .map((it) => porSlug.get(it.ejercicio_slug))
      .filter((e): e is Ejercicio => !!e);

    const grupos = listar(
      [...new Set(ejs.map((e) => GRUPO_LABEL[e.grupo_muscular ?? ""] ?? e.grupo_muscular))]
        .filter(Boolean)
        .slice(0, 4),
    );

    const primero = ejs[0]?.nombre;
    const primeroSeries = dia.items[0]?.series;
    const primeroReps = dia.items[0]?.repeticiones;
    const primeroEsAislamiento = ejs[0]?.patron === "aislamiento";

    const frases: string[] = [];
    frases.push(
      `Trabajás ${grupos || "todo el cuerpo"} (${dia.items.length} ejercicios).`,
    );
    if (primero && primeroSeries && primeroReps) {
      const rx = `${primeroSeries} series de ${primeroReps.replace("–", " a ")}`;
      frases.push(
        primeroEsAislamiento
          ? `Arrancás aislando ${primero.toLowerCase()} (${rx}) para pre-fatigar el músculo objetivo antes del trabajo pesado.`
          : `Arrancás con ${primero.toLowerCase()} (${rx}): demanda mayor energía neural y tensión mecánica en estado fresco (${TEORIA.orden.fuente}).`,
      );
    }
    const grupoEnfasisEnDia = ejs.some((e) =>
      enfasisGrupos.has(e.grupo_muscular ?? ""),
    );
    if (grupoEnfasisEnDia && entrada.enfasis.length > 0) {
      const zonas = listar(
        entrada.enfasis.map((z) => ENFASIS_LABEL[z].toLowerCase()),
      );
      frases.push(
        prefatiga
          ? `Priorizás ${zonas}: esos músculos se aíslan primero con dosis extra de volumen MAV.`
          : `Priorizás ${zonas}: esos ejercicios abren la sesión y reciben mayor volumen efectivo.`,
      );
    }
    const hayAccesorios = ejs.some((e) => e.patron === "aislamiento" || e.patron === "secundario");
    if (hayAccesorios) {
      frases.push(frasesAccesorios[di % frasesAccesorios.length]);
    }
    return frases.join(" ");
  });
}
