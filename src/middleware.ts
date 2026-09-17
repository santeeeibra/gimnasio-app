import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const PUBLIC_PATHS = [
  "/login",
  "/registrarse",
  "/registro-partner",
  // Landing pública de reclutamiento del programa de partners.
  "/partners",
  // Landing público de rutina compartida por un entrenador (/r/<codigo>).
  "/r/",
  "/demo",
  "/inicio",
  // Magic-link de "probar mi gym" sin login: abre sesión real y solo ahí
  // se sabe si el token es válido (verificarMagicToken adentro del route).
  "/probar/",
  "/suspendido",
  "/reset-clave",
  "/_next",
  "/favicon.ico",
  "/api/auth",
  "/auth",
  "/api/cron",
  // Devuelve un .ics con datos de la URL, sin tocar la base.
  "/api/rutina/ics",
  // Webhooks de la pasarela: los llama Mercado Pago, sin sesión.
  "/api/pagos/webhook",
  "/api/pagos-socio/webhook",
  "/sw.js",
  "/manifest.webmanifest",
  "/icon-",
  "/badge-",
  "/images",
  "/lanyard",
  "/models",
  "/promo-video",
  // PoC de memoji con cámara — sin auth mientras se prueba viabilidad.
  "/poc-memoji",
];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Los prefetch de <Link> disparan muchas requests en paralelo; si cada una
  // refresca el token de Supabase a la vez, la detección de reuso revoca la
  // sesión. En un prefetch no hace falta refrescar: dejamos pasar.
  if (
    request.headers.get("next-router-prefetch") ||
    request.headers.get("purpose") === "prefetch"
  ) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
