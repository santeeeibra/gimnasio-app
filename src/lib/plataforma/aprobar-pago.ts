import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { enviarEmail } from "@/lib/mail/enviar";
import { enviarPush } from "@/lib/push/enviar";
import { TIPO_PAGO_LABEL } from "@/lib/plataforma/precios";

export type ResultadoAprobacion = {
  ok: boolean;
  msg: string;
  gimnasioId?: string;
  venceEl?: string;
  /** true si no se hizo nada porque el pago ya no estaba pendiente. */
  yaProcesado?: boolean;
};

// Aprueba un pago pendiente de gimnasio -> plataforma y renueva el plan:
// empuja plan_plataforma_vence_el += pago.dias (desde hoy o desde el
// vencimiento vigente si es futuro) y deja el gimnasio en 'activo'.
// Idempotente: si el pago ya no está 'pendiente', no toca nada.
// La usan la confirmación manual (superadmin) y el webhook de la pasarela.
export async function aprobarPagoPlataforma(
  db: SupabaseClient,
  pagoId: string,
  proveedorRef?: string | null,
): Promise<ResultadoAprobacion> {
  const { data: pago } = await db
    .from("pagos_plataforma")
    .select("id, gimnasio_id, dias, estado, monto_ars, tipo")
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

  // Cargos únicos (setup / premium): se aprueban con el mismo flujo pero NO
  // tocan el vencimiento del plan ni el estado del gimnasio.
  const tipo = (pago.tipo ?? "plan_mensual") as
    | "plan_mensual"
    | "setup"
    | "premium";
  if (tipo !== "plan_mensual") {
    const { data: upd, error } = await db
      .from("pagos_plataforma")
      .update({
        estado: "aprobado",
        confirmado_at: new Date().toISOString(),
        ...(proveedorRef ? { proveedor_ref: proveedorRef } : {}),
      })
      .eq("id", pagoId)
      .eq("estado", "pendiente")
      .select("id");
    if (error)
      return { ok: false, msg: error.message, gimnasioId: pago.gimnasio_id };
    if (!upd || upd.length === 0) {
      return {
        ok: false,
        yaProcesado: true,
        gimnasioId: pago.gimnasio_id,
        msg: "El pago ya fue procesado.",
      };
    }
    await avisarCargoUnico(
      db,
      pago.gimnasio_id,
      tipo,
      Number(pago.monto_ars ?? 0),
    );
    return {
      ok: true,
      msg: "Cargo único confirmado (no renueva el plan).",
      gimnasioId: pago.gimnasio_id,
    };
  }

  const { data: gym } = await db
    .from("gimnasios")
    .select("plan_plataforma_vence_el")
    .eq("id", pago.gimnasio_id)
    .single();

  const hoy = new Date();
  const vigente = gym?.plan_plataforma_vence_el
    ? new Date(gym.plan_plataforma_vence_el)
    : null;
  const base = vigente && vigente > hoy ? vigente : hoy;
  base.setDate(base.getDate() + (pago.dias ?? 30));
  const venceEl = base.toISOString().slice(0, 10);

  // Update guardado por estado: si otro proceso lo aprobó en el medio,
  // afecta 0 filas y cortamos sin renovar dos veces.
  const { data: upd, error: e1 } = await db
    .from("pagos_plataforma")
    .update({
      estado: "aprobado",
      confirmado_at: new Date().toISOString(),
      ...(proveedorRef ? { proveedor_ref: proveedorRef } : {}),
    })
    .eq("id", pagoId)
    .eq("estado", "pendiente")
    .select("id");
  if (e1) return { ok: false, msg: e1.message, gimnasioId: pago.gimnasio_id };
  if (!upd || upd.length === 0) {
    return {
      ok: false,
      yaProcesado: true,
      gimnasioId: pago.gimnasio_id,
      msg: "El pago ya fue procesado.",
    };
  }

  const { error: e2 } = await db
    .from("gimnasios")
    .update({ plan_plataforma_vence_el: venceEl, estado: "activo" })
    .eq("id", pago.gimnasio_id);
  if (e2) return { ok: false, msg: e2.message, gimnasioId: pago.gimnasio_id };

  // Comprobante de la renovación: push al dueño + email a soporte.
  // Best-effort: no debe romper la aprobación si el aviso falla.
  await avisarRenovacion(
    db,
    pago.gimnasio_id,
    venceEl,
    Number(pago.monto_ars ?? 0),
    pago.dias ?? 30,
  );

  return {
    ok: true,
    msg: `Plan hasta ${venceEl}.`,
    gimnasioId: pago.gimnasio_id,
    venceEl,
  };
}

async function avisarCargoUnico(
  db: SupabaseClient,
  gimnasioId: string,
  tipo: "setup" | "premium",
  montoARS: number,
): Promise<void> {
  try {
    const [{ data: dueno }, { data: gym }] = await Promise.all([
      db
        .from("profiles")
        .select("id")
        .eq("gimnasio_id", gimnasioId)
        .eq("rol", "dueno")
        .limit(1)
        .maybeSingle(),
      db.from("gimnasios").select("nombre").eq("id", gimnasioId).single(),
    ]);

    const label = TIPO_PAGO_LABEL[tipo];
    const montoFmt = montoARS.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
    });

    if (dueno?.id) {
      await enviarPush([dueno.id], {
        title: "Pago confirmado",
        body: `Confirmamos tu pago de "${label}".`,
        url: "/panel/plan",
        tag: `cargo-${tipo}-${gimnasioId}`,
      });
    }

    const to = process.env.PAGOS_EMAIL ?? process.env.ADMIN_EMAIL;
    if (to) {
      await enviarEmail({
        to,
        subject: `[Pago] ${gym?.nombre ?? gimnasioId} — ${label} confirmado`,
        text: [
          `Cargo único confirmado.`,
          ``,
          `Gimnasio: ${gym?.nombre ?? gimnasioId}`,
          `Concepto: ${label}`,
          `Monto: ${montoFmt}`,
        ].join("\n"),
      });
    }
  } catch (err) {
    console.error("[aprobar-pago] aviso cargo único:", err);
  }
}

async function avisarRenovacion(
  db: SupabaseClient,
  gimnasioId: string,
  venceEl: string,
  montoARS: number,
  dias: number,
): Promise<void> {
  try {
    const [{ data: dueno }, { data: gym }] = await Promise.all([
      db
        .from("profiles")
        .select("id")
        .eq("gimnasio_id", gimnasioId)
        .eq("rol", "dueno")
        .limit(1)
        .maybeSingle(),
      db.from("gimnasios").select("nombre").eq("id", gimnasioId).single(),
    ]);

    const venceFmt = new Date(venceEl).toLocaleDateString("es-AR");
    const montoFmt = montoARS.toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
    });

    if (dueno?.id) {
      await enviarPush([dueno.id], {
        title: "Plan renovado",
        body: `Tu plan quedó activo hasta el ${venceFmt}.`,
        url: "/panel/plan",
        tag: `plan-renovado-${venceEl}`,
      });
    }

    const to = process.env.PAGOS_EMAIL ?? process.env.ADMIN_EMAIL;
    if (to) {
      await enviarEmail({
        to,
        subject: `[Pago] ${gym?.nombre ?? gimnasioId} — plan renovado hasta ${venceEl}`,
        text: [
          `Renovación de plan de plataforma confirmada.`,
          ``,
          `Gimnasio: ${gym?.nombre ?? gimnasioId}`,
          `Monto: ${montoFmt}`,
          `Período: ${dias} días`,
          `Nuevo vencimiento: ${venceEl}`,
        ].join("\n"),
      });
    }
  } catch (err) {
    console.error("[aprobar-pago] aviso:", err);
  }
}
