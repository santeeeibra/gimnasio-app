import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarPush } from "@/lib/push/enviar";
import { notificarSuperadmin } from "@/lib/admin/notificar";
import {
  TIPOS_AVISO_IA,
  type TipoAvisoIa,
  verificarGateAsistenteIa,
  verificarYResetearTecho,
  yaSeEnvioRecientemente,
  redactarAvisoIa,
  incrementarContadorIa,
  TECHO_LLAMADAS_IA_MES,
} from "@/lib/n8n/asistente-ia";

// SPEC_ASISTENTE_IA_N8N.md — único punto de entrada para n8n. n8n manda datos
// crudos, esta ruta arma el prompt, redacta con IA y dispara push + mensaje
// interno. n8n nunca ve la service_role key ni escribe directo en Supabase.

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
    const gate = await verificarGateAsistenteIa(admin, gimnasioId);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.motivo }, { status: 403 });
    }

    const techo = await verificarYResetearTecho(admin, gimnasioId);
    if (!techo.ok) {
      await notificarSuperadmin(
        "Gimnasio llegó al techo de asistente IA",
        `gimnasioId=${gimnasioId} tipo=${tipoAviso} techo=${TECHO_LLAMADAS_IA_MES}/mes`,
      );
      return NextResponse.json({ error: techo.motivo }, { status: 429 });
    }

    const yaEnviado = await yaSeEnvioRecientemente(admin, gimnasioId, clienteId, tipoAviso);
    if (yaEnviado) {
      return NextResponse.json(
        { error: "Ya se envió un aviso de este tipo recientemente (dedupe)" },
        { status: 409 },
      );
    }

    const texto = await redactarAvisoIa(tipoAviso, prompt_contexto);

    // Destinatario: el cliente puntual, o el dueño del gimnasio si clienteId
    // es null (ej. resumen_mensual).
    let destinatarioProfileId: string | null = null;
    if (clienteId) {
      const { data: cliente } = await admin
        .from("clientes")
        .select("profile_id, gimnasio_id")
        .eq("id", clienteId)
        .maybeSingle();
      if (!cliente || cliente.gimnasio_id !== gimnasioId) {
        return NextResponse.json({ error: "Cliente inválido para este gimnasio" }, { status: 400 });
      }
      destinatarioProfileId = cliente.profile_id as string;
    } else {
      const { data: dueno } = await admin
        .from("profiles")
        .select("id")
        .eq("gimnasio_id", gimnasioId)
        .eq("rol", "dueno")
        .maybeSingle();
      destinatarioProfileId = (dueno?.id as string) ?? null;
    }

    if (!destinatarioProfileId) {
      return NextResponse.json({ error: "No se encontró destinatario" }, { status: 404 });
    }

    await admin.from("avisos_ia").insert({
      gimnasio_id: gimnasioId,
      cliente_id: clienteId,
      tipo: tipoAviso,
      contenido: texto,
    });

    const { data: msg } = await admin
      .from("mensajes")
      .insert({
        gimnasio_id: gimnasioId,
        remitente_id: destinatarioProfileId,
        cuerpo: texto,
        es_masivo: false,
        respondible: false,
      })
      .select("id")
      .single();

    if (msg) {
      await admin
        .from("mensaje_destinatarios")
        .insert({ mensaje_id: msg.id, profile_id: destinatarioProfileId });
    }

    await enviarPush([destinatarioProfileId], {
      title: tituloPorTipo(tipoAviso),
      body: texto,
      url: clienteId ? "/mi/buzon" : "/panel/buzon",
      tag: `asistente-ia-${tipoAviso}`,
    });

    await incrementarContadorIa(admin, gimnasioId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    await notificarSuperadmin("Falló /api/n8n/notificar", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function tituloPorTipo(tipo: TipoAvisoIa): string {
  switch (tipo) {
    case "riesgo_abandono":
      return "¡Te extrañamos!";
    case "cumpleanos":
      return "🎉 Feliz cumpleaños";
    case "resumen_mensual":
      return "Resumen del mes";
  }
}
