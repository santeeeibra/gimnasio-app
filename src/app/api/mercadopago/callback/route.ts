import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarError } from "@/lib/admin/errores";
import { estadoCobroAutomatico } from "@/lib/pagos/cobro-socio";
import {
  canjearCode,
  guardarTokens,
  verificarState,
} from "@/lib/pagos/mercadopago-connect";

// Vuelta del OAuth: canjea el code por access_token / refresh_token / user_id
// y los guarda en gimnasios. Valida que el gimnasio siga en plan Elite.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const destino = (q: string) =>
    NextResponse.redirect(new URL(`/panel/ajustes?mp=${q}`, req.url));

  if (!code || !state) return destino("error");

  const gimnasioId = verificarState(state);
  if (!gimnasioId) return destino("state_invalido");

  const origin = process.env.NEXT_PUBLIC_BASE_URL ?? url.origin;
  const db = createAdminClient();

  // Validar en servidor que el gimnasio sigue en plan Elite
  const estado = await estadoCobroAutomatico(db, gimnasioId);
  if (!estado.elite) {
    return destino("no_elite");
  }

  try {
    const tokens = await canjearCode(code, origin);
    await guardarTokens(db, gimnasioId, tokens);
  } catch (err) {
    console.error("[mercadopago/callback]", err);
    await registrarError(gimnasioId, "pago", err);
    return destino("error");
  }

  return destino("vinculado");
}
