import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export type InfoPlanGimnasio = {
  nombre: string;
  esBasico: boolean;
  esPro: boolean;
  esElite: boolean;
  vigente: boolean;
  soloLectura: boolean;
  venceEl: string | null;
  permiteCheckin: boolean;
  permiteCobroAutomatico: boolean;
  permiteAvisosMorosidad: boolean;
  permiteReposoCheckin: boolean;
  permiteAsistenteIa: boolean;
  permiteControlCaja: boolean;
};

/**
 * Verifica el plan actual del gimnasio y evalúa qué características
 * avanzadas (Elite / Pro) tiene habilitadas.
 * 
 * Siempre consulta con createAdminClient() (service_role) para que RLS
 * en planes_plataforma no bloquee las consultas a usuarios autenticados.
 */
export async function verificarPlanGimnasio(
  _db: SupabaseClient | null | undefined,
  gimnasioId: string,
): Promise<InfoPlanGimnasio> {
  const db = createAdminClient();
  const { data: gym } = await db
    .from("gimnasios")
    .select(
      "estado, plan_plataforma_vence_el, plan:planes_plataforma(nombre)",
    )
    .eq("id", gimnasioId)
    .maybeSingle();

  const estado = gym?.estado ?? "prueba";
  const planObj = (gym as { plan?: { nombre?: string } | null } | null)?.plan;
  const nombre = planObj?.nombre ?? (estado === "prueba" ? "Básico" : "Básico");

  const vence = gym?.plan_plataforma_vence_el
    ? new Date(gym.plan_plataforma_vence_el as string)
    : null;
  const vigente = !vence || vence >= new Date();
  const soloLectura = estado === "solo_lectura";

  const esElite = nombre === "Elite" && vigente && !soloLectura;
  const esPro = (nombre === "Pro" || nombre === "Elite") && vigente && !soloLectura;
  const esBasico = vigente && !soloLectura;

  return {
    nombre,
    esBasico,
    esPro,
    esElite,
    vigente,
    soloLectura,
    venceEl: gym?.plan_plataforma_vence_el ?? null,
    permiteCheckin: esElite,
    permiteCobroAutomatico: esElite,
    permiteAvisosMorosidad: esElite,
    permiteReposoCheckin: esElite,
    permiteAsistenteIa: esElite,
    permiteControlCaja: esElite,
  };
}
