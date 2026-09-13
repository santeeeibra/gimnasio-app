"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export async function buscarReemplazoMaquinaOcupada(ejercicioActualId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: cliente } = await supabase
    .from("clientes")
    .select("gimnasio_id")
    .eq("profile_id", profile.id)
    .single();

  if (!cliente) return { ok: false as const, error: "No se encontró el cliente." };

  const { data: actual } = await supabase
    .from("ejercicios")
    .select("id, nombre, patron, grupo_muscular, equipo")
    .eq("id", ejercicioActualId)
    .single();

  if (!actual) return { ok: false as const, error: "Ejercicio no encontrado." };

  const { data: alternativas } = await supabase
    .from("ejercicios")
    .select("id, nombre, equipo, imagen_url")
    .eq("grupo_muscular", actual.grupo_muscular)
    .eq("patron", actual.patron)
    .neq("id", actual.id)
    .neq("equipo", actual.equipo)
    .or(`gimnasio_id.is.null,gimnasio_id.eq.${cliente.gimnasio_id}`)
    .limit(3);

  return { ok: true as const, actual: actual.nombre, alternativas: alternativas ?? [] };
}

export async function obtenerTipsTecnica(ejercicioId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ejercicios")
    .select("nombre, descripcion, imagen_url")
    .eq("id", ejercicioId)
    .single();
    
  return data ? { ok: true as const, ejercicio: data } : { ok: false as const, error: "No encontrado" };
}
