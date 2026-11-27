import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Visita diaria (Vercel Cron -> vercel.json) para que Supabase gratis no
// pause el proyecto por inactividad (lo pausa tras ~7 días sin uso; pasó el
// 10/10/2026 y nadie pudo registrarse hasta el 27/11).
// No usa CRON_SECRET a propósito: solo lee una fila, no devuelve datos y no
// dispara avisos ni escrituras, así que no hay nada que proteger.

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = createAdminClient();
  const { error } = await admin.from("gimnasios").select("id").limit(1);
  if (error) {
    console.error("[mantener-activo]", error.message);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
