"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth";

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
 *
 * Cuenta con service_role: la RLS de `registros_entrada` sólo le deja al socio
 * ver sus propias entradas, y con su cliente el aforo daba siempre ~0%. Por eso
 * se valida que el gimnasio sea el de la sesión y sólo se devuelve el número.
 */
export async function obtenerAforo(gimnasioId: string): Promise<AforoInfo | null> {
  if (!gimnasioId) return null;
  const profile = await getSessionProfile();
  if (!profile || profile.gimnasio_id !== gimnasioId) return null;
  const supabase = createAdminClient();

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
