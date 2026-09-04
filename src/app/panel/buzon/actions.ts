"use server";

import { revalidatePath } from "next/cache";
import { requireDueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarPush } from "@/lib/push/enviar";

export type BuzonState = { error?: string };

export async function responderComentario(
  _prev: BuzonState,
  formData: FormData,
): Promise<BuzonState> {
  const dueno = await requireDueno();
  const comentarioId = String(formData.get("comentario_id") ?? "").trim();
  const respuesta = String(formData.get("respuesta") ?? "").trim();

  if (!comentarioId || !respuesta) return { error: "Escribí una respuesta." };

  const supabase = await createClient();

  // Verificar que el comentario pertenece al gimnasio del dueño
  const { data: comentario, error: errSelect } = await supabase
    .from("buzon_comentarios")
    .select("id, cliente_id, gimnasio_id")
    .eq("id", comentarioId)
    .eq("gimnasio_id", dueno.gimnasio_id)
    .single();

  if (errSelect || !comentario) {
    return { error: "Comentario no encontrado." };
  }

  const { error } = await supabase
    .from("buzon_comentarios")
    .update({
      respuesta,
      respondido_at: new Date().toISOString(),
      estado: "resuelto",
    })
    .eq("id", comentarioId)
    .eq("gimnasio_id", dueno.gimnasio_id);

  if (error) {
    console.error("responderComentario/update", error);
    return { error: "No se pudo guardar la respuesta." };
  }

  // Push al socio usando admin client para obtener el profile_id del cliente
  try {
    const admin = createAdminClient();
    const { data: clienteRow } = await admin
      .from("clientes")
      .select("profile_id")
      .eq("id", comentario.cliente_id)
      .single();

    if (clienteRow?.profile_id) {
      await enviarPush([clienteRow.profile_id], {
        title: "El gimnasio respondió tu comentario",
        body: respuesta.length > 120 ? respuesta.slice(0, 117) + "…" : respuesta,
        url: "/mi/buzon",
        tag: `buzon-resp-${comentarioId}`,
      });
    }
  } catch {
    // No bloquear si el push falla
  }

  revalidatePath("/panel/buzon");
  return {};
}

export async function marcarResuelto(comentarioId: string): Promise<BuzonState> {
  const dueno = await requireDueno();
  const supabase = await createClient();

  const { error } = await supabase
    .from("buzon_comentarios")
    .update({ estado: "resuelto" })
    .eq("id", comentarioId)
    .eq("gimnasio_id", dueno.gimnasio_id);

  if (error) {
    console.error("marcarResuelto/update", error);
    return { error: "No se pudo marcar como resuelto." };
  }

  revalidatePath("/panel/buzon");
  return {};
}

export async function borrarComentario(comentarioId: string): Promise<BuzonState> {
  const dueno = await requireDueno();
  const supabase = await createClient();

  const { error } = await supabase
    .from("buzon_comentarios")
    .delete()
    .eq("id", comentarioId)
    .eq("gimnasio_id", dueno.gimnasio_id);

  if (error) {
    console.error("borrarComentario/delete", error);
    return { error: "No se pudo borrar el comentario." };
  }

  revalidatePath("/panel/buzon");
  return {};
}
