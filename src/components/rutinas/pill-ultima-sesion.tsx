"use client";

import { Sparkles, TrendingUp } from "lucide-react";
import { hapticoExito } from "@/lib/ui/hapticos";

export type DatosUltimaSesion = {
  peso?: number | null;
  reps?: number | null;
  rir?: number | null;
  fechaText?: string | null;
};

interface Props {
  datos: DatosUltimaSesion | null;
  onAplicarSobrecarga: (pesoNuevo: number, repsNuevas: number) => void;
  className?: string;
}

export function PillUltimaSesion({ datos, onAplicarSobrecarga, className = "" }: Props) {
  if (!datos || (!datos.peso && !datos.reps)) return null;

  const pesoBase = datos.peso || 0;
  const repsBase = datos.reps || 10;

  // Lógica de sobrecarga progresiva sugerida: +2.5kg si es peso significativo, o +1 rep
  const pesoSugerido = pesoBase > 0 ? pesoBase + 2.5 : 0;
  const repsSugeridas = pesoBase > 0 ? repsBase : repsBase + 1;

  const handleClick = () => {
    hapticoExito();
    onAplicarSobrecarga(pesoSugerido, repsSugeridas);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Toca para autocompletar con sobrecarga progresiva (+2.5 kg / +1 rep)"
      className={`inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[12px] font-medium text-emerald-400 backdrop-blur-xl transition-all duration-150 active:scale-[0.96] hover:bg-emerald-500/20 ${className}`}
    >
      <Sparkles className="size-3.5 text-emerald-400 shrink-0 animate-pulse" />
      <span>
        Última vez: <strong className="font-mono tabular-nums text-emerald-300">{pesoBase > 0 ? `${pesoBase}kg` : ""} {repsBase} reps</strong>
        {datos.rir !== undefined && datos.rir !== null ? ` (RIR ${datos.rir})` : ""}
      </span>
      <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
        <TrendingUp className="size-2.5" /> +2.5kg
      </span>
    </button>
  );
}
