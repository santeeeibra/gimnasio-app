import Link from "next/link";
import type { ComponentProps } from "react";

/** Círculo de carga. Hereda el color del texto (`currentColor`), así sirve
 *  sobre cualquier variante de botón o superficie. */
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block size-4 shrink-0 rounded-full border-2 border-current/30 border-t-current spin-fast ${className}`}
    />
  );
}

export function Button({
  className = "",
  variant = "primary",
  loading = false,
  disabled,
  children,
  ...props
}: ComponentProps<"button"> & {
  variant?: "primary" | "ghost" | "danger" | "volt";
  loading?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 h-11 px-4 text-sm font-medium rounded-[5px] select-none touch-manipulation transition-[transform,background-color,border-color,color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none";
  const styles = {
    primary: "bg-ink text-paper hover:brightness-125",
    ghost: "border border-rule text-ink hover:bg-paper-2",
    danger: "border border-danger text-danger hover:bg-danger hover:text-paper",
    volt: "bg-volt text-volt-ink hover:brightness-95",
  }[variant];
  return (
    <button
      className={`${base} ${styles} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

/**
 * Estilo ÚNICO para links de texto (navegación inline y acciones terciarias:
 * "Salir", "← Volver", "Ver de nuevo", "Modo avanzado", `<summary>` que hacen
 * de link). Ningún `<a>`/`<Link>`/`<button>` textual arma su className a mano.
 * Ver REGLAS_UI_EMIL.md §11/§12/§20.
 *
 * - `inline`: dentro de un párrafo. Subrayado sutil, hereda el tamaño.
 * - `accion`: control suelto. Sin subrayado en reposo, padding para el target
 *   táctil (§3/§11), feedback de press.
 */
export const linkClasses = {
  inline:
    "underline decoration-rule underline-offset-[3px] transition-[color,text-decoration-color] duration-150 [transition-timing-function:var(--ease-out)] hover:decoration-ink focus-visible:outline-none focus-visible:rounded-[3px] focus-visible:ring-2 focus-visible:ring-ink/20",
  accion:
    "inline-flex items-center gap-1 -mx-1 px-1 py-0.5 text-sm text-ink-soft underline decoration-transparent underline-offset-[3px] transition-[color,text-decoration-color,transform] duration-150 [transition-timing-function:var(--ease-out)] hover:text-ink hover:decoration-rule active:scale-95 focus-visible:outline-none focus-visible:rounded-[4px] focus-visible:ring-2 focus-visible:ring-ink/20",
} as const;

export function LinkButton({
  className = "",
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link
      className={`inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium rounded-[5px] border border-rule text-ink hover:bg-paper-2 transition-colors ${className}`}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  className,
  ...props
}: ComponentProps<"input"> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-ink-soft mb-1.5">
        {label}
      </span>
      <input
        className={`w-full h-11 px-3 rounded-[5px] border border-rule bg-paper text-[16px] outline-none transition-[border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] focus:border-ink focus:shadow-[0_0_0_3px_rgb(22_24_29_/_0.08)] ${className ?? ""}`}
        {...props}
      />
      {hint ? (
        <span className="block text-xs text-ink-soft mt-1">{hint}</span>
      ) : null}
    </label>
  );
}

export function Select({
  label,
  hint,
  className,
  children,
  ...props
}: ComponentProps<"select"> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-ink-soft mb-1.5">
        {label}
      </span>
      <span className="relative block">
        <select
          className={`w-full h-11 pl-3 pr-9 rounded-[5px] border border-rule bg-paper text-[16px] appearance-none outline-none transition-[border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] focus:border-ink focus:shadow-[0_0_0_3px_rgb(22_24_29_/_0.08)] ${className ?? ""}`}
          {...props}
        >
          {children}
        </select>
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </span>
      {hint ? (
        <span className="block text-xs text-ink-soft mt-1">{hint}</span>
      ) : null}
    </label>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`border border-rule rounded-[6px] bg-paper-2 ${className}`}>
      {children}
    </div>
  );
}
