"use client";

/**
 * Envoltorio de pull-to-refresh para las pantallas principales de /mi y /panel.
 *
 * Sólo hace algo en PWA instalada + puntero grueso (ver `usePullToRefresh`).
 * Fuera de ese caso devuelve los children tal cual, sin listeners ni transform.
 * El indicador es la mascota corriendo (`<MascotaLoading />`); al soltar pasado
 * el umbral dispara `router.refresh()` de los Server Components.
 */

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePullToRefresh } from "@/lib/ui/use-pull-to-refresh";
import { MascotaLoading } from "./mascota-loading";

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const onRefresh = useCallback(async () => {
    router.refresh();
    await new Promise((r) => setTimeout(r, 600));
  }, [router]);

  const { activo, fase, distancia, progreso } = usePullToRefresh(onRefresh);

  if (!activo) return <>{children}</>;

  const arrastrando = fase === "pulling";
  const refrescando = fase === "refreshing";
  const esIdle = fase === "idle";

  return (
    <div className="relative">
      {!esIdle && (
        <div
          aria-hidden={esIdle}
          className="pointer-events-none absolute inset-x-0 top-0 z-40 flex justify-center"
          style={{
            transform: `translateY(${Math.max((refrescando ? 52 : distancia) - 44, -44)}px)`,
            opacity: Math.min(1, progreso * 1.5),
            transition: arrastrando
              ? "none"
              : "transform 220ms var(--ease-out), opacity 200ms var(--ease-out)",
          }}
        >
          <div
            className="mt-1"
            style={{
              transform: `scale(${refrescando ? 1 : 0.5 + progreso * 0.5})`,
              transition: arrastrando ? "none" : "transform 200ms var(--ease-out)",
            }}
          >
            <MascotaLoading size={32} label="Actualizando…" />
          </div>
        </div>
      )}

      {/* Sin `esIdle` no seteamos `transform` inline: cualquier valor (incluso
         translateY(0px)) convierte a este div en containing block de sus
         descendientes `fixed` (modales, overlays), rompiendo su posicionamiento
         contra el viewport y pegándolos a la altura del contenido scrolleable. */}
      <div
        style={
          esIdle
            ? undefined
            : {
                transform: `translateY(${refrescando ? 52 : distancia}px)`,
                transition: arrastrando ? "none" : "transform 220ms var(--ease-out)",
              }
        }
      >
        {children}
      </div>
    </div>
  );
}

export default PullToRefresh;
