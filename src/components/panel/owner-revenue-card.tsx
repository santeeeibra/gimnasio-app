import Link from "next/link";
import { ArrowUpRight, Wallet } from "lucide-react";

/** Visual-only summary. Amounts always come from the caller's existing data. */
export function OwnerRevenueCard({ amount, comparison, href, protectedSummary = false }: {
  amount: number | null;
  comparison?: string;
  href?: string;
  protectedSummary?: boolean;
}) {
  const content = <>
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft">
        <Wallet aria-hidden className="size-4" /> {protectedSummary ? "Ingresos del gimnasio" : "Cobrado este mes"}
      </span>
      {href ? <ArrowUpRight aria-hidden className="size-5 text-ink-soft" /> : null}
    </div>
    <p className="owner-revenue-value mt-3 font-display font-semibold tracking-tight tabular-nums text-ink">
      {protectedSummary ? "Consultar ingresos" : amount === null ? "No disponible" : new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(amount)}
    </p>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-rule/60 pt-3">
      <span className="text-xs text-ink-soft">{protectedSummary ? "Consultá tus cobros en la sección de ingresos" : amount === null ? "No se pudieron cargar los ingresos" : comparison ?? "Pagos confirmados del mes"}</span>
      {href ? <span className="text-xs font-semibold text-[color:var(--owner-accent-label)]">Ver ingresos</span> : null}
    </div>
  </>;
  const className = "owner-revenue owner-surface block rounded-[16px] border border-rule p-5";
  return href
    ? <Link href={href} className={`${className} min-h-11 transition-transform active:scale-[0.99]`} aria-label={protectedSummary ? "Consultar ingresos del gimnasio" : "Ingresos: cobrado este mes"}>{content}</Link>
    : <section className={className} aria-label="Cobrado este mes">{content}</section>;
}
