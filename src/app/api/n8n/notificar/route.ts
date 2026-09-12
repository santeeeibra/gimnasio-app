import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notificarSuperadmin } from "@/lib/admin/notificar";
import {
  TIPOS_AVISO_IA,
  type TipoAvisoIa,
  procesarEnvioAvisoIa,
} from "@/lib/n8n/asistente-ia";

// SPEC_ASISTENTE_IA_N8N.md — punto de entrada webhook (n8n / externo).
// Manda datos crudos, valida x-n8n-secret y delega el procesamiento a la IA.

export const dynamic = "force-dynamic";

type Body = {
  gimnasioId?: string;
  clienteId?: string | null;
  tipo?: string;
  prompt_contexto?: Record<string, unknown>;
};

export async function POST(req: NextRequest) {
  const secret = process.env.N8N_SYSGYM_SECRET;
  const header = req.headers.get("x-n8n-secret");
  if (!secret || header !== secret) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { gimnasioId, tipo, prompt_contexto } = body;
  const clienteId = body.clienteId ?? null;

  if (!gimnasioId || !tipo || !TIPOS_AVISO_IA.includes(tipo as TipoAvisoIa)) {
    return NextResponse.json(
      { error: `tipo debe ser uno de: ${TIPOS_AVISO_IA.join(", ")}` },
      { status: 400 },
    );
  }
  if (!prompt_contexto || typeof prompt_contexto !== "object") {
    return NextResponse.json({ error: "Falta prompt_contexto" }, { status: 400 });
  }

  const tipoAviso = tipo as TipoAvisoIa;
  const admin = createAdminClient();

  try {
    const res = await procesarEnvioAvisoIa(
      admin,
      gimnasioId,
      clienteId,
      tipoAviso,
      prompt_contexto,
    );
    if (!res.ok) {
      return NextResponse.json({ error: res.motivo }, { status: res.code });
    }
    return NextResponse.json({ ok: true, texto: res.texto });
  } catch (err) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    await notificarSuperadmin("Falló /api/n8n/notificar", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
