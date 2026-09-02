/**
 * Componente AnilloProgreso: anillo SVG con número central en fuente héroe.
 * Usado para indicadores circulares de progreso (ej: días restantes de cuota).
 */

type AnilloProgresoProps = {
  valor: number;
  max: number;
  label: string;
  className?: string;
};

export function AnilloProgreso({
  valor,
  max,
  label,
  className = "",
}: AnilloProgresoProps) {
  const porcentaje = max > 0 ? Math.min((valor / max) * 100, 100) : 0;
  const radio = 54; // radio del círculo
  const stroke = 8; // grosor del anillo
  const normalizedRadius = radio - stroke / 2;
  const circunferencia = normalizedRadius * 2 * Math.PI;
  const offset = circunferencia - (porcentaje / 100) * circunferencia;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={radio * 2}
        height={radio * 2}
        className="transform -rotate-90"
      >
        {/* Círculo de fondo */}
        <circle
          cx={radio}
          cy={radio}
          r={normalizedRadius}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="transparent"
          className="text-rule"
        />
        {/* Círculo de progreso */}
        <circle
          cx={radio}
          cy={radio}
          r={normalizedRadius}
          stroke="var(--volt)"
          strokeWidth={stroke}
          fill="transparent"
          strokeDasharray={circunferencia}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-500 [transition-timing-function:var(--ease-out)]"
        />
      </svg>
      {/* Número central */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p
          className="font-[700] leading-none tracking-tight text-ink"
          style={{ fontFamily: "var(--font-hero)" }}
          aria-label={`${valor} ${label}`}
        >
          <span className="text-4xl">{valor}</span>
        </p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-ink-soft">
          {label}
        </p>
      </div>
    </div>
  );
}
