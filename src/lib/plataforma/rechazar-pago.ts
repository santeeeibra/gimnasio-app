import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { enviarEmail } from "@/lib/mail/enviar";
import { enviarPush } from "@/lib/push/enviar";
import { TIPO_PAGO_LABEL, type TipoPago } from "@/lib/plataforma/precios";

export type ResultadoRechazo = {
  ok: boolean;
  msg: string;
  gimnasioId?: string;
  yaProcesado?: boolean;
};

// Rechaza un pago pendiente de gimnasio -> plataforma.
// Cambia el estado a 'rechazado', adjunta el motivo en la nota y notifica al dueño.
// Al quedar rechazado, el dueño queda automáticamente habilitado para volver a pagar en /panel/plan.
// Idempotente: si el pago ya no está 'pendiente', no toca nada.
export async function rechazarPagoPlataforma(
  db: SupabaseClient,
  pagoId: string,
  motivo: string,
): Promise<ResultadoRechazo> {
  const { data: pago } = await db
    .from("pagos_plataforma")
    .select("id, gimnasio_id, estado, monto_ars, tipo, nota, plan_plataforma_id")
    .eq("id", pagoId)
    .single();

  if (!pago) return { ok: false, msg: "Pago inexistente." };
  if (pago.estado !== "pendiente") {
    return {
      ok: false,
      yaProcesado: true,
      gimnasioId: pago.gimnasio_id,
      msg: `El pago ya está ${pago.estado}.`,
    };
  }

  const motivoLimpio = motivo.trim();
  const notaActualizada = pago.nota
    ? `${pago.nota} · [Rechazado: ${motivoLimpio}]`
    : `[Rechazado: ${motivoLimpio}]`;

  const { data: upd, error } = await db
    .from("pagos_plataforma")
    .update({
      estado: "rechazado",
      nota: notaActualizada,
      confirmado_at: new Date().toISOString(),
    })
    .eq("id", pagoId)
    .eq("estado", "pendiente")
    .select("id");

  if (error) {
    return { ok: false, msg: error.message, gimnasioId: pago.gimnasio_id };
  }
  if (!upd || upd.length === 0) {
    return {
      ok: false,
      yaProcesado: true,
      gimnasioId: pago.gimnasio_id,
      msg: "El pago ya fue procesado por otro proceso.",
    };
  }

  // Notificar al dueño y avisar a soporte (best-effort)
  await avisarRechazo(
    db,
    pago.gimnasio_id,
    (pago.tipo ?? "plan_mensual") as TipoPago,
    Number(pago.monto_ars ?? 0),
    pago.plan_plataforma_id,
    motivoLimpio,
  );

  return {
    ok: true,
    msg: "Pago rechazado.",
    gimnasioId: pago.gimnasio_id,
  };
}

async function avisarRechazo(
  db: SupabaseClient,
  gimnasioId: string,
  tipo: TipoPago,
  montoARS: number,
  planPlataformaId: string | null,
  motivo: string,
): Promise<void> {
  try {
    const [{ data: dueno }, { data: gym }, { data: planData }] = await Promise.all([
      db
        .from("profiles")
        .select("id, nombre, email_recuperacion")
        .eq("gimnasio_id", gimnasioId)
        .eq("rol", "dueno")
        .limit(1)
        .maybeSingle(),
      db.from("gimnasios").select("nombre").eq("id", gimnasioId).single(),
      planPlataformaId
        ? db
            .from("planes_plataforma")
            .select("nombre")
            .eq("id", planPlataformaId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const concepto =
      tipo === "plan_mensual"
        ? `Plan ${planData?.nombre ?? "mensual"}`
        : TIPO_PAGO_LABEL[tipo] ?? "Cargo de plataforma";

    const montoFmt = montoARS.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
    });

    if (dueno?.id) {
      await enviarPush([dueno.id], {
        title: "Pago no confirmado",
        body: `Tu pago de ${concepto} no pudo ser confirmado (${motivo}). Entrá a Tu Plan para reintentar.`,
        url: "/panel/plan",
        tag: `pago-rechazado-${gimnasioId}`,
      });
    }

    const to = process.env.PAGOS_EMAIL ?? process.env.ADMIN_EMAIL;
    if (to) {
      await enviarEmail({
        to,
        subject: `[Pago Rechazado] ${gym?.nombre ?? gimnasioId} — ${concepto}`,
        text: [
          `Pago de plataforma rechazado por soporte.`,
          ``,
          `Gimnasio: ${gym?.nombre ?? gimnasioId}`,
          `Dueño: ${dueno?.nombre ?? "—"}`,
          `Concepto: ${concepto}`,
          `Monto: ${montoFmt}`,
          `Motivo de rechazo: ${motivo}`,
        ].join("\n"),
      });
    }
  } catch (err) {
    console.error("[rechazar-pago] error al avisar:", err);
  }
}
