import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/auth";
import { impersonacionActiva } from "@/lib/impersonation";

export async function GET() {
  // La navegación de una sesión impersonada permanece en su vista.
  // impersonacionActiva() liga el estado al usuario actual; este endpoint
  // nunca concede acceso a /admin (requireSuperadmin valida Auth aparte).
  if (await impersonacionActiva()) {
    return NextResponse.json({ esSuperadmin: false });
  }

  const profile = await getSessionProfile();
  const superId = process.env.SUPERADMIN_ID;
  const esSuperadmin = Boolean(profile && superId && profile.id === superId);
  return NextResponse.json({ esSuperadmin });
}
