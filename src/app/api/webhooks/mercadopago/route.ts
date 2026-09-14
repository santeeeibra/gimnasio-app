import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  aplicarCuotaAlDia,
  calcularCubreHasta,
  estadoCobroAutomatico,
} from "@/lib/pagos/cobro-socio";
import {
  asegurarTokenValido,
  leerPreapprovalConToken,
  validarFirmaWebhookMP,
} from "@/lib/pagos/mercadopago-connect";
import { enviarPush } from "@/lib/push/enviar";

// Webhook público de Mercado Pago para suscripciones y cobro recurrente.
// Valida x-signature, garantiza idempotencia con mp_webhook_log y aplica
// la renovación de cuota (o notificación push si se cancela).

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const url = new URL(req.url);

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const tipo =
    body?.type ?? body?.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  const dataId =
    body?.data?.id ?? body?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id");

  if (!dataId) {
    return NextResponse.json({ ok: true, ignorado: true, motivo: "sin data.id" });
  }

  const strId = String(dataId);
  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");

  // Firma obligatoria en cualquier ambiente: sin x-signature válida, no pasa.
  const valida = validarFirmaWebhookMP(xSignature, xRequestId, strId);
  if (!valida) {
    console.warn("[webhook/mercadopago] Firma inválida o ausente, rechazado:", strId);
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  const db = createAdminClient();

  // 1. Idempotencia: si ya procesamos este evento, responder 200
  const { data: yaProcesado } = await db
    .from("mp_webhook_log")
    .select("id")
    .eq("mp_event_id", strId)
    .maybeSingle();

  if (yaProcesado) {
    return NextResponse.json({ ok: true, yaProcesado: true });
  }

  // 2. Manejo de evento: suscripción cancelada (preapproval)
  if (tipo === "subscription_preapproval" || tipo === "preapproval") {
    // Buscar cliente asociado al preapproval_id
    const { data: cli } = await db
      .from("clientes")
      .select("id, nombre, gimnasio_id, mp_preapproval_id")
      .eq("mp_preapproval_id", strId)
      .maybeSingle();

    if (cli) {
      try {
        const preapproval = await leerPreapprovalConToken(
          db,
          cli.gimnasio_id,
          strId,
        );

        if (preapproval.status === "cancelled") {
          // Buscar perfil del dueño para mandar push
          const { data: dueno } = await db
            .from("profiles")
            .select("id")
            .eq("gimnasio_id", cli.gimnasio_id)
            .eq("rol", "dueno")
            .maybeSingle();

          if (dueno?.id) {
            await enviarPush([dueno.id], {
              title: "Suscripción cancelada",
              body: `${cli.nombre} canceló el cobro automático en Mercado Pago.`,
            });
          }
        }
      } catch (err) {
        console.error("[webhook/mercadopago] Error consultando preapproval:", err);
      }
    }

    // Registrar en el log de idempotencia
    await db.from("mp_webhook_log").insert({
      mp_event_id: strId,
      tipo: tipo || "preapproval",
    });

    return NextResponse.json({ ok: true });
  }

  // 3. Manejo de evento: pago aprobado (payment / subscription_authorized_payment)
  if (
    tipo === "payment" ||
    tipo === "subscription_authorized_payment"
  ) {
    // Buscar el gimnasio dueño del pago consultando los gimnasios Elite con MP activo
    const { data: gimnasios } = await db
      .from("gimnasios")
      .select("id, mp_access_token")
      .not("mp_access_token", "is", null);

    let paymentData: any = null;
    let gymEncontradoId: string | null = null;

    // La API de Mercado Pago no permite preguntar por el pago sin saber de qué
    // cuenta es, así que hay que probar cuenta por cuenta. Antes era una
    // búsqueda estrictamente secuencial (N round-trips encadenados); ahora va
    // en tandas paralelas y corta apenas encuentra el pago.
    const TANDA_MP = 5;
    const cuentas = gimnasios ?? [];
    for (let i = 0; i < cuentas.length && !paymentData; i += TANDA_MP) {
      const tanda = await Promise.all(
        cuentas.slice(i, i + TANDA_MP).map(async (g) => {
          try {
            const token = await asegurarTokenValido(db, g.id);
            const res = await fetch(
              `https://api.mercadopago.com/v1/payments/${strId}`,
              { headers: { Authorization: `Bearer ${token}` } },
            );
            if (!res.ok) return null;
            return { gymId: g.id as string, data: await res.json() };
          } catch {
            return null; // Continuar buscando
          }
        }),
      );
      const hit = tanda.find((r) => r !== null);
      if (hit) {
        paymentData = hit.data;
        gymEncontradoId = hit.gymId;
      }
    }

    if (!paymentData || !gymEncontradoId) {
      console.warn("[webhook/mercadopago] No se encontró pago en cuentas de MP:", strId);
      return NextResponse.json({ ok: true, ignorado: true, motivo: "pago no encontrado" });
    }

    // Validar en servidor que el gimnasio sigue en plan Elite
    const estadoGym = await estadoCobroAutomatico(db, gymEncontradoId);
    if (!estadoGym.elite) {
      console.warn(
        "[webhook/mercadopago] Gimnasio ya no está en plan Elite. No se procesa cuota automática.",
        gymEncontradoId,
      );
      await db.from("mp_webhook_log").insert({
        mp_event_id: strId,
        tipo: "payment_no_elite",
      });
      return NextResponse.json({ ok: true, motivo: "gimnasio no elite" });
    }

    if (paymentData.status === "approved") {
      // Buscar el cliente por mp_preapproval_id o por external_reference
      const preapprovalId =
        paymentData.point_of_interaction?.transaction_data?.subscription_id ??
        paymentData.order?.id ??
        paymentData.preapproval_id;

      let clienteQuery = db
        .from("clientes")
        .select("id, gimnasio_id, plan_id, plan:planes(id, nombre, precio, duracion_dias)")
        .eq("gimnasio_id", gymEncontradoId);

      if (paymentData.external_reference) {
        clienteQuery = clienteQuery.eq("id", paymentData.external_reference);
      } else if (preapprovalId) {
        clienteQuery = clienteQuery.eq("mp_preapproval_id", preapprovalId);
      }

      const { data: cliente } = await clienteQuery.maybeSingle();

      if (cliente) {
        const plan = (cliente as any).plan;
        const duracion = Number(plan?.duracion_dias) || 30;
        const cubreHasta = await calcularCubreHasta(db, cliente.id, duracion);
        const monto = Number(paymentData.transaction_amount ?? plan?.precio ?? 0);

        // Registrar o actualizar pago
        await db.from("pagos").upsert(
          {
            gimnasio_id: gymEncontradoId,
            cliente_id: cliente.id,
            plan_id: cliente.plan_id,
            monto,
            cubre_hasta: cubreHasta,
            fecha_pago: new Date().toISOString().slice(0, 10),
            estado: "confirmado",
            proveedor: "mercadopago",
            proveedor_ref: strId,
            comprobante_ref: "MP débito automático",
          },
          { onConflict: "proveedor,proveedor_ref" },
        );

        // Renovar cuota y estado al día
        await aplicarCuotaAlDia(db, cliente.id, cliente.plan_id, cubreHasta);
      }
    }

    // Registrar en el log de idempotencia
    await db.from("mp_webhook_log").insert({
      mp_event_id: strId,
      tipo: tipo || "payment",
    });

    return NextResponse.json({ ok: true });
  }

  // Otros eventos desconocidos se aceptan con 200
  return NextResponse.json({ ok: true, ignorado: true });
}

export function GET() {
  return NextResponse.json({ ok: true });
}
