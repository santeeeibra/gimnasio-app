import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LIMITE_ALUMNOS_GRATIS,
  LIMIT_EXCEEDED_UPGRADE_REQUIRED,
  type CupoGratuitoInfo,
} from "@/types/partner";

/**
 * Cap duro de 40 alumnos activos para gimnasios "free/starter" (sin plan de
 * plataforma asignado). Un gimnasio CON plan asignado (Básico/Pro/Elite/...)
 * no pasa por acá: su cupo lo maneja `cupoSocios()` (src/lib/plataforma/cupo.ts)
 * según el `max_socios` de ese plan.
 *
 * Espejo en SQL: `gimnasio_puede_agregar_alumno()` +
 * el trigger `clientes_check_limite_gratuito` (fuente de verdad final,
 * corre aunque este chequeo de la capa de aplicación se salte por error).
 */
export async function verificarCupoGratuito(
  db: SupabaseClient,
  gimnasioId: string,
): Promise<CupoGratuitoInfo> {
  const { data: gym } = await db
    .from("gimnasios")
    .select("plan_plataforma_id")
    .eq("id", gimnasioId)
    .single();

  const tienePlanAsignado = !!gym?.plan_plataforma_id;
  if (tienePlanAsignado) {
    return {
      tienePlanAsignado: true,
      usados: 0,
      max: LIMITE_ALUMNOS_GRATIS,
      restantes: LIMITE_ALUMNOS_GRATIS,
      canAddMember: true,
    };
  }

  const { count } = await db
    .from("clientes")
    .select("id", { count: "exact", head: true })
    .eq("gimnasio_id", gimnasioId)
    .eq("acceso_habilitado", true);
  const usados = count ?? 0;

  return {
    tienePlanAsignado: false,
    usados,
    max: LIMITE_ALUMNOS_GRATIS,
    restantes: Math.max(0, LIMITE_ALUMNOS_GRATIS - usados),
    canAddMember: usados < LIMITE_ALUMNOS_GRATIS,
  };
}

export const MENSAJE_LIMITE_GRATUITO =
  `Llegaste al límite de ${LIMITE_ALUMNOS_GRATIS} alumnos activos del plan gratuito. ` +
  `Contactá a soporte para pasar a un plan pago y seguir sumando socios.`;

/** true si el error viene del trigger SQL `clientes_check_limite_gratuito`. */
export function esErrorLimiteGratuito(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const msg =
    ("message" in err && String((err as { message?: unknown }).message)) || "";
  const detail =
    ("details" in err && String((err as { details?: unknown }).details)) || "";
  return (
    msg.includes(LIMIT_EXCEEDED_UPGRADE_REQUIRED) ||
    detail.includes(LIMIT_EXCEEDED_UPGRADE_REQUIRED)
  );
}
