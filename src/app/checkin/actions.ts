"use server";

import { redirect } from "next/navigation";
import { requireDueno, dniAEmail } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { enviarPush } from "@/lib/push/enviar";

export type CheckinState = {
  estado?: "ok" | "prueba_vencida" | "no_encontrado";
  nombre?: string;
  error?: string;
};

/**
 * Marca el ingreso de un cliente a partir de su DNI.
 * Corre dentro de la sesión autenticada del dueño (modo kiosko), usa el
 * cliente RLS de Supabase: sólo ve/inserta registros de su gimnasio.
 */
export async function marcarIngreso(
  _prev: CheckinState,
  formData: FormData,
): Promise<CheckinState> {
  const dueno = await requireDueno();
  const dni = String(formData.get("dni") ?? "").replace(/\D/g, "").trim();

  if (!dni) return { error: "Escribí un DNI." };

  const supabase = await createClient();

  const { data: perfil } = await supabase
    .from("profiles")
    .select("id, nombre")
    .eq("gimnasio_id", dueno.gimnasio_id)
    .eq("rol", "cliente")
    .eq("dni", dni)
    .maybeSingle();

  if (!perfil) return { estado: "no_encontrado" };

  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, en_prueba, prueba_iniciada_en")
    .eq("profile_id", perfil.id)
    .maybeSingle();

  if (!cliente) return { estado: "no_encontrado" };

  const { count: previos } = await supabase
    .from("registros_entrada")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", cliente.id);

  // El registro se guarda siempre: queda constancia de que entró.
  await supabase.from("registros_entrada").insert({
    gimnasio_id: dueno.gimnasio_id,
    cliente_id: cliente.id,
  });

  const esPrimerIngreso = (previos ?? 0) === 0;

  if (cliente.en_prueba && esPrimerIngreso && !cliente.prueba_iniciada_en) {
    await supabase
      .from("clientes")
      .update({ prueba_iniciada_en: new Date().toISOString().slice(0, 10) })
      .eq("id", cliente.id);
  }

  if (cliente.en_prueba && !esPrimerIngreso) {
    await enviarPush([dueno.id], {
      title: "Prueba vencida — falta cobrar",
      body: `${perfil.nombre} volvió a entrar y sigue en día de prueba.`,
      url: `/panel/clientes/${cliente.id}`,
      tag: `prueba-vencida-${cliente.id}`,
    });
    return { estado: "prueba_vencida", nombre: perfil.nombre };
  }

  return { estado: "ok", nombre: perfil.nombre };
}

/**
 * Sale del modo kiosko y vuelve al panel completo. Pide de nuevo la clave del
 * dueño (no un simple botón "volver").
 */
export async function salirModoCheckin(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const dueno = await requireDueno();
  const clave = String(formData.get("clave") ?? "");
  if (!clave) return { error: "Ingresá tu clave." };

  const supabase = await createClient();
  const { data: gym } = await supabase
    .from("gimnasios")
    .select("slug")
    .eq("id", dueno.gimnasio_id)
    .single();
  if (!gym) return { error: "No se pudo verificar." };

  const { error } = await supabase.auth.signInWithPassword({
    email: dniAEmail(dueno.dni, gym.slug),
    password: clave,
  });
  if (error) return { error: "Clave incorrecta." };

  redirect("/panel");
}
