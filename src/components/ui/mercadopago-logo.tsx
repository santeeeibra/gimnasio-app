/**
 * Isotipo / imagotipo oficial de Mercado Pago.
 * Usa el logo oficial 3D (disco celeste con borde azul marino y apretón de manos en blanco).
 */
export function MercadoPagoLogo({
  className = "h-4 w-auto",
  showWordmark = false,
  title = "Mercado Pago",
}: {
  className?: string;
  showWordmark?: boolean;
  title?: string;
}) {
  const icon = (
    <span
      className={`inline-flex items-center justify-center shrink-0 overflow-hidden ${className}`}
      style={{ aspectRatio: "3 / 2" }}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/mercadopago-icon.png"
        alt={title}
        width={30}
        height={20}
        className="pointer-events-none select-none"
        style={{
          width: "100%",
          height: "100%",
          maxHeight: "100%",
          maxWidth: "100%",
          objectFit: "contain",
          display: "block",
        }}
        loading="eager"
        decoding="async"
      />
    </span>
  );

  if (!showWordmark) {
    return icon;
  }

  return (
    <span className="inline-flex items-center gap-1.5 align-middle select-none shrink-0">
      {icon}
      <span className="font-bold tracking-tight text-[#009EE3]">
        Mercado Pago
      </span>
    </span>
  );
}
