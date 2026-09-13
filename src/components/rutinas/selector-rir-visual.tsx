"use client";

import { Flame, ShieldCheck, Zap, Activity } from "lucide-react";
import { hapticoImpactoMedio } from "@/lib/ui/hapticos";

export type OpcionRir = {
  valor: number;
  label: string;
  sublabel: string;
  icono: typeof Flame;
  colorCls: string;
  activeCls: string;
};

export const OPCIONES_RIR: OpcionRir[] = [
  {
    valor: 0,
    label: "RIR 0",
    sublabel: "Fallo Muscular (0 reps)",
    icono: Flame,
    colorCls: "border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20",
    activeCls: "border-rose-500 bg-rose-500/25 text-rose-200 ring-2 ring-rose-500/40 shadow-lg shadow-rose-500/20",
  },
  {
    valor: 1,
    label: "RIR 1",
    sublabel: "Al límite (1 rep sufrida)",
    icono: Zap,
    colorCls: "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20",
    activeCls: "border-amber-500 bg-amber-500/25 text-amber-200 ring-2 ring-amber-500/40 shadow-lg shadow-amber-500/20",
  },
  {
    valor: 2,
    label: "RIR 2",
    sublabel: "Punto Dulce (2 reps óptimas)",
    icono: ShieldCheck,
    colorCls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
    activeCls: "border-emerald-500 bg-emerald-500/25 text-emerald-200 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-500/20",
  },
  {
    valor: 3,
    label: "RIR 3+",
    sublabel: "Moderado (3-4 reps)",
    icono: Activity,
    colorCls: "border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20",
    activeCls: "border-sky-500 bg-sky-500/25 text-sky-200 ring-2 ring-sky-500/40 shadow-lg shadow-sky-500/20",
  },
];

interface Props {
  rirSeleccionado: number | null;
  onSelectRir: (rir: number) => void;
  className?: string;
}

export function SelectorRirVisual({ rirSeleccionado, onSelectRir, className = "" }: Props) {
  const handleSelect = (val: number) => {
    hapticoImpactoMedio();
    onSelectRir(val);
  };

  return (
    <div className={`grid grid-cols-2 gap-2 sm:grid-cols-4 ${className}`}>
      {OPCIONES_RIR.map((opc) => {
        const Icono = opc.icono;
        const isSelected = rirSeleccionado === opc.valor;

        return (
          <button
            key={opc.valor}
            type="button"
            onClick={() => handleSelect(opc.valor)}
            className={`flex h-11 items-center justify-start gap-2.5 rounded-[12px] border px-3 text-left transition-all duration-150 active:scale-[0.97] ${
              isSelected ? opc.activeCls : opc.colorCls
            }`}
          >
            <Icono className="size-4 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] font-bold tracking-tight font-mono tabular-nums leading-tight">
                {opc.label}
              </span>
              <span className="text-[10px] opacity-80 leading-tight">
                {opc.sublabel}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
