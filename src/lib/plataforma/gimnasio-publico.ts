import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type GimnasioPublico = { id: string; slug: string; nombre: string; estado: string };

// Busca un gimnasio REAL (tipo_cuenta = gym) por su código (slug) o por su
// nombre exacto sin distinguir mayúsculas. Las cuentas individuales también
// son filas de `gimnasios` pero su nombre es el de una persona: nunca entran
// acá. El texto se pasa entre comillas al filtro .or() para que una coma o
// un paréntesis no lo rompan, y se escapan los comodines de ilike.
export async function buscarGimnasioReal(
  admin: SupabaseClient,
  texto: string,
): Promise<GimnasioPublico | null> {
  const limpio = texto.trim();
  if (!limpio) return null;
  const comillas = (v: string) => `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  const nombreLiteral = limpio.replace(/[\\%_]/g, (m) => `\\${m}`);

  const { data } = await admin
    .from("gimnasios")
    .select("id, slug, nombre, estado")
    .eq("tipo_cuenta", "gym")
    .or(`slug.eq.${comillas(limpio.toLowerCase())},nombre.ilike.${comillas(nombreLiteral)}`)
    .limit(1)
    .maybeSingle();

  return (data as GimnasioPublico | null) ?? null;
}
