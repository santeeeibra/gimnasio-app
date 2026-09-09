"use client";

/**
 * Indicador de carga oficial de SysGym: la mascota (pulpo volt-green).
 * Reemplaza los spinners genéricos con la mascota SVG oficial sobre tarjeta
 * de fondo oscuro fijo sin parpadeos ni cajas blancas de PNG.
 */

import { PulpoCard } from "./pulpo";

export type MascotaLoadingProps = {
  /** Lado del sprite en px. */
  size?: number;
  /** Texto para lectores de pantalla. */
  label?: string;
  mostrarLabel?: boolean;
  className?: string;
};

export function MascotaLoading({
  size = 48,
  label = "Cargando…",
  mostrarLabel = false,
  className = "",
}: MascotaLoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-2 ${className}`}
    >
      <div className="relative shrink-0 flex items-center justify-center animate-bounce duration-700">
        <PulpoCard
          size={size}
          pose="festejo"
          cardClassName="!p-2.5 !rounded-full shadow-lg border-emerald-500/40"
        />
      </div>

      {mostrarLabel ? (
        <span className="text-xs font-bold text-emerald-400 tracking-wide">{label}</span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </div>
  );
}

export default MascotaLoading;

