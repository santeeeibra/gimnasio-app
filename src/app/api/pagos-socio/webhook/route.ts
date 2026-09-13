import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { confirmarPagoSocio, rechazarPagoSocio } from "@/lib/pagos/cobro-socio";
import {
  cuentaMP,
  leerNotificacion,
  leerPagoConToken,
} from "@/lib/pagos/mercadopago-connect";

// Webhook del cobro SOCIO -> DUEÑO (Mercado Pago Connect). Multi-tenant: el
// pago se valida con el access_token del gimnasio dueño de la fila `pagos`,
// no con el token global de la plataforma. /api/pagos/webhook
// (dueño -> plataforma) sigue existiendo aparte y no se toca.
//
// Cómo se resuelve el tenant: para consultar la API de MP hace falta el token
// del gimnasio, pero para saber el gimnasio hace falta el external_reference,
// que sólo devuelve la API. Se rompe el círculo mandando `?ref=<pagos.id>` en
// el notification_url al crear la preferencia (MP lo conserva). Igual después
// se verifica contra el external_reference real que devuelve MP.

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ref = new URL(req.url).searchParams.get("ref");

  let notif;
  try {
    notif = await leerNotificacion(req);
  } catch (err) {
    console.error("[pagos-socio/webhook] parse:", err);
    return NextResponse.json({ error: "webhook inválido" }, { status: 400 });
  }
  if (!notif) return NextResponse.json({ ok: true, ignorado: true });

  const db = createAdminClient();

  // Idempotencia: si ese payment ya se procesó, cortar sin tocar nada.
  const { data: yaVisto } = await db
    .from("pagos")
    .select("id, estado")
    .eq("proveedor", "mercadopago")
    .eq("proveedor_ref", notif.dataId)
    .maybeSingle();
  if (yaVisto && yaVisto.estado !== "pendiente") {
    return NextResponse.json({ ok: true, yaProcesado: true });
  }

  const pagoId = yaVisto?.id ?? ref;
  if (!pagoId) {
    return NextResponse.json({ error: "sin referencia" }, { status: 400 });
  }

  const { data: pago } = await db
    .from("pagos")
    .select("id, gimnasio_id, estado")
    .eq("id", pagoId)
    .maybeSingle();
  if (!pago) {
    return NextResponse.json({ error: "pago inexistente" }, { status: 404 });
  }
  if (pago.estado !== "pendiente") {
    return NextResponse.json({ ok: true, yaProcesado: true });
  }

  const cuenta = await cuentaMP(db, pago.gimnasio_id);
  if (!cuenta) {
    console.error(
      "[pagos-socio/webhook] gimnasio sin cuenta MP:",
      pago.gimnasio_id,
    );
    return NextResponse.json({ error: "gimnasio sin MP" }, { status: 409 });
  }

  let mp;
  try {
    mp = await leerPagoConToken(db, pago.gimnasio_id, cuenta, notif.dataId);
  } catch (err) {
    console.error("[pagos-socio/webhook] leer pago:", err);
    // 500 => MP reintenta.
    return NextResponse.json({ error: "no se pudo validar" }, { status: 500 });
  }

  // El external_reference que devuelve MP es la fuente de verdad: sin esto un
  // tercero podría confirmar un pago ajeno pasando un `ref` cualquiera.
  if (mp.referencia !== pago.id) {
    return NextResponse.json(
      { error: "referencia no coincide" },
      { status: 409 },
    );
  }

  if (mp.estado === "aprobado") {
    const r = await confirmarPagoSocio(db, pago.id, notif.dataId);
    if (!r.ok && !r.yaProcesado) {
      console.error("[pagos-socio/webhook] confirmar:", r.msg);
      return NextResponse.json({ error: r.msg }, { status: 500 });
    }
  } else if (mp.estado === "rechazado") {
    const r = await rechazarPagoSocio(db, pago.id, notif.dataId);
    // 0 filas: el pago ya no estaba pendiente (reintento del webhook). Se
    // registra, pero no se le devuelve 500 a Mercado Pago para que no
    // reintente en loop.
    if (!r.ok) console.error("[pagos-socio/webhook] rechazar:", r.msg);
  }

  return NextResponse.json({ ok: true });
}

// Algunas pasarelas hacen un GET de verificación al configurar la URL.
export function GET() {
  return NextResponse.json({ ok: true });
}
