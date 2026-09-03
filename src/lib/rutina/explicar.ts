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
      `La estructura se arma según los días y el nivel, buscando tocar cada músculo unas 2 veces por semana. ${TEORIA.frecuencia.resumen}`,
    );
  }

  if (av && av.rango !== "estandar") {
    partes.push(
      `Repeticiones: ${RANGO_LABEL[av.rango].toLowerCase()}.` +
        (av.rango === "ondulante" ? ` ${TEORIA.dup.resumen} (${TEORIA.dup.fuente})` : ""),
    );
  }
  if (av && av.volumen !== "estandar") {
    partes.push(
      `Volumen: ${VOLUMEN_LABEL[av.volumen].toLowerCase()}. ${TEORIA.volumen.resumen}`,
    );
  }
  if (av && av.rir !== "2-3") {
    partes.push(`${TEORIA.rir.resumen} (${TEORIA.rir.fuente})`);
  }
  if (av && av.tecnicaAislamientos !== "ninguna") {
    partes.push(
      `Se aplica una técnica de intensidad en la última serie de los aislamientos. ${TEORIA.tecnicas.resumen}`,
    );
  }
  if (av && av.orden === "prefatiga_zona") {
    partes.push(`${TEORIA.orden.resumen} (${TEORIA.orden.fuente})`);
  }
  if (av && av.evitar.length > 0) {
    partes.push(`${TEORIA.molestia.resumen}`);
  }
  if (entrada.sexo === "mujer") {
    partes.push(TEORIA.sexo_mujer.resumen);
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

  return plan.dias.map((dia) => {
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
    // El primer ejercicio real del día manda el texto: con prefatiga de zona
    // (o cuando lo que abre es un aislamiento) NO es el movimiento más pesado.
    const primeroEsAislamiento = ejs[0]?.patron === "aislamiento";

    const frases: string[] = [];
    frases.push(
      `Trabajás ${grupos || "todo el cuerpo"} (${dia.items.length} ejercicios).`,
    );
    if (primero && primeroSeries && primeroReps) {
      const rx = `${primeroSeries} series de ${primeroReps.replace("–", " a ")}`;
      frases.push(
        primeroEsAislamiento
          ? `Arrancás aislando ${primero.toLowerCase()} (${rx}) para pre-fatigar la zona antes del básico.`
          : `Arrancás con ${primero.toLowerCase()} (${rx}): es el movimiento más pesado y conviene hacerlo con energía fresca.`,
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
          ? `Como pediste enfocar ${zonas}, esos músculos se aíslan primero y con trabajo extra.`
          : `Como pediste enfocar ${zonas}, esos ejercicios van primero y con trabajo extra.`,
      );
    }
    // Solo hablamos de accesorios si el día realmente tiene aislamientos; en
    // días muy compuestos (p. ej. fuerza) puede no haber.
    const hayAccesorios = ejs.some((e) => e.patron === "aislamiento");
    if (hayAccesorios) {
      frases.push(
        "El resto son accesorios: más repeticiones y menos peso para sumar volumen sin tanta fatiga.",
      );
    }
    return frases.join(" ");
  });
}
