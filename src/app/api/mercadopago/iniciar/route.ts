import { NextResponse, type NextRequest } from "next/server";
import { requireDueno } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { estadoCobroAutomatico } from "@/lib/pagos/cobro-socio";
import {
  connectConfigurado,
  urlAutorizacion,
} from "@/lib/pagos/mercadopago-connect";

// Arranca el OAuth de Mercado Pago: manda al dueño a autorizar con SU
// cuenta de MP. El gimnasio_id viaja firmado en el state.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const dueno = await requireDueno();

  if (!connectConfigurado()) {
    return NextResponse.redirect(
      new URL("/panel/ajustes?mp=no_configurado", req.url),
    );
  }

  const estado = await estadoCobroAutomatico(
    createAdminClient(),
    dueno.gimnasio_id,
  );
  if (!estado.elite) {
    return NextResponse.redirect(new URL("/panel/ajustes?mp=no_elite", req.url));
  }

  const origin =
    process.env.NEXT_PUBLIC_BASE_URL ?? new URL(req.url).origin;

  return NextResponse.redirect(urlAutorizacion(origin, dueno.gimnasio_id));
}
