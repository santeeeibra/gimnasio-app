"use server";

import { revalidatePath } from "next/cache";
import { requireDueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type EnvioState = { error?: string; ok?: string };

export async function enviarMensaje(
  _prev: EnvioState,
  formData: FormData,
): Promise<EnvioState> {
  const dueno = await requireDueno();
  const cuerpo = String(formData.get("cuerpo") ?? "").trim();
  const modo = String(formData.get("modo") ?? "todos");
  const planId = String(formData.get("plan_id") ?? "") || null;
  const clienteProfileId = String(formData.get("cliente_id") ?? "") || null;
  const respondible = formData.get("respondible") === "on";

  if (!cuerpo) return { error: "Escribí el mensaje." };
  if (modo === "plan" && !planId) return { error: "Elegí el plan." };
  if (modo === "individual" && !clienteProfileId)
    return { error: "Elegí el cliente." };

  const supabase = await createClient();

  // Resolver destinatarios (profile_id de cada cliente)
  let destinatarios: string[] = [];
  if (modo === "individual") {
    destinatarios = [clienteProfileId!];
  } else {
    let q = supabase
      .from("clientes")
      .select("profile_id")
      .eq("gimnasio_id", dueno.gimnasio_id);
    if (modo === "plan") q = q.eq("plan_id", planId);
    const { data } = await q;
    destinatarios = (data ?? []).map((r: { profile_id: string }) => r.profile_id);
  }

  if (destinatarios.length === 0)
    return { error: "No hay clientes que reciban este mensaje." };

  const { data: msg, error: msgErr } = await supabase
    .from("mensajes")
    .insert({
      gimnasio_id: dueno.gimnasio_id,
      remitente_id: dueno.id,
      cuerpo,
      es_masivo: modo !== "individual",
      filtro_plan_id: modo === "plan" ? planId : null,
      respondible,
    })
    .select("id")
    .single();
  if (msgErr || !msg) return { error: "No se pudo crear el mensaje." };

  const { error: destErr } = await supabase.from("mensaje_destinatarios").insert(
    destinatarios.map((profile_id) => ({
      mensaje_id: msg.id,
      profile_id,
    })),
  );
  if (destErr) {
    await supabase.from("mensajes").delete().eq("id", msg.id);
    return { error: "No se pudieron asignar los destinatarios." };
  }

  // TODO (Entregable 2 — Push): notificar a destinatarios.

  revalidatePath("/panel/mensajes");
  return {
    ok: `Mensaje enviado a ${destinatarios.length} ${
      destinatarios.length === 1 ? "cliente" : "clientes"
    }.`,
  };
}

export async function responderDueno(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const dueno = await requireDueno();
  const mensajeId = String(formData.get("mensaje_id") ?? "");
  const cuerpo = String(formData.get("cuerpo") ?? "").trim();
  if (!mensajeId || !cuerpo) return { error: "Escribí una respuesta." };

  const supabase = await createClient();
  const { error } = await supabase.from("mensaje_respuestas").insert({
    mensaje_id: mensajeId,
    autor_id: dueno.id,
    cuerpo,
  });
  if (error) return { error: "No se pudo enviar la respuesta." };

  revalidatePath(`/panel/mensajes/${mensajeId}`);
  return {};
}
