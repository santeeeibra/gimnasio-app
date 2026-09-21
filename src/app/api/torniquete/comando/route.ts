import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  hashearToken,
  puedeConfirmar,
  verificarAutenticacionDispositivo,
  type ComandoEntregado,
} from "@/lib/torniquete/decision";

// Endpoint del dispositivo (ESP32/Wokwi) para el backend del torniquete.
// GET  = consultar/retirar el próximo comando pendiente (poll).
// POST = confirmar que un comando ya entregado giró y cerró.
// Autenticación por token de dispositivo (header x-device-token), nunca por
// sesión de usuario: sólo se guarda su hash, ver 0071_torniquete.sql.

export const dynamic = "force-dynamic";

type Dispositivo = {
  id: string;
  gimnasio_id: string;
  token_hash: string;
  revocado_en: string | null;
};

async function autenticar(req: NextRequest): Promise<
  { ok: true; dispositivo: Dispositivo } | { ok: false; status: number; error: string }
> {
  const tokenPlano = req.headers.get("x-device-token");
  if (!tokenPlano) {
    return { ok: false, status: 401, error: "Falta x-device-token" };
  }

  const admin = createAdminClient();
  const { data: dispositivo } = await admin
    .from("dispositivos_torniquete")
    .select("id, gimnasio_id, token_hash, revocado_en")
    .eq("token_hash", hashearToken(tokenPlano))
    .maybeSingle();

  const resultado = verificarAutenticacionDispositivo(
    tokenPlano,
    dispositivo ? { tokenHash: dispositivo.token_hash, revocadoEn: dispositivo.revocado_en } : null,
  );

  if (!resultado.autenticado) {
    return { ok: false, status: 401, error: resultado.motivo };
  }

  return { ok: true, dispositivo: dispositivo as Dispositivo };
}

export async function GET(req: NextRequest) {
  const auth = await autenticar(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createAdminClient();
  const { dispositivo } = auth;

  // Best-effort: si falla no bloquea la entrega del comando.
  try {
    await admin
      .from("dispositivos_torniquete")
      .update({ ultimo_visto_en: new Date().toISOString() })
      .eq("id", dispositivo.id);
  } catch {
    // Ignorado a propósito.
  }

  const { data, error } = await admin.rpc("torniquete_entregar_comando", {
    p_dispositivo_id: dispositivo.id,
    p_gimnasio_id: dispositivo.gimnasio_id,
  });

  if (error) {
    return NextResponse.json({ error: "No se pudo consultar el comando" }, { status: 500 });
  }

  const comando = data?.[0] ?? null;
  if (!comando) return NextResponse.json({ comando: null });

  return NextResponse.json({
    comando: {
      id: comando.id,
      tipo: comando.comando,
      venceEn: comando.vence_en,
    },
  });
}

type BodyConfirmar = {
  comandoId?: string;
  giroDetectado?: boolean;
  cerrado?: boolean;
};

export async function POST(req: NextRequest) {
  const auth = await autenticar(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: BodyConfirmar;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { comandoId, giroDetectado, cerrado } = body;
  if (!comandoId || typeof giroDetectado !== "boolean" || typeof cerrado !== "boolean") {
    return NextResponse.json(
      { error: "comandoId, giroDetectado y cerrado son requeridos" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { dispositivo } = auth;

  const { data: comando } = await admin
    .from("comandos_torniquete")
    .select("id, estado, entregado_a")
    .eq("id", comandoId)
    .eq("gimnasio_id", dispositivo.gimnasio_id)
    .maybeSingle();

  if (!comando) {
    return NextResponse.json({ error: "Comando no encontrado" }, { status: 404 });
  }

  const entregado: ComandoEntregado = {
    estado: comando.estado,
    entregadoA: comando.entregado_a,
  };
  const resultado = puedeConfirmar(entregado, dispositivo.id);
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.motivo }, { status: 409 });
  }

  // Confirmación idempotente: si ya estaba confirmado (reintento del mismo
  // POST) no se pisa confirmado_en, sólo se refrescan giro/cierre con el
  // mismo valor que ya tenía — un reintento nunca es un error.
  const { error } = await admin
    .from("comandos_torniquete")
    .update({
      estado: "confirmado",
      ...(comando.estado === "entregado" ? { confirmado_en: new Date().toISOString() } : {}),
      giro_detectado: giroDetectado,
      cerrado,
    })
    .eq("id", comandoId)
    .eq("entregado_a", dispositivo.id)
    .in("estado", ["entregado", "confirmado"]);

  if (error) {
    return NextResponse.json({ error: "No se pudo confirmar" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
