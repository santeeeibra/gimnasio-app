import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarEmail } from "@/lib/mail/enviar";
import { LIMITE_BYTES, mb, pctUso, umbralCruzado } from "@/lib/monitor-db";

// Cron diario (Vercel Cron -> vercel.json). Mide el tamaño del proyecto
// Supabase entero y avisa por email al ADMIN de la plataforma al cruzar
// 70% o 90% del límite del plan. Sin spam: solo re-avisa si sube de umbral.
// El % y el tamaño quedan reflejados en /admin.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: sizeData, error: sizeErr } = await admin.rpc("db_size_bytes");
  if (sizeErr || sizeData == null) {
    return NextResponse.json(
      { error: sizeErr?.message ?? "sin datos de tamaño" },
      { status: 500 },
    );
  }

  const bytes = Number(sizeData);
  const pct = pctUso(bytes);
  const umbral = umbralCruzado(pct);

  const { data: estado } = await admin
    .from("monitor_db_estado")
    .select("umbral_avisado")
    .eq("id", 1)
    .single();

  const yaAvisado = (estado?.umbral_avisado as number | undefined) ?? 0;

  await admin
    .from("monitor_db_estado")
    .update({
      pct: Number(pct.toFixed(2)),
      bytes,
      umbral_avisado: umbral,
      actualizado_at: new Date().toISOString(),
    })
    .eq("id", 1);

  let emailEnviado = false;
  if (umbral > yaAvisado) {
    const to = process.env.ADMIN_EMAIL;
    if (to) {
      emailEnviado = await enviarEmail({
        to,
        subject: `[Sistema Gym] Base al ${umbral}% del límite de Supabase`,
        text:
          `La base de datos usa ${mb(bytes).toFixed(1)} MB ` +
          `(${pct.toFixed(1)}%) del límite de ` +
          `${(LIMITE_BYTES / 1024 / 1024).toFixed(0)} MB.\n\n` +
          `Umbral cruzado: ${umbral}%.\n` +
          `Entrá a /admin y decidí: subir de plan o purgar datos viejos ` +
          `(ej. registro_progreso antiguo). El sistema no borra nada solo.`,
      });
    } else {
      console.warn("[monitor-db] Falta ADMIN_EMAIL; no se avisa por email.");
    }
  }

  return NextResponse.json({
    ok: true,
    bytes,
    mb: Number(mb(bytes).toFixed(1)),
    pct: Number(pct.toFixed(2)),
    umbral,
    yaAvisado,
    emailEnviado,
  });
}
