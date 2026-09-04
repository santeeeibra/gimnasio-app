"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ComentarioState = { error?: string; ok?: boolean };

export async function enviarComentario(
  _prev: ComentarioState,
  formData: FormData,
): Promise<ComentarioState> {
  const profile = await requireProfile();
  const categoria = String(formData.get("categoria") ?? "otro").trim();
  const texto = String(formData.get("texto") ?? "").trim();

  if (!texto) return { error: "Escribí tu comentario." };
  if (!["equipo", "limpieza", "sugerencia", "otro"].includes(categoria)) {
    return { error: "Categoría inválida." };
  }

  const supabase = await createClient();

  // Obtener el cliente_id del perfil autenticado
  const { data: cliente, error: errCliente } = await supabase
    .from("clientes")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (errCliente || !cliente) {
    return { error: "No se encontró tu perfil de socio." };
  }

  const { error } = await supabase.from("buzon_comentarios").insert({
    gimnasio_id: profile.gimnasio_id,
    cliente_id: cliente.id,
    categoria,
    texto,
  });

  if (error) {
    console.error("enviarComentario/insert", error);
    return { error: "No se pudo enviar el comentario. Intentá de nuevo." };
  }

  // Push al dueño: opcional v1 (habilitado para avisarle que llegó algo)
  try {
    const admin = createAdminClient();
    const { data: duenos } = await admin
      .from("profiles")
      .select("id")
      .eq("gimnasio_id", profile.gimnasio_id)
      .eq("rol", "dueno");

    if (duenos && duenos.length > 0) {
      const { enviarPush } = await import("@/lib/push/enviar");
      await enviarPush(
        duenos.map((d: { id: string }) => d.id),
        {
          title: "Nuevo comentario en el buzón",
          body: texto.length > 120 ? texto.slice(0, 117) + "…" : texto,
          url: "/panel/buzon",
          tag: `buzon-nuevo-${Date.now()}`,
        },
      );
    }
  } catch {
    // No bloquear si el push falla
  }

  revalidatePath("/mi/buzon");
  return { ok: true };
}
