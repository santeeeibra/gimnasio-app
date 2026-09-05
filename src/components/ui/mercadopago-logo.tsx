/**
 * Isotipo de Mercado Pago (pill celeste + "apretón de manos" blanco).
 * SVG inline para no depender de assets ni CDN y que rinda igual en
 * tema claro/oscuro. Se usa junto a los títulos donde se menciona MP.
 */
export function MercadoPagoLogo({
  className = "h-4 w-auto",
  title = "Mercado Pago",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 32"
      className={className}
      role="img"
      aria-label={title}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <ellipse cx="24" cy="16" rx="23" ry="13.5" fill="#00A6E0" />
      <path
        d="M12 17.5c3.2 4.2 8.3 6.3 12.4 5.1 3.6-1.1 3-4.2.6-5.2-2.2-.9-5 .2-6.7-1.9-1.2-1.6.6-3.4 3.2-3.4 3.8 0 6.8 2.7 10.7 2.4"
        stroke="#FFFFFF"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
