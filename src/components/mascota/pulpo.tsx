/**
 * Mascota oficial de SysGym (pulpo verde-volt).
 *
 * ESTRUCTURA MÍNIMA — el diseño final (forma real del pulpo, pose de festejo,
 * animación) lo hace otra herramienta. Acá sólo van props + un placeholder que
 * compila.
 *
 * Color FIJO (identidad de plataforma, no del gimnasio): nunca leer del tema.
 * Va siempre dentro de su propia tarjeta/badge con fondo fijo — no se apoya
 * sobre `bg-paper` / `bg-paper-2`.
 */

/** Verde-lima / "volt" de plataforma. Constante, no configurable. */
export const PULPO_VERDE = "#10e7a0";

export type PulpoProps = {
  /** Lado del SVG en px. */
  size?: number;
  /** Variante de gesto — la usará el diseño final; hoy no cambia nada. */
  pose?: "festejo" | "neutral";
  className?: string;
};

export function Pulpo({ size = 96, pose = "festejo", className }: PulpoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="Mascota SysGym"
      data-pose={pose}
    >
      <circle cx="50" cy="46" r="26" fill={PULPO_VERDE} />
    </svg>
  );
}
