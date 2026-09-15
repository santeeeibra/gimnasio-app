"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Al reabrir la PWA (o volver de background/bfcache), el navegador puede
 * restaurar la página sin pasar por el servidor: se ve la sesión/rol viejo
 * hasta que algo dispara un refresh. `pageshow` con `persisted` detecta la
 * restauración desde bfcache; `visibilitychange` cubre volver de background
 * en Android/iOS donde bfcache no aplica igual.
 */
export function RevalidarAlVolver() {
  const router = useRouter();

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) router.refresh();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") router.refresh();
    };

    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router]);

  return null;
}
