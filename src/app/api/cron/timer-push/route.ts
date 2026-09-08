import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarPush } from "@/lib/push/enviar";

// Drena timer_push_pendiente: dispara el push a los socios cuyo descanso ya
// terminó. Pensado para correr cada minuto (Vercel Cron -> vercel.json).
// Idempotente: borra las filas antes de enviar, así un tick que se solape no
// vuelve a disparar.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const ahora = new Date().toISOString();

  const { data: pendientes, error } = await admin
    .from("timer_push_pendiente")
    .select("profile_id")
    .lte("disparar_en", ahora)
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!pendientes?.length) {
    return NextResponse.json({ ok: true, enviados: 0 });
  }

  const ids = [
    ...new Set(
      (pendientes as { profile_id: string }[]).map((p) => p.profile_id),
    ),
  ];

  await admin.from("timer_push_pendiente").delete().in("profile_id", ids);

  await Promise.allSettled(
    ids.map((id) =>
      enviarPush([id], {
        title: "¡Descanso finalizado! 💪",
        body: "Hora de tu siguiente serie.",
        url: "/mi/rutina",
        tag: "timer-descanso",
      }),
    ),
  );

  return NextResponse.json({ ok: true, enviados: ids.length });
}
