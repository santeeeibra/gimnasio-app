"use server";

import { headers } from "next/headers";
import { requireDueno } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarEmail } from "@/lib/mail/enviar";
import { pasarela } from "@/lib/pagos";

export type SolicitudState = { ok?: boolean; msg?: string };

export type PagoState = { ok?: boolean; msg?: string; redirect?: string };

// El dueño genera un pago de su plan de plataforma. Crea la fila en
// pagos_plataforma y delega en la pasarela configurada (env PASARELA_PAGO).
// Con el adapter `manual` no hay checkout: se muestran los datos de
// transferencia y soporte confirma. Con un adapter automático, `redirect`
// lleva al checkout hosteado y el webhook aprueba el pago.
export async function generarPagoPlan(
  _prev: PagoState | null,
  formData: FormData,
): Promise<PagoState> {
  const dueno = await requireDueno();
  const nota = String(formData.get("nota") ?? "").trim().slice(0, 500) || null;

  const db = createAdminClient();
  const { data: gym } = await db
    .from("gimnasios")
    .select("nombre, slug, plan:planes_plataforma(id, nombre, precio_mensual)")
    .eq("id", dueno.gimnasio_id)
    .single();

  const plan = (gym?.plan ?? null) as {
    id: string;
    nombre: string;
    precio_mensual: number;
  } | null;
  const montoARS = plan?.precio_mensual ?? 0;
  const dias = 30;
  const via = pasarela();

  const { data: pago, error } = await db
    .from("pagos_plataforma")
    .insert({
      gimnasio_id: dueno.gimnasio_id,
      plan_plataforma_id: plan?.id ?? null,
      monto_ars: montoARS,
      dias,
      proveedor: via.nombre,
      nota,
    })
    .select("id")
    .single();
  if (error || !pago) {
    return { ok: false, msg: "No se pudo registrar el pago. Probá de nuevo." };
  }

  const h = await headers();
  const origin =
    process.env.NEXT_PUBLIC_BASE_URL ?? `https://${h.get("host") ?? ""}`;

  const link = await via.crearLink({
    referencia: pago.id as string,
    concepto: `Plan ${plan?.nombre ?? "plataforma"} · ${gym?.nombre ?? ""} · ${dias} días`,
    montoARS,
    emailPagador: null,
    urlRetorno: `${origin}/panel/plan`,
  });

  if (via.automatica) {
    return { ok: true, redirect: link.url };
  }

  // Flujo manual: avisar a soporte por email (best-effort).
  const to = process.env.ADMIN_EMAIL;
  if (to) {
    await enviarEmail({
      to,
      subject: `[Pago] ${gym?.nombre ?? dueno.gimnasio_id} generó un pago pendiente`,
      text: [
        `Pago pendiente de confirmar.`,
        ``,
        `Gimnasio: ${gym?.nombre ?? "—"} (${gym?.slug ?? "—"})`,
        `Dueño: ${dueno.nombre ?? "—"} · profile ${dueno.id}`,
        `Plan: ${plan?.nombre ?? "sin plan"} · $${montoARS} · ${dias} días`,
        `Pago id: ${pago.id}`,
        `Nota: ${nota ?? "(sin nota)"}`,
        ``,
        `Confirmar en /admin/gimnasios/${dueno.gimnasio_id}`,
      ].join("\n"),
    });
  }

  return {
    ok: true,
    msg: "Pago registrado. Hacé la transferencia y soporte lo confirma; tu plan se renueva al confirmarlo.",
  };
}

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
