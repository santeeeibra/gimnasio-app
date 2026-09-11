import type { Ejercicio, PlanGenerado, ItemGenerado } from "./tipos";

export type MetricaVolumen = {
  directas: number;
  indirectas: number;
  totalEfectivo: number; // directas + indirectas * 0.5
  estado: "mev" | "mav" | "mrv"; // <10 mev, 10-18 mav, >18 mrv
};

export type BalanceVolumenSemanal = Record<string, MetricaVolumen>;

const GRUPOS_CANONICOS = [
  "pecho",
  "espalda",
  "hombros",
  "biceps",
  "triceps",
  "cuadriceps",
  "isquios",
  "gluteos",
  "gemelos",
  "core",
] as const;

/**
 * Calcula el balance de volumen semanal (directo, indirecto con sinergistas 0.5x y efectivo)
 * a partir de un plan generado y la lista de ejercicios disponibles.
 */
export function calcularBalanceVolumen(
  plan: PlanGenerado,
  ejercicios: Ejercicio[],
): BalanceVolumenSemanal {
  const ejMap = new Map<string, Ejercicio>();
  for (const ej of ejercicios) {
    if (ej.slug) ejMap.set(ej.slug, ej);
    if (ej.id) ejMap.set(ej.id, ej);
  }

  const conteo: Record<string, { directas: number; indirectas: number }> = {};

  const asegurarGrupo = (grupo: string) => {
    if (!conteo[grupo]) {
      conteo[grupo] = { directas: 0, indirectas: 0 };
    }
  };

  for (const grupo of GRUPOS_CANONICOS) {
    asegurarGrupo(grupo);
  }

  for (const dia of plan.dias) {
    for (const item of dia.items as ItemGenerado[]) {
      const ej = ejMap.get(item.ejercicio_slug);
      if (!ej) continue;

      const series = item.series || 0;
      const grupo = ej.grupo_muscular?.trim().toLowerCase();
      if (grupo) {
        asegurarGrupo(grupo);
        conteo[grupo].directas += series;
      }

      const patron = ej.patron?.trim().toLowerCase();
      const esAislamiento = item.rol === "aislamiento" || patron === "aislamiento";

      if (!esAislamiento && patron) {
        const sinergistas: string[] = [];

        if (patron === "empuje_horizontal" || patron === "empuje_vertical") {
          sinergistas.push("triceps", "hombros");
        } else if (patron === "traccion_horizontal" || patron === "traccion_vertical") {
          sinergistas.push("biceps", "hombros");
        } else if (patron === "dominante_cadera") {
          // SKILL §4 (Peso Muerto Rumano): 1.0 a isquios (directo) + 0.5 a
          // glúteos Y erectores espinales. No hay grupo "erectores" en el
          // canon; se acredita a "core" (misma función anti-flexión lumbar).
          sinergistas.push("gluteos", "core");
        } else if (patron === "dominante_rodilla") {
          sinergistas.push("gluteos");
        }

        for (const sin of sinergistas) {
          if (sin !== grupo) {
            asegurarGrupo(sin);
            conteo[sin].indirectas += series;
          }
        }
      }
    }
  }

  const balance: BalanceVolumenSemanal = {};

  for (const [grupo, valores] of Object.entries(conteo)) {
    const totalEfectivo = valores.directas + valores.indirectas * 0.5;
    let estado: "mev" | "mav" | "mrv";
    if (totalEfectivo < 10) {
      estado = "mev";
    } else if (totalEfectivo <= 18) {
      estado = "mav";
    } else {
      estado = "mrv";
    }

    balance[grupo] = {
      directas: valores.directas,
      indirectas: valores.indirectas,
      totalEfectivo,
      estado,
    };
  }

  return balance;
}

/**
 * Devuelve un resumen legible de una línea con los totales más relevantes del balance de volumen.
 */
export function resumirBalance(balance: BalanceVolumenSemanal): string {
  const formatear = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

  const gruposActivos = Object.entries(balance).filter(
    ([, metrica]) => metrica.totalEfectivo > 0,
  );

  if (gruposActivos.length === 0) {
    return "Sin volumen semanal registrado.";
  }

  return gruposActivos
    .map(
      ([grupo, m]) =>
        `${grupo}: ${formatear(m.totalEfectivo)} series (${m.estado.toUpperCase()}) [dir: ${m.directas}, ind: ${m.indirectas}]`,
    )
    .join(" · ");
}
