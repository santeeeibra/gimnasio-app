import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

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
    .select("id, gimnasio_id, dias, estado")
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

  return {
    ok: true,
    msg: `Plan hasta ${venceEl}.`,
    gimnasioId: pago.gimnasio_id,
    venceEl,
  };
}
