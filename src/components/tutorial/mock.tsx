"use client";

/**
 * Fragmentos "de mentira" para el tutorial. No son componentes reales de la
 * app: imitan su aspecto con los mismos tokens, sin estado que persista y sin
 * tocar Supabase. Todo el contenido es texto fijo.
 */

export function MockField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="block text-[13px] font-medium text-ink-soft mb-1">
        {label}
      </span>
      <div className="flex h-11 w-full items-center rounded-[5px] border border-rule bg-paper px-3 text-[15px] text-ink">
        <span className="min-w-0 truncate">{value}</span>
      </div>
    </div>
  );
}

export function MockButton({
  children,
  onClick,
  tone = "ink",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: "ink" | "volt";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-[5px] px-3 text-sm font-medium transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 ${
        tone === "volt" ? "bg-volt text-volt-ink" : "bg-ink text-paper"
      }`}
    >
      {children}
    </button>
  );
}
