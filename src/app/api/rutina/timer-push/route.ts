import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Programá / cancelá el push diferido del timer de descanso.
// No bloquea: sólo escribe una fila; el cron /api/cron/timer-push la dispara.
//
//   POST { segundos: number }   -> upsert (una fila por socio, se pisa)
//   POST { cancelar: true }     -> borra la fila (el alumno reanudó antes)

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MIN_SEG = 10;
const MAX_SEG = 600;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  let body: { segundos?: number; cancelar?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    /* body vacío: se trata como error de rango más abajo */
  }

  if (body.cancelar) {
    await supabase
      .from("timer_push_pendiente")
      .delete()
      .eq("profile_id", user.id);
    return NextResponse.json({ ok: true, cancelado: true });
  }

  const segundos = Math.round(Number(body.segundos));
  if (!Number.isFinite(segundos) || segundos < MIN_SEG || segundos > MAX_SEG) {
    return NextResponse.json(
      { error: "segundos fuera de rango" },
      { status: 400 },
    );
  }

  const disparar_en = new Date(Date.now() + segundos * 1000).toISOString();
  const { error } = await supabase
    .from("timer_push_pendiente")
    .upsert(
      { profile_id: user.id, disparar_en, segundos },
      { onConflict: "profile_id" },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, disparar_en });
}
