import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dniAEmail } from "@/lib/auth";
import { verificarMagicToken } from "@/lib/magic-link";

// Link de "probar mi gym" sin login: /probar/[token]. Abre sesión real de
// la persona (dueño o socio) que se firmó en el token, sin pedir clave.
// Sirve para cualquier gimnasio: el token ya trae el profileId adentro.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const base = process.env.NEXT_PUBLIC_BASE_URL || "";

  const profileId = verificarMagicToken(token);
  if (!profileId) {
    return NextResponse.redirect(`${base}/login?error=link_invalido`);
  }

  const admin = createAdminClient();
  const { data: perfil } = await admin
    .from("profiles")
    .select("id, dni, rol, activo, gimnasio_id")
    .eq("id", profileId)
    .single();
  if (!perfil || perfil.activo === false) {
    return NextResponse.redirect(`${base}/login?error=link_invalido`);
  }

  const { data: gym } = await admin
    .from("gimnasios")
    .select("slug, estado")
    .eq("id", perfil.gimnasio_id)
    .single();
  if (!gym || gym.estado === "suspendido") {
    return NextResponse.redirect(`${base}/login?error=link_invalido`);
  }

  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: dniAEmail(perfil.dni, gym.slug),
  });
  const tokenHash = link?.properties?.hashed_token;
  if (linkErr || !tokenHash) {
    return NextResponse.redirect(`${base}/login?error=link_invalido`);
  }

  const supabase = await createClient();
  const { error: otpErr } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });
  if (otpErr) {
    return NextResponse.redirect(`${base}/login?error=link_invalido`);
  }

  const destino = perfil.rol === "dueno" || perfil.rol === "staff" ? "/panel" : "/mi";
  return NextResponse.redirect(`${base}${destino}`);
}
