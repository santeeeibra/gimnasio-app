"use client";

export function Radios({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label?: string;
  name: string;
  value: string;
  options: { value: string; label: string; hint?: string }[];
  onChange?: (value: string) => void;
}) {
  return (
    <fieldset>
      {label && (
        <legend className="block text-[13px] font-medium text-ink-soft mb-2">
          {label}
        </legend>
      )}
      <div className="space-y-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className="flex items-start gap-3 cursor-pointer p-3 rounded-[5px] border border-rule bg-paper-2 transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper active:scale-[0.99]"
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={(e) => onChange?.(e.target.value)}
              className="peer sr-only"
            />
            <span className="size-4 shrink-0 mt-0.5 rounded-full border-2 border-rule bg-paper transition-colors duration-150 [transition-timing-function:var(--ease-out)] peer-checked:border-volt peer-checked:bg-volt peer-checked:shadow-[inset_0_0_0_3px_var(--paper)]" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink">{opt.label}</p>
              {opt.hint && (
                <p className="text-xs text-ink-soft mt-0.5">{opt.hint}</p>
              )}
            </div>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
