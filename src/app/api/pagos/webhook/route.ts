import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pasarela } from "@/lib/pagos";
import { aprobarPagoPlataforma } from "@/lib/plataforma/aprobar-pago";

// Webhook de la pasarela de pago (Mercado Pago, etc.). El adapter parsea el
// request; si el evento es un pago aprobado, se aprueba la fila y se renueva
// el plan del gimnasio. Idempotente por pagos_plataforma.estado.

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let evento;
  try {
    evento = await pasarela().leerWebhook(req);
  } catch (err) {
    console.error("[pagos/webhook] leerWebhook:", err);
    // 400 => la pasarela reintenta; útil si fue un error transitorio.
    return NextResponse.json({ error: "webhook inválido" }, { status: 400 });
  }

  if (!evento) return NextResponse.json({ ok: true, ignorado: true });

  if (evento.estado === "aprobado") {
    const r = await aprobarPagoPlataforma(
      createAdminClient(),
      evento.referencia,
      evento.proveedorRef,
    );
    if (!r.ok && !r.yaProcesado) {
      console.error("[pagos/webhook] aprobar:", r.msg);
      return NextResponse.json({ error: r.msg }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

// Algunas pasarelas hacen un GET de verificación al configurar la URL.
export function GET() {
  return NextResponse.json({ ok: true });
}
