import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { LIMITE_ALUMNOS_GRATIS } from "@/types/partner";

export type CupoInfo = {
  ok: boolean; // true si todavía se puede agregar un socio
  usados: number;
  max: number | null; // null = plan ilimitado
  plan: string | null;
  esGratuito: boolean;
};

// Cuenta socios (filas en `clientes`, un profile = un asiento; los `en_prueba`
// también cuentan) y lo compara con el tope del plan de plataforma del gym.
// Si no tiene plan de plataforma asignado, rige el Plan Inicial Gratuito
// con límite estricto de 40 alumnos activos (LIMITE_ALUMNOS_GRATIS).
export async function cupoSocios(
  db: SupabaseClient,
  gimnasioId: string,
): Promise<CupoInfo> {
  const { data: gym } = await db
    .from("gimnasios")
    .select("plan_plataforma_id, plan:planes_plataforma(nombre, max_socios)")
    .eq("id", gimnasioId)
    .single();

  const tienePlanAsignado = !!gym?.plan_plataforma_id;
  const plan = (gym?.plan ?? null) as {
    nombre: string;
    max_socios: number | null;
  } | null;

  const { count } = await db
    .from("clientes")
    .select("id", { count: "exact", head: true })
    .eq("gimnasio_id", gimnasioId)
    .eq("acceso_habilitado", true);
  const usados = count ?? 0;

  if (!tienePlanAsignado || !plan) {
    return {
      ok: usados < LIMITE_ALUMNOS_GRATIS,
      usados,
      max: LIMITE_ALUMNOS_GRATIS,
      plan: "Plan Inicial Gratuito",
      esGratuito: true,
    };
  }

  const max = plan.max_socios;
  return {
    ok: max == null || usados < max,
    usados,
    max,
    plan: plan.nombre,
    esGratuito: false,
  };
}

