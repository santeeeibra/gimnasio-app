"use server";

import { revalidatePath } from "next/cache";
import { requireDueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  codigoLibre,
  normalizarCodigo,
  snapshotItemsDeRutina,
} from "@/lib/rutina/plantillas";

export type PlantillaState = { error?: string; ok?: string; codigo?: string };

/**
 * Publica la rutina actual del coach como plantilla compartible.
 * `rutinaId` es la rutina origen (la del propio coach en /mi/rutina, o la de
 * un socio de muestra en el panel).
 */
export async function publicarPlantilla(
  _prev: PlantillaState,
  formData: FormData,
): Promise<PlantillaState> {
  const profile = await requireDueno();
  const supabase = await createClient();

  const rutinaId = String(formData.get("rutinaId") ?? "").trim();
  const nombre = String(formData.get("nombre") ?? "").trim().slice(0, 60);
  const codigoDeseado = String(formData.get("codigo") ?? "").trim();

  if (!rutinaId) return { error: "No encontramos la rutina a publicar." };
  if (nombre.length < 3) return { error: "Poné un nombre para la plantilla (mín. 3 letras)." };

  // La rutina tiene que ser de este gimnasio (RLS ya lo garantiza en el select).
  const { data: rutina } = await supabase
    .from("rutinas")
    .select("id, gimnasio_id, objetivo, nivel, dias_por_semana, dias_titulos, preferencias")
    .eq("id", rutinaId)
    .maybeSingle();

  if (!rutina || rutina.gimnasio_id !== profile.gimnasio_id) {
    return { error: "Esa rutina no es de tu cuenta." };
  }

  const items = await snapshotItemsDeRutina(supabase, rutinaId);
  if (items.length === 0) {
    return { error: "La rutina no tiene ejercicios todavía." };
  }

  const admin = createAdminClient();
  const codigo = await codigoLibre(
    admin,
    codigoDeseado || nombre || (profile.nombre ?? "coach"),
  );

  const { error } = await admin.from("rutina_plantillas").insert({
    gimnasio_id: profile.gimnasio_id,
    creada_por: profile.id,
    nombre,
    codigo,
    objetivo: rutina.objetivo ?? null,
    nivel: rutina.nivel ?? null,
    dias_por_semana: rutina.dias_por_semana ?? null,
    dias_titulos: (rutina.dias_titulos as string[] | null) ?? [],
    preferencias: (rutina.preferencias as Record<string, unknown> | null) ?? {},
    items,
  });
  if (error) return { error: "No se pudo publicar la plantilla." };

  revalidatePath("/panel/plantillas");
  revalidatePath("/mi/rutina");
  return { ok: "Plantilla publicada.", codigo };
}

export async function alternarPlantillaActiva(
  id: string,
  activa: boolean,
): Promise<PlantillaState> {
  await requireDueno();
  const supabase = await createClient();
  const { error } = await supabase
    .from("rutina_plantillas")
    .update({ activa, actualizada_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: "No se pudo actualizar." };
  revalidatePath("/panel/plantillas");
  return { ok: activa ? "Plantilla activada." : "Plantilla pausada." };
}

export async function renombrarPlantilla(
  id: string,
  nombre: string,
  codigo: string,
): Promise<PlantillaState> {
  await requireDueno();
  const supabase = await createClient();
  const admin = createAdminClient();

  const nom = nombre.trim().slice(0, 60);
  if (nom.length < 3) return { error: "Nombre muy corto." };

  const patch: Record<string, unknown> = { nombre: nom, actualizada_at: new Date().toISOString() };

  const codNorm = normalizarCodigo(codigo);
  if (codNorm && codNorm.length >= 3) {
    const { data: choca } = await admin
      .from("rutina_plantillas")
      .select("id")
      .eq("codigo", codNorm)
      .neq("id", id)
      .maybeSingle();
    if (choca) return { error: "Ese código ya está en uso." };
    patch.codigo = codNorm;
  }

  const { error } = await supabase.from("rutina_plantillas").update(patch).eq("id", id);
  if (error) return { error: "No se pudo guardar." };
  revalidatePath("/panel/plantillas");
  return { ok: "Guardado.", codigo: (patch.codigo as string) ?? undefined };
}

export async function eliminarPlantilla(id: string): Promise<PlantillaState> {
  await requireDueno();
  const supabase = await createClient();
  const { error } = await supabase.from("rutina_plantillas").delete().eq("id", id);
  if (error) return { error: "No se pudo borrar." };
  revalidatePath("/panel/plantillas");
  return { ok: "Plantilla borrada." };
}
