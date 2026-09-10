"use client";

import { Dumbbell, House, Scale } from "lucide-react";
import { hapticoSeleccion } from "@/lib/ui/hapticos";
import { useDemoVista, type DemoVista } from "./demo-shell";

// Íconos: SIEMPRE de lucide-react (REGLAS_UI_EMIL.md §14).
const NAV: { v: DemoVista; label: string; Icono: typeof House }[] = [
  { v: "inicio", label: "Inicio", Icono: House },
  { v: "rutina", label: "Rutina", Icono: Dumbbell },
  { v: "peso", label: "Peso", Icono: Scale },
];

/** Mismo lenguaje visual que `MiBottomNav`, pero cambia de vista en memoria. */
export function DemoNav() {
  const { vista, ir } = useDemoVista();
  const activeIdx = Math.max(
    NAV.findIndex((item) => item.v === vista),
    0,
  );

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-rule bg-paper/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
      <div className="relative mx-auto flex max-w-md">
        <span
          aria-hidden
          className="pointer-events-none absolute top-0 flex justify-center transition-transform duration-300 [transition-timing-function:var(--ease-in-out)]"
          style={{
            width: `${100 / NAV.length}%`,
            transform: `translateX(${activeIdx * 100}%)`,
          }}
        >
          <span className="h-0.5 w-8 rounded-full bg-volt" />
        </span>

        {NAV.map((item) => {
          const active = item.v === vista;
          return (
            <button
              key={item.v}
              type="button"
              onClick={() => {
                hapticoSeleccion();
                ir(item.v);
              }}
              aria-current={active ? "page" : undefined}
              className={`relative flex-1 flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-[11px] tracking-tight touch-manipulation active:scale-95 transition-[transform,color] duration-150 [transition-timing-function:var(--ease-out)] ${
                active ? "text-ink" : "text-ink-soft"
              }`}
            >
              <item.Icono
                aria-hidden
                strokeWidth={active ? 2.2 : 1.8}
                className="size-5"
              />
              <span className={active ? "font-medium" : undefined}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
