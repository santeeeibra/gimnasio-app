import Image from "next/image";

/**
 * Variante de la mascota basada en PNG generado por IA (en vez de SVG vectorial).
 * Mantiene la Regla de Oro de la skill: fondo oscuro fijo + resplandor volt,
 * la mascota nunca se apoya directo sobre bg-paper.
 *
 * Los archivos viven en /public/mascota/pulpo-<pose>.png (fondo transparente).
 */

export type PulpoImagenPose =
  | "saludo"
  | "festejo"
  | "vacio"
  | "entrenador"
  | "buscando"
  | "oops";

export type PulpoImagenProps = {
  size?: number;
  pose?: PulpoImagenPose;
  className?: string;
};

export function PulpoImagen({ size = 96, pose = "vacio", className = "" }: PulpoImagenProps) {
  return (
    <Image
      src={`/mascota/pulpo-${pose}.png`}
      alt="Mascota SysGym - Pulpo Volt"
      width={size}
      height={size}
      className={`select-none ${className}`}
      unoptimized
    />
  );
}

export type PulpoImagenCardProps = PulpoImagenProps & {
  cardClassName?: string;
};

export function PulpoImagenCard({
  size = 96,
  pose = "vacio",
  className,
  cardClassName = "",
}: PulpoImagenCardProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-[20px] bg-zinc-950 border border-emerald-500/30 p-3 shadow-xl overflow-hidden ${cardClassName}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,231,160,0.18)_0%,transparent_70%)] pointer-events-none" />
      <PulpoImagen size={size} pose={pose} className={className} />
    </div>
  );
}
