import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth";
import { impersonacionActiva } from "@/lib/impersonation";

export async function GET() {
  // Si hay una impersonación activa nunca hay que mandar al superadmin de
  // vuelta a /admin, aunque una carrera de refresh de token deje ver por un
  // instante la sesión real (la cookie imp-activa es la fuente de verdad,
  // no depende de qué sesión de Supabase esté vigente en ese momento).
  if (await impersonacionActiva()) {
    return NextResponse.json({ esSuperadmin: false });
  }

  const profile = await getSessionProfile();
  const superId = process.env.SUPERADMIN_ID;
  const esSuperadmin = Boolean(profile && superId && profile.id === superId);
  return NextResponse.json({ esSuperadmin });
}
