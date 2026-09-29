import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { destinationForMemberships, type PartnerRowForAuth } from "@/lib/partners/identity";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription || error)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Código de autorización no recibido.")}`,
    );
  }

  const supabase = await createClient();
  const { data, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !data.user) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(
        exchangeError?.message || "No se pudo iniciar sesión con Google.",
      )}`,
    );
  }

  const user = data.user;
  const admin = createAdminClient();

  const { data: partner } = await admin
    .from("partners")
    .select("id, user_id, estado")
    .eq("user_id", user.id)
    .maybeSingle();

  // 1. Verificar si el usuario ya tiene profile asignado
  const { data: profile } = await admin
    .from("profiles")
    .select(
      "id, rol, gimnasio_id, debe_cambiar_clave, activo, gimnasios:gimnasio_id(slug, nombre, estado, tipo_cuenta)",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
    type GymInfo = {
      slug?: string;
      nombre?: string;
      estado?: string;
      tipo_cuenta?: string;
    };
    const rawGym = profile.gimnasios as unknown;
    const gym = (
      Array.isArray(rawGym) ? rawGym[0] : rawGym
    ) as GymInfo | null;

    if (gym?.estado === "suspendido") {
      await supabase.auth.signOut();
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(
          "Este gimnasio está suspendido temporalmente. Escribinos a soporte.",
        )}`,
      );
    }

    const destino = destinationForMemberships({
      userId: user.id,
      superadminId: process.env.SUPERADMIN_ID,
      profile,
      partner: partner as PartnerRowForAuth | null,
    }) ?? "/login?error=sin_acceso";

    const response = NextResponse.redirect(`${origin}${destino}`);

    const esGymReal = !gym?.tipo_cuenta || gym.tipo_cuenta === "gym";
    if (esGymReal && gym?.slug && gym?.nombre) {
      response.cookies.set(
        "gym_ultimo",
        JSON.stringify({ slug: gym.slug, nombre: gym.nombre }),
        {
          maxAge: 60 * 60 * 24 * 365,
          path: "/",
          sameSite: "lax",
          httpOnly: false,
        },
      );
    }
    return response;
  }

  // La confirmación de email de un Partner vuelve por este callback. Su
  // ausencia de profile es intencional y no debe disparar el alta individual.
  if (partner) {
    const destino = destinationForMemberships({
      userId: user.id,
      superadminId: process.env.SUPERADMIN_ID,
      profile: null,
      partner: partner as PartnerRowForAuth,
    }) ?? "/login?error=sin_acceso";
    return NextResponse.redirect(`${origin}${destino}`);
  }

  if (user.user_metadata?.signup_kind === "partner") {
    return NextResponse.redirect(
      `${origin}/registro-partner?error=${encodeURIComponent("El alta Partner quedó incompleta. Reintentá o contactá a soporte.")}`,
    );
  }

  // 2. Si no tiene perfil ni Partner, registrar automáticamente cuenta individual
  const userEmail = user.email?.toLowerCase() || "";
  const rawNombre =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    userEmail.split("@")[0] ||
    "Mi Cuenta";
  const nombre = String(rawNombre).trim();
  const slug = `user-${user.id.substring(0, 8)}`;

  const { data: gymData, error: gymErr } = await admin
    .from("gimnasios")
    .insert({
      nombre,
      slug,
      estado: "prueba",
      tipo_cuenta: "individual",
    })
    .select("id")
    .single();

  if (!gymErr && gymData) {
    const dni = `DNI-${user.id.substring(0, 8)}`;

    await admin.from("profiles").insert({
      id: user.id,
      gimnasio_id: gymData.id,
      rol: "dueno",
      dni,
      nombre,
      debe_cambiar_clave: false,
      email_recuperacion: userEmail || null,
    });

    await admin.from("clientes").insert({
      gimnasio_id: gymData.id,
      profile_id: user.id,
      estado_cuota: "al_dia",
      email: userEmail || null,
    });

    // Cuenta individual: NO se escribe la cookie gym_ultimo. Esa cookie es para
    // socios que entran por DNI a un gimnasio real; una cuenta personal no debe
    // aparecer como "gimnasio" en la pantalla de login.
    return NextResponse.redirect(`${origin}/panel`);
  }

  // Fallback si hubo error de inserción
  return NextResponse.redirect(`${origin}/panel`);
}
