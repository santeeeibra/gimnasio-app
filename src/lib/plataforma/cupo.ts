import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type CupoInfo = {
  ok: boolean; // true si todavía se puede agregar un socio
  usados: number;
  max: number | null; // null = plan ilimitado o sin plan asignado
  plan: string | null;
};

// Cuenta socios (filas en `clientes`, un profile = un asiento; los `en_prueba`
// también cuentan) y lo compara con el tope del plan de plataforma del gym.
// Sin plan asignado => siempre ok, para no romper gimnasios existentes.
// Pasar un cliente con permisos de lectura sobre planes_plataforma
// (service_role, o el RLS que corresponda).
export async function cupoSocios(
  db: SupabaseClient,
  gimnasioId: string,
): Promise<CupoInfo> {
  const { data: gym } = await db
    .from("gimnasios")
    .select("plan:planes_plataforma(nombre, max_socios)")
    .eq("id", gimnasioId)
    .single();

  const plan = (gym?.plan ?? null) as {
    nombre: string;
    max_socios: number | null;
  } | null;

  const { count } = await db
    .from("clientes")
    .select("id", { count: "exact", head: true })
    .eq("gimnasio_id", gimnasioId);
  const usados = count ?? 0;

  const max = plan?.max_socios ?? null;
  return {
    ok: max == null || usados < max,
    usados,
    max,
    plan: plan?.nombre ?? null,
  };
}
