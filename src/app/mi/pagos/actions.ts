"use server";

import { headers } from "next/headers";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarError } from "@/lib/admin/errores";
import {
  calcularCubreHasta,
  estadoCobroAutomatico,
} from "@/lib/pagos/cobro-socio";
import {
  crearLinkConToken,
  cuentaMP,
} from "@/lib/pagos/mercadopago-connect";

// El socio paga su cuota con Mercado Pago. La plata va a la cuenta del DUEÑO
// (token de MP Connect del gimnasio), no a la de la plataforma.
//
// Se crea la fila en `pagos` con estado 'pendiente' ANTES de mandarlo al
// checkout: su id es el external_reference con el que después el webhook
// resuelve el pago. `cubre_hasta` se calcula acá de forma provisional (la
// columna es not null) y se recalcula al confirmar.

export type PagarState = { error?: string; url?: string };

export async function iniciarPagoMercadoPago(): Promise<PagarState> {
  const profile = await requireProfile();
  const db = createAdminClient();

  const estado = await estadoCobroAutomatico(db, profile.gimnasio_id);
  if (!estado.activo) {
    return { error: "El pago online no está disponible en tu gimnasio." };
  }

  const { data: cli } = await db
    .from("clientes")
    .select("id, nombre, email, plan_id, plan:planes(id, nombre, precio, duracion_dias)")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const plan = (cli as { plan?: {
    id: string;
    nombre: string;
    precio: number | string;
    duracion_dias: number;
  } | null } | null)?.plan;

  if (!cli) return { error: "No encontramos tu ficha de socio." };
  if (!plan) {
    return { error: "Todavía no tenés un plan asignado. Hablá con tu gimnasio." };
  }

  const monto = Number(plan.precio);
  if (!(monto > 0)) {
    return { error: "Tu plan no tiene un precio cargado. Hablá con tu gimnasio." };
  }

  const cuenta = await cuentaMP(db, profile.gimnasio_id);
  if (!cuenta) {
    return { error: "El pago online no está disponible en tu gimnasio." };
  }

  const cubreHastaProvisorio = await calcularCubreHasta(
    db,
    cli.id,
    Number(plan.duracion_dias) || 30,
  );

  const { data: pago, error: pagoErr } = await db
    .from("pagos")
    .insert({
      gimnasio_id: profile.gimnasio_id,
      cliente_id: cli.id,
      plan_id: plan.id,
      monto,
      cubre_hasta: cubreHastaProvisorio,
      estado: "pendiente",
      proveedor: "mercadopago",
    })
    .select("id")
    .single();
  if (pagoErr || !pago) {
    await registrarError(profile.gimnasio_id, "pago", pagoErr);
    return { error: "No pudimos iniciar el pago. Probá de nuevo." };
  }

  const h = await headers();
  const origin =
    process.env.NEXT_PUBLIC_BASE_URL ?? `https://${h.get("host") ?? ""}`;

  try {
    const link = await crearLinkConToken(db, profile.gimnasio_id, cuenta, {
      referencia: pago.id,
      concepto: `Cuota ${plan.nombre}`,
      montoARS: monto,
      emailPagador: (cli as { email?: string | null }).email ?? null,
      urlRetorno: `${origin}/mi/pagos`,
      // ?ref permite al webhook resolver el gimnasio antes de poder consultar
      // la API de MP (que necesita el token de ese gimnasio).
      urlWebhook: `${origin}/api/pagos-socio/webhook?ref=${pago.id}`,
    });

    if (link.proveedorRef) {
      await db
        .from("pagos")
        .update({ comprobante_ref: `MP pref ${link.proveedorRef}` })
        .eq("id", pago.id);
    }

    return { url: link.url };
  } catch (err) {
    // Token revocado / vencido: se cae al flujo manual (transferencia).
    console.error("[mi/pagos] crear link MP:", err);
    await registrarError(profile.gimnasio_id, "pago", err);
    await db
      .from("pagos")
      .update({ estado: "rechazado" })
      .eq("id", pago.id);
    return {
      error:
        "No pudimos abrir el checkout de Mercado Pago. Podés pagar por transferencia con los datos de abajo.",
    };
  }
}
