"use server";

import { revalidatePath } from "next/cache";
import { requireStaffODueno } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { verificarPlanGimnasio } from "@/lib/plataforma/plan-gate";

export type ResultadoCierreCaja = {
  ok: boolean;
  error?: string;
  diferencia?: number;
  montoEsperado?: number;
  montoDeclarado?: number;
};

/**
 * Abre una nueva sesión/turno de caja diaria con un fondo inicial en efectivo.
 */
export async function abrirSesionCaja(formData: FormData) {
  const user = await requireStaffODueno();
  const admin = createAdminClient();

  // Verificar que el gimnasio tenga Plan Elite
  const planInfo = await verificarPlanGimnasio(admin, user.gimnasio_id);
  if (!planInfo.permiteControlCaja) {
    return { error: "El control de caja es exclusivo para gimnasios con Plan Elite." };
  }

  // Verificar si ya hay una sesión abierta
  const { data: sesionAbierta } = await admin
    .from("caja_sesiones")
    .select("id, turno_nombre")
    .eq("gimnasio_id", user.gimnasio_id)
    .eq("estado", "abierta")
    .maybeSingle();

  if (sesionAbierta) {
    return { error: `Ya hay un turno abierto (${sesionAbierta.turno_nombre}). Debe cerrarse antes de abrir uno nuevo.` };
  }

  const turnoNombre = String(formData.get("turno_nombre") ?? "Turno Mañana").trim();
  const rawMonto = String(formData.get("monto_inicial") ?? "0").replace(",", ".");
  const montoInicial = Math.max(0, parseFloat(rawMonto) || 0);
  const notasApertura = String(formData.get("notas_apertura") ?? "").trim() || null;

  const { error: insertErr } = await admin.from("caja_sesiones").insert({
    gimnasio_id: user.gimnasio_id,
    turno_nombre: turnoNombre,
    abierta_por: user.id,
    monto_inicial_efectivo: montoInicial,
    estado: "abierta",
    notas_apertura: notasApertura,
  });

  if (insertErr) {
    console.error("Error al abrir caja:", insertErr);
    return { error: "No se pudo abrir el turno de caja. Reintentá en unos segundos." };
  }

  revalidatePath("/panel/caja");
  revalidatePath("/panel");
  return { ok: true, mensaje: `Turno ${turnoNombre} abierto exitosamente con fondo de $${montoInicial.toLocaleString("es-AR")}.` };
}

/**
 * Registra un movimiento individual (ingreso libre o egreso/gasto) en el turno activo.
 */
export async function registrarMovimientoCaja(formData: FormData) {
  const user = await requireStaffODueno();
  const admin = createAdminClient();

  const planInfo = await verificarPlanGimnasio(admin, user.gimnasio_id);
  if (!planInfo.permiteControlCaja) {
    return { error: "Función exclusiva del Plan Elite." };
  }

  // Buscar sesión abierta
  const { data: sesion } = await admin
    .from("caja_sesiones")
    .select("id")
    .eq("gimnasio_id", user.gimnasio_id)
    .eq("estado", "abierta")
    .maybeSingle();

  if (!sesion) {
    return { error: "No hay un turno de caja abierto en este momento. Abrí un turno primero." };
  }

  const tipo = String(formData.get("tipo") ?? "egreso") as "ingreso" | "egreso";
  const categoria = String(formData.get("categoria") ?? "otro").trim();
  const concepto = String(formData.get("concepto") ?? "").trim();
  const medioPago = String(formData.get("medio_pago") ?? "efectivo").trim();
  const comprobanteRef = String(formData.get("comprobante_ref") ?? "").trim() || null;

  const rawMonto = String(formData.get("monto") ?? "0").replace(",", ".");
  const monto = parseFloat(rawMonto) || 0;

  if (monto <= 0) {
    return { error: "El monto debe ser mayor a 0." };
  }
  if (!concepto) {
    return { error: "Debes ingresar una descripción o motivo del movimiento." };
  }

  const { error: movErr } = await admin.from("caja_movimientos").insert({
    sesion_id: sesion.id,
    gimnasio_id: user.gimnasio_id,
    tipo,
    categoria,
    concepto,
    monto,
    medio_pago: medioPago,
    comprobante_ref: comprobanteRef,
    creado_por: user.id,
  });

  if (movErr) {
    console.error("Error al registrar movimiento de caja:", movErr);
    return { error: "No se pudo registrar el movimiento." };
  }

  revalidatePath("/panel/caja");
  return { ok: true, mensaje: `${tipo === "ingreso" ? "Ingreso" : "Egreso"} de $${monto.toLocaleString("es-AR")} registrado correctamente.` };
}

/**
 * Cierre de Turno con Arqueo Ciego.
 * El empleado ingresa el dinero físico contado. El servidor calcula en privado
 * el monto esperado y determina si hubo sobrante, faltante o si cuadró exacto.
 */
export async function cerrarSesionCaja(formData: FormData): Promise<ResultadoCierreCaja> {
  const user = await requireStaffODueno();
  const admin = createAdminClient();

  const planInfo = await verificarPlanGimnasio(admin, user.gimnasio_id);
  if (!planInfo.permiteControlCaja) {
    return { ok: false, error: "Función exclusiva del Plan Elite." };
  }

  const { data: sesion } = await admin
    .from("caja_sesiones")
    .select("id, monto_inicial_efectivo, turno_nombre")
    .eq("gimnasio_id", user.gimnasio_id)
    .eq("estado", "abierta")
    .maybeSingle();

  if (!sesion) {
    return { ok: false, error: "No hay ninguna sesión de caja abierta para cerrar." };
  }

  const rawMontoDeclarado = String(formData.get("monto_declarado") ?? "0").replace(",", ".");
  const montoDeclarado = Math.max(0, parseFloat(rawMontoDeclarado) || 0);
  const notasCierre = String(formData.get("notas_cierre") ?? "").trim() || null;

  // Consultar todos los movimientos de la sesión en efectivo
  const { data: movimientos } = await admin
    .from("caja_movimientos")
    .select("tipo, monto, medio_pago")
    .eq("sesion_id", sesion.id)
    .eq("medio_pago", "efectivo");

  let ingresosEfectivo = 0;
  let egresosEfectivo = 0;

  (movimientos || []).forEach((m) => {
    const valor = Number(m.monto) || 0;
    if (m.tipo === "ingreso") {
      ingresosEfectivo += valor;
    } else if (m.tipo === "egreso") {
      egresosEfectivo += valor;
    }
  });

  const montoInicial = Number(sesion.monto_inicial_efectivo) || 0;
  const montoEsperado = montoInicial + ingresosEfectivo - egresosEfectivo;
  const diferencia = Math.round((montoDeclarado - montoEsperado) * 100) / 100;

  const { error: updErr } = await admin
    .from("caja_sesiones")
    .update({
      cerrada_por: user.id,
      cerrada_en: new Date().toISOString(),
      monto_final_declarado: montoDeclarado,
      monto_final_esperado_efectivo: montoEsperado,
      diferencia_efectivo: diferencia,
      estado: "cerrada",
      notas_cierre: notasCierre,
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", sesion.id);

  if (updErr) {
    console.error("Error al cerrar caja:", updErr);
    return { ok: false, error: "No se pudo cerrar la caja. Intentá nuevamente." };
  }

  revalidatePath("/panel/caja");
  revalidatePath("/panel");
  return {
    ok: true,
    diferencia,
    montoEsperado,
    montoDeclarado,
  };
}

/**
 * Vincula un pago de cuota registrado en el gimnasio a la sesión de caja activa.
 * Se ejecuta automáticamente desde el alta o cobro de cuotas.
 */
export async function vincularPagoCuotaACaja(
  adminDb: any,
  gimnasioId: string,
  pagoId: string,
  monto: number,
  medioPago: string,
  concepto: string,
  perfilId: string,
) {
  try {
    // Buscar si hay sesión de caja abierta
    const { data: sesion } = await adminDb
      .from("caja_sesiones")
      .select("id")
      .eq("gimnasio_id", gimnasioId)
      .eq("estado", "abierta")
      .maybeSingle();

    if (!sesion) return; // Si no hay caja abierta, no bloquea el cobro

    let medioNormalizado = "efectivo";
    const mLower = (medioPago || "").toLowerCase();
    if (mLower.includes("transf")) medioNormalizado = "transferencia";
    else if (mLower.includes("mp") || mLower.includes("mercado")) medioNormalizado = "mercadopago";
    else if (mLower.includes("tarj") || mLower.includes("deb") || mLower.includes("cred")) medioNormalizado = "tarjeta";

    await adminDb.from("caja_movimientos").insert({
      sesion_id: sesion.id,
      gimnasio_id: gimnasioId,
      tipo: "ingreso",
      categoria: "cuota",
      concepto,
      monto,
      medio_pago: medioNormalizado,
      pago_id: pagoId,
      creado_por: perfilId,
    });
  } catch (err) {
    console.error("Error al vincular pago a caja:", err);
  }
}
