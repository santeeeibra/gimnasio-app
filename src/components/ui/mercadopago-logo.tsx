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
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/mercadopago-icon.png"
      alt={title}
      className={`inline-block object-contain shrink-0 align-middle ${className}`}
      loading="eager"
    />
  );

  if (!showWordmark) {
    return icon;
  }

  return (
    <span className="inline-flex items-center gap-1.5 align-middle select-none">
      {icon}
      <span className="font-bold tracking-tight text-[#009EE3]">
        Mercado Pago
      </span>
    </span>
  );
}
