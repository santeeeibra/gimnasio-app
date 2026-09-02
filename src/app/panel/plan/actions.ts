"use server";

import { requireDueno } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarEmail } from "@/lib/mail/enviar";

export type SolicitudState = { ok?: boolean; msg?: string };

// El dueño pide activar o ampliar su plan. Manda un email al ADMIN de la
// plataforma (ADMIN_EMAIL). No hay checkout real todavía.
export async function solicitarActivacionPlan(
  _prev: SolicitudState | null,
  formData: FormData,
): Promise<SolicitudState> {
  const dueno = await requireDueno();
  const nota = String(formData.get("nota") ?? "").trim().slice(0, 1000);

  const to = process.env.ADMIN_EMAIL;
  if (!to) {
    return {
      ok: false,
      msg: "El contacto de soporte no está configurado. Escribinos por otro medio.",
    };
  }

  const db = createAdminClient();
  const { data: gym } = await db
    .from("gimnasios")
    .select(
      "nombre, slug, estado, plan_plataforma_vence_el, plan:planes_plataforma(nombre, max_socios)",
    )
    .eq("id", dueno.gimnasio_id)
    .single();
  const { count } = await db
    .from("clientes")
    .select("id", { count: "exact", head: true })
    .eq("gimnasio_id", dueno.gimnasio_id);

  const plan = (gym?.plan ?? null) as {
    nombre: string;
    max_socios: number | null;
  } | null;

  const text = [
    `Solicitud de activación / ampliación de plan.`,
    ``,
    `Gimnasio: ${gym?.nombre ?? "—"} (${gym?.slug ?? "—"})`,
    `Dueño: ${dueno.nombre ?? "—"} · profile ${dueno.id}`,
    `Estado actual: ${gym?.estado ?? "—"}`,
    `Plan actual: ${plan?.nombre ?? "sin plan"}${
      plan?.max_socios != null ? ` (tope ${plan.max_socios})` : ""
    }`,
    `Socios actuales: ${count ?? 0}`,
    `Vence: ${gym?.plan_plataforma_vence_el ?? "—"}`,
    ``,
    `Nota del dueño: ${nota || "(sin nota)"}`,
  ].join("\n");

  const enviado = await enviarEmail({
    to,
    subject: `[Planes] ${gym?.nombre ?? dueno.gimnasio_id} pide activar/ampliar`,
    text,
  });

  return enviado
    ? { ok: true, msg: "Listo, le avisamos a soporte. Te contactan a la brevedad." }
    : { ok: false, msg: "No se pudo enviar la solicitud. Probá de nuevo en un rato." };
}
