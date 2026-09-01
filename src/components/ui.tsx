import Link from "next/link";
import type { ComponentProps } from "react";

export function Button({
  className = "",
  variant = "primary",
  ...props
}: ComponentProps<"button"> & { variant?: "primary" | "ghost" | "danger" }) {
  const base =
    "inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-medium rounded-[5px] transition-colors disabled:opacity-50 disabled:pointer-events-none";
  const styles = {
    primary: "bg-ink text-paper hover:bg-black",
    ghost: "border border-rule text-ink hover:bg-paper-2",
    danger: "border border-danger text-danger hover:bg-danger hover:text-paper",
  }[variant];
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}

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
  ...props
}: ComponentProps<"input"> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-ink-soft mb-1.5">
        {label}
      </span>
      <input
        className="w-full h-10 px-3 rounded-[5px] border border-rule bg-white text-sm outline-none focus:border-ink"
        {...props}
      />
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
    <div className={`border border-rule rounded-[6px] bg-white ${className}`}>
      {children}
    </div>
  );
}
