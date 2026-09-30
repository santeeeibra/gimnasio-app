"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

// Al volver a abrir la app (o entrar por primera vez), si sos el superadmin
// te manda directo al Dev Cockpit (/admin) en vez de dejarte en /login o /mi.
export function AutoRedirectSuperadmin() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const controller = new AbortController();
    async function chequear() {
      // Las vistas protegidas tienen sus propios guards. El auto-redirect
      // solo resuelve la entrada, nunca interrumpe una vista de soporte.
      if (pathname !== "/login" && pathname !== "/") return;
      try {
        const res = await fetch("/api/soy-superadmin", {
          cache: "no-store", signal: controller.signal,
        });
        if (!res.ok) return;
        const { esSuperadmin } = await res.json();
        if (esSuperadmin && !controller.signal.aborted) router.push("/admin");
      } catch {
        // Sin red: no hacemos nada, se reintenta la próxima vez que vuelva.
      }
    }

    chequear();

    function alVolver() {
      if (document.visibilityState === "visible") chequear();
    }

    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", alVolver);

    return () => {
      controller.abort();
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", alVolver);
    };
  }, [pathname, router]);

  return null;
}
