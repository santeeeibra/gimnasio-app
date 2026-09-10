import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  // 1. Verificar si el usuario ya tiene profile asignado
  const { data: profile } = await admin
    .from("profiles")
    .select(
      "id, rol, gimnasio_id, debe_cambiar_clave, gimnasios:gimnasio_id(slug, nombre, estado)",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
    type GymInfo = { slug?: string; nombre?: string; estado?: string };
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

    const destino = profile.debe_cambiar_clave
      ? profile.rol === "dueno"
        ? "/bienvenida"
        : "/cambiar-clave"
      : profile.rol === "dueno"
        ? "/panel"
        : "/mi";

    const response = NextResponse.redirect(`${origin}${destino}`);

    if (gym?.slug && gym?.nombre) {
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

  // 2. Si no tiene perfil aún, registrar automáticamente cuenta individual
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

    const response = NextResponse.redirect(`${origin}/panel`);
    response.cookies.set(
      "gym_ultimo",
      JSON.stringify({ slug, nombre }),
      {
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
        sameSite: "lax",
        httpOnly: false,
      },
    );
    return response;
  }

  // Fallback si hubo error de inserción
  return NextResponse.redirect(`${origin}/panel`);
}
