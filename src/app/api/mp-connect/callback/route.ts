import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarError } from "@/lib/admin/errores";
import {
  canjearCode,
  guardarTokens,
  verificarState,
} from "@/lib/pagos/mercadopago-connect";

// Vuelta del OAuth: canjea el `code` por access_token / refresh_token /
// user_id del DUEÑO y los guarda en su gimnasio. El gimnasio sale del `state`
// firmado, no de la sesión (así funciona aunque MP vuelva sin cookies).

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const destino = (q: string) => NextResponse.redirect(new URL(`/panel/plan?mp=${q}`, req.url));

  if (!code || !state) return destino("error");

  const gimnasioId = verificarState(state);
  if (!gimnasioId) return destino("state_invalido");

  const origin = process.env.NEXT_PUBLIC_BASE_URL ?? url.origin;
  const db = createAdminClient();

  try {
    const tokens = await canjearCode(code, origin);
    await guardarTokens(db, gimnasioId, tokens);
  } catch (err) {
    console.error("[mp-connect/callback]", err);
    await registrarError(gimnasioId, "pago", err);
    return destino("error");
  }

  return destino("vinculado");
}
