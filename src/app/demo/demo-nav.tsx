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

/**
 * Mobile y Desktop: pill flotante despegada de los bordes con backdrop-blur,
 * sombra y esquinas squircle. Mismo lenguaje que `PanelBottomNav`.
 */
export function DemoNav() {
  const { vista, ir } = useDemoVista();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-2">
      <nav className="pointer-events-auto flex w-full max-w-[380px] items-stretch gap-1 rounded-[22px] border border-rule/80 bg-paper/80 p-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.28)] backdrop-blur-xl backdrop-saturate-150">
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
              className={`relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-[16px] px-1 py-1.5 text-[11px] tracking-tight touch-manipulation transition-[transform,background-color,color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-90 ${
                active
                  ? "bg-ink text-paper shadow-sm"
                  : "text-ink-soft hover:text-ink hover:bg-paper-2/40"
              }`}
            >
              <item.Icono
                aria-hidden
                strokeWidth={active ? 2.2 : 1.8}
                className="size-5 shrink-0"
              />
              <span className={active ? "font-semibold" : undefined}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
