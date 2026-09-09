"use client";

/**
 * Mascota oficial de SysGym (pulpo verde-volt).
 *
 * Ilustración estilo flat vector con muñequera deportiva.
 * Color FIJO (#10e7a0 - volt platform brand): NUNCA depende del tema del gimnasio.
 * REGLA DE ORO: La mascota siempre se renderiza dentro de una tarjeta/badge
 * con fondo oscuro fijo (ej. PulpoCard), NUNCA directamente apoyada sobre bg-paper.
 */

export const PULPO_VERDE = "#10e7a0";

export type PulpoPose =
  | "festejo"
  | "neutral"
  | "descanso"
  | "kettlebell"
  | "checkin"
  | "buzon"
  | "vacio";

export type PulpoProps = {
  /** Lado del SVG en px. */
  size?: number;
  /** Variante de gesto y contexto. */
  pose?: PulpoPose;
  className?: string;
};

export function Pulpo({ size = 96, pose = "festejo", className = "" }: PulpoProps) {
  const isFestejo = pose === "festejo";
  const isDescanso = pose === "descanso";
  const isKettlebell = pose === "kettlebell";
  const isCheckin = pose === "checkin";
  const isBuzon = pose === "buzon";
  const isVacio = pose === "vacio";

  const brazosLevantados = isFestejo || isKettlebell || isCheckin;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none ${className}`}
      role="img"
      aria-label="Mascota SysGym - Pulpo Volt"
      data-pose={pose}
    >
      {/* Sombra proyectada plana */}
      <ellipse cx="60" cy="110" rx="36" ry="6" fill="#042f22" opacity="0.35" />

      {/* Tentáculos de fondo / traseros */}
      {brazosLevantados ? (
        <>
          {/* Tentáculo izq sup en brazos levantados */}
          <path
            d="M 38 64 C 20 54 12 36 22 24 C 28 17 38 24 34 38 C 32 46 36 56 42 66 Z"
            fill={PULPO_VERDE}
          />
          {/* Tentáculo der sup en brazos levantados */}
          <path
            d="M 82 64 C 100 54 108 36 98 24 C 92 17 82 24 86 38 C 88 46 84 56 78 66 Z"
            fill={PULPO_VERDE}
          />
        </>
      ) : (
        <>
          {/* Tentáculo izq sup en neutral / descanso */}
          <path
            d="M 36 66 C 22 60 14 46 22 36 C 28 30 36 38 32 48 Z"
            fill={PULPO_VERDE}
          />
          {/* Tentáculo der sup */}
          <path
            d="M 84 66 C 98 60 106 46 98 36 C 92 30 84 38 88 48 Z"
            fill={PULPO_VERDE}
          />
        </>
      )}

      {/* Tentáculos inferiores principales */}
      <path
        d="M 34 78 C 18 84 16 102 28 104 C 38 105 42 96 44 86 Z"
        fill={PULPO_VERDE}
      />
      <path
        d="M 44 84 C 38 98 48 106 56 105 C 64 104 60 92 56 86 Z"
        fill={PULPO_VERDE}
      />
      <path
        d="M 64 86 C 60 92 56 104 64 105 C 72 106 82 98 76 84 Z"
        fill={PULPO_VERDE}
      />
      <path
        d="M 76 86 C 78 96 82 105 92 104 C 104 102 102 84 86 78 Z"
        fill={PULPO_VERDE}
      />

      {/* Cabeza / Cuerpo Principal de Pulpo (Squircle suave) */}
      <path
        d="M 60 18 C 34 18 28 40 28 64 C 28 80 42 86 60 86 C 78 86 92 80 92 64 C 92 40 86 18 60 18 Z"
        fill={PULPO_VERDE}
      />

      {/* Brillo Flat de la cabeza */}
      <path
        d="M 42 26 C 50 21 68 21 76 25 C 72 23 54 22 42 26 Z"
        fill="#ffffff"
        opacity="0.35"
      />

      {/* Accesorios específicos de la pose */}

      {/* 1. Toalla deportiva en cabeza (Descanso) */}
      {isDescanso && (
        <g>
          <path
            d="M 38 22 C 48 12 72 12 82 22 C 86 26 80 32 74 30 C 62 26 50 26 44 30 C 38 32 34 26 38 22 Z"
            fill="#f8fafc"
          />
          {/* Botella de agua en tentáculo */}
          <rect x="88" y="44" width="12" height="20" rx="3" fill="#38bdf8" />
          <rect x="91" y="40" width="6" height="4" rx="1" fill="#0f172a" />
        </g>
      )}

      {/* 2. Pesa Rusa / Kettlebell (Kettlebell) */}
      {isKettlebell && (
        <g>
          <path
            d="M 88 16 C 88 10 100 10 100 16 V 22 H 88 Z"
            fill="none"
            stroke="#0f172a"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="94" cy="32" r="10" fill="#0f172a" />
          <text
            x="94"
            y="35"
            textAnchor="middle"
            fill="#10e7a0"
            fontSize="7"
            fontWeight="bold"
            fontFamily="monospace"
          >
            KG
          </text>
        </g>
      )}

      {/* 3. Pase de Check-in con QR (Checkin) */}
      {isCheckin && (
        <g transform="rotate(12 92 34)">
          <rect x="84" y="22" width="18" height="26" rx="4" fill="#0f172a" stroke="#10e7a0" strokeWidth="1.5" />
          <circle cx="93" cy="30" r="3.5" fill="#10e7a0" />
          <path d="M 89 39 L 92 42 L 97 37" fill="none" stroke="#10e7a0" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      )}

      {/* 4. Sobre de Notificaciones (Buzon) */}
      {isBuzon && (
        <g transform="rotate(10 92 36)">
          <rect x="82" y="26" width="22" height="16" rx="3" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
          <path d="M 82 27 L 93 35 L 104 27" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
          <circle cx="102" cy="24" r="4" fill="#10e7a0" />
        </g>
      )}

      {/* 5. Lupa de explorador (Vacio) */}
      {isVacio && (
        <g transform="rotate(15 88 36)">
          <circle cx="86" cy="32" r="9" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
          <line x1="92" y1="38" x2="100" y2="46" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}

      {/* Muñequera Deportiva (Wristband) en tentáculo frontal */}
      {brazosLevantados ? (
        <g transform="rotate(25 94 32)">
          <rect x="86" y="28" width="16" height="10" rx="3" fill="#0f172a" />
          <line x1="86" y1="31" x2="102" y2="31" stroke="#ffffff" strokeWidth="1.5" />
          <line x1="86" y1="35" x2="102" y2="35" stroke={PULPO_VERDE} strokeWidth="1.5" />
        </g>
      ) : (
        <g transform="rotate(-15 26 40)">
          <rect x="18" y="36" width="16" height="10" rx="3" fill="#0f172a" />
          <line x1="18" y1="39" x2="34" y2="39" stroke="#ffffff" strokeWidth="1.5" />
          <line x1="18" y1="43" x2="34" y2="43" stroke={PULPO_VERDE} strokeWidth="1.5" />
        </g>
      )}

      {/* Ojos Glossy Flat */}
      {isKettlebell ? (
        <>
          {/* Ojo izquierdo normal */}
          <circle cx="48" cy="54" r="7.5" fill="#0f172a" />
          <circle cx="50.5" cy="51.5" r="2.8" fill="#ffffff" />
          <circle cx="46.5" cy="55.5" r="1.2" fill="#ffffff" />
          {/* Ojo derecho guiñando en esfuerzo */}
          <path d="M 66 54 Q 72 49 78 54" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="48" cy="54" r="7.5" fill="#0f172a" />
          <circle cx="72" cy="54" r="7.5" fill="#0f172a" />
          {/* Pop de luz en pupilas */}
          <circle cx="50.5" cy="51.5" r="2.8" fill="#ffffff" />
          <circle cx="74.5" cy="51.5" r="2.8" fill="#ffffff" />
          <circle cx="46.5" cy="55.5" r="1.2" fill="#ffffff" />
          <circle cx="70.5" cy="55.5" r="1.2" fill="#ffffff" />
        </>
      )}

      {/* Mejillas / Sonrojo deportivo */}
      <ellipse cx="40" cy="62" rx="4.5" ry="2.5" fill="#047857" opacity="0.45" />
      <ellipse cx="80" cy="62" rx="4.5" ry="2.5" fill="#047857" opacity="0.45" />

      {/* Boca */}
      {brazosLevantados ? (
        <path d="M 52 61 Q 60 73 68 61 Z" fill="#0f172a" />
      ) : (
        <path
          d="M 53 62 Q 60 69 67 62"
          fill="none"
          stroke="#0f172a"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

export type PulpoCardProps = PulpoProps & {
  cardClassName?: string;
};

/**
 * Contenedor oficial obligatorio para la mascota.
 * Garantiza fondo oscuro fijo (zinc-950 / slate-950) con bordes suaves,
 * evitando que la mascota se apoye directamente sobre el tema del gimnasio.
 */
export function PulpoCard({
  size = 96,
  pose = "festejo",
  className,
  cardClassName = "",
}: PulpoCardProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-[20px] bg-zinc-950 border border-emerald-500/30 p-3 shadow-xl overflow-hidden ${cardClassName}`}
    >
      {/* Resplandor ambiental radial volt */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,231,160,0.18)_0%,transparent_70%)] pointer-events-none" />
      <Pulpo size={size} pose={pose} className={className} />
    </div>
  );
}


