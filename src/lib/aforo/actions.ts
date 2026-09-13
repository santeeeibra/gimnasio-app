"use server";

import { createClient } from "@/lib/supabase/server";

/** Duración típica de una sesión de entreno: ventana para contar "en sala ahora". */
const VENTANA_SESION_MIN = 90;

export type AforoInfo = {
  enSala: number;
  capacidadMaxima: number;
  porcentaje: number;
};

/**
 * Aforo en tiempo real de un gimnasio: cuenta los `registros_entrada` de los
 * últimos VENTANA_SESION_MIN minutos como "socios en sala ahora" (no existe
 * check-out, así que se aproxima con la duración típica de una sesión).
 */
export async function obtenerAforo(gimnasioId: string): Promise<AforoInfo | null> {
  if (!gimnasioId) return null;
  const supabase = await createClient();

  const desde = new Date(Date.now() - VENTANA_SESION_MIN * 60 * 1000).toISOString();

  const [{ data: gym }, { count }] = await Promise.all([
    supabase
      .from("gimnasios")
      .select("capacidad_maxima")
      .eq("id", gimnasioId)
      .maybeSingle(),
    supabase
      .from("registros_entrada")
      .select("id", { count: "exact", head: true })
      .eq("gimnasio_id", gimnasioId)
      .gte("creado_en", desde),
  ]);

  const capacidadMaxima = gym?.capacidad_maxima ?? 50;
  const enSala = count ?? 0;
  const porcentaje = capacidadMaxima > 0 ? Math.min(100, Math.round((enSala / capacidadMaxima) * 100)) : 0;

  return { enSala, capacidadMaxima, porcentaje };
}
