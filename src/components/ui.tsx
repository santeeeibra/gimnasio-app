"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { hapticoSeleccion } from "@/lib/ui/hapticos";

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
    "inline-flex items-center justify-center gap-2 h-11 px-4 text-sm font-medium rounded-[12px] select-none touch-manipulation transition-[transform,background-color,border-color,color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none";
  const styles = {
    primary: "bg-ink text-paper hover:brightness-125 shadow-sm",
    ghost: "border border-rule text-ink hover:bg-paper-2",
    danger: "border border-danger text-danger hover:bg-danger hover:text-paper",
    volt: "bg-volt text-volt-ink hover:brightness-95 shadow-sm",
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
 * Estilo ÚNICO para links de texto EN PROSA (navegación inline y acciones
 * terciarias dentro de un bloque de texto: "Modo avanzado", `<summary>` que
 * hacen de link). Ningún `<a>`/`<Link>`/`<button>` textual arma su className
 * a mano. Ver REGLAS_UI_EMIL.md §11/§12/§20.
 *
 * OJO: las acciones de CABECERA ("Salir", "← Volver", "Ver tutorial de nuevo",
 * "Cambiar PIN") NO van acá: son controles y usan `pillClasses` (§3). Dejarlas
 * como texto suelto subrayado está prohibido.
 *
 * - `inline`: dentro de un párrafo. Subrayado sutil, hereda el tamaño.
 * - `accion`: control suelto. Sin subrayado en reposo, padding para el target
 *   táctil (§3/§11), feedback de press.
 * - `plano`: solo color + subrayado + foco, sin display ni caja. Para cuando el
 *   elemento ya trae su layout (`w-full`, padding propio, posición negativa).
 */
export const linkClasses = {
  inline:
    "underline decoration-rule underline-offset-[3px] transition-[color,text-decoration-color] duration-150 [transition-timing-function:var(--ease-out)] hover:decoration-ink focus-visible:outline-none focus-visible:rounded-[3px] focus-visible:ring-2 focus-visible:ring-ink/20",
  accion:
    "inline-flex min-h-11 items-center gap-1 -mx-2 px-2 text-sm text-ink-soft underline decoration-transparent underline-offset-[3px] transition-[color,text-decoration-color,transform] duration-150 [transition-timing-function:var(--ease-out)] hover:text-ink hover:decoration-rule active:scale-95 focus-visible:outline-none focus-visible:rounded-[4px] focus-visible:ring-2 focus-visible:ring-ink/20",
  plano:
    "text-ink-soft underline decoration-transparent underline-offset-[3px] transition-[color,text-decoration-color] duration-150 [transition-timing-function:var(--ease-out)] hover:text-ink hover:decoration-rule focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20",
} as const;

/**
 * Acciones de cabecera ("Tutorial", "Salir", "← Volver", "Cambiar PIN"): NO son
 * links de navegación en prosa, son controles. Por eso llevan superficie propia
 * (borde + fondo sutil) y target táctil real de 44px (`min-h-11`, §3 de
 * REGLAS_UI_EMIL.md). Nunca texto suelto subrayado.
 *
 * - `neutra`: acción reversible (volver, ver tutorial, cambiar PIN).
 * - `destructiva`: cierra sesión o descarta datos. Se lee distinto de `neutra`
 *   a propósito: texto/borde en `--danger`, relleno al presionar.
 */
const pillBase =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] border px-3 text-sm font-medium select-none touch-manipulation transition-[background-color,border-color,color,transform] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20";

export const pillClasses = {
  neutra: `${pillBase} border-rule bg-paper-2 text-ink-soft hover:bg-paper hover:text-ink`,
  destructiva: `${pillBase} border-danger/40 bg-transparent text-danger hover:bg-danger hover:text-paper hover:border-danger`,
} as const;

export function LinkButton({
  className = "",
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link
      className={`inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium rounded-[10px] border border-rule text-ink hover:bg-paper-2 transition-colors ${className}`}
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
        className={`w-full h-11 px-3 rounded-[10px] border border-rule bg-paper text-[16px] outline-none transition-[border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] focus:border-ink focus:shadow-[0_0_0_3px_rgb(22_24_29_/_0.08)] ${className ?? ""}`}
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
          className={`w-full h-11 pl-3 pr-9 rounded-[10px] border border-rule bg-paper text-[16px] appearance-none outline-none transition-[border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] focus:border-ink focus:shadow-[0_0_0_3px_rgb(22_24_29_/_0.08)] ${className ?? ""}`}
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

/**
 * Switch on/off estilo iOS/banking. NO es un checkbox de selección múltiple:
 * usarlo solo para estados binarios (activar/desactivar una opción).
 * Envía como `<input type="checkbox" name>` normal → funciona con FormData y
 * server actions. Soporta uso controlado (`checked` + `onCheckedChange`/`onChange`)
 * y no controlado (`defaultChecked` + `name`). Dispara háptico de selección.
 */
export function Toggle({
  label,
  hint,
  className = "",
  onChange,
  onCheckedChange,
  disabled,
  ...props
}: ComponentProps<"input"> & {
  label?: string;
  hint?: string;
  onCheckedChange?: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex items-start gap-3 select-none touch-manipulation ${
        disabled ? "opacity-50" : "cursor-pointer"
      } ${className}`}
    >
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          role="switch"
          disabled={disabled}
          onChange={(e) => {
            hapticoSeleccion();
            onCheckedChange?.(e.currentTarget.checked);
            onChange?.(e);
          }}
          className="peer sr-only"
          {...props}
        />
        <span
          aria-hidden
          className="block h-[30px] w-[52px] rounded-full border-2 border-rule bg-paper-3 transition-all duration-200 [transition-timing-function:var(--ease-out)] peer-checked:border-volt peer-checked:bg-volt peer-checked:shadow-[0_0_12px_rgba(16,231,160,0.35)] peer-focus-visible:ring-2 peer-focus-visible:ring-volt/40"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute left-[3px] top-[3px] size-[24px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.4)] transition-transform duration-200 [transition-timing-function:var(--ease-spring)] peer-checked:translate-x-[22px] peer-active:scale-95"
        />
      </span>
      {label || hint ? (
        <span className="min-w-0">
          {label ? (
            <span className="block text-sm font-medium text-ink">{label}</span>
          ) : null}
          {hint ? (
            <span
              className={`block text-xs text-ink-soft ${label ? "mt-0.5" : ""}`}
            >
              {hint}
            </span>
          ) : null}
        </span>
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
    <div className={`border border-rule rounded-[14px] bg-paper-2 ${className}`}>
      {children}
    </div>
  );
}
