"use client";

import { useState } from "react";
import { ChevronRight, SlidersHorizontal } from "lucide-react";
import { hapticoImpactoSuave } from "@/lib/ui/hapticos";

export function MasOpcionesAcordeon({ children }: { children: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false);

  const toggle = () => {
    hapticoImpactoSuave();
    setAbierto((prev) => !prev);
  };

  return (
    <div className="rounded-[16px] border border-rule bg-paper-2 shadow-sm overflow-hidden transition-all duration-200">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={abierto}
        className="flex w-full cursor-pointer select-none items-center justify-between p-4 text-sm font-semibold text-ink hover:bg-paper-3/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
      >
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-[8px] border border-rule bg-paper text-accent">
            <SlidersHorizontal className="size-4" />
          </div>
          <span>Más opciones</span>
        </div>
        <ChevronRight
          className={`size-4 text-ink-soft transition-transform duration-200 ${
            abierto ? "rotate-90 text-ink" : ""
          }`}
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 [transition-timing-function:var(--ease-out)] ${
          abierto ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-4 pt-1 space-y-4 border-t border-rule">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
