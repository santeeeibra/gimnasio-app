"use client";

import { useMemo } from "react";
import { ExternalLink, Shield, Dumbbell } from "lucide-react";
import {
  obtenerEquipamientoParaEjercicio,
  type ProductoAfiliado,
} from "@/lib/monetizacion/afiliados";
import { useHapticos } from "@/lib/ui/hapticos";

interface EquipamientoSugeridoProps {
  ejercicio?: {
    nombre?: string | null;
    grupo_muscular?: string | null;
    equipo?: string | null;
    patron?: string | null;
  } | null;
  className?: string;
}

export function EquipamientoSugerido({
  ejercicio,
  className = "",
}: EquipamientoSugeridoProps) {
  const hapticos = useHapticos();

  const producto: ProductoAfiliado | null = useMemo(() => {
    return obtenerEquipamientoParaEjercicio(ejercicio ?? undefined);
  }, [ejercicio]);

  // Si no hay producto asignado o no tiene URL oficial configurada, no renderiza nada
  if (!producto || !producto.urlDirecta) return null;

  return (
    <div
      className={`rounded-[14px] border border-rule bg-paper-2/90 p-3.5 shadow-xs transition-all ${className}`}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="grid size-6 place-items-center rounded-[6px] bg-accent/15 text-accent">
          {producto.icono === "shield" ? (
            <Shield className="size-3.5" />
          ) : (
            <Dumbbell className="size-3.5" />
          )}
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-accent">
          Accesorio Biomecánico Opcional
        </span>
      </div>

      <div>
        <h4 className="text-[13px] font-bold text-ink leading-tight">
          {producto.titulo}
        </h4>
        <p className="mt-1 text-[11.5px] leading-snug text-ink-soft">
          {producto.explicacionBiomecanica}
        </p>
      </div>

      <div className="mt-3 pt-2.5 border-t border-rule/60 flex items-center justify-between gap-3">
        <span className="text-[9.5px] text-ink-soft/70 leading-tight max-w-[180px]">
          Enlace de afiliado (ML). Apoya el desarrollo sin costo extra.
        </span>
        <a
          href={producto.urlDirecta}
          target="_blank"
          rel="sponsored nofollow noopener noreferrer"
          onClick={() => hapticos.suave()}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-[9px] bg-accent px-3 py-1.5 text-xs font-bold text-accent-ink transition-transform active:scale-95 hover:opacity-95 cursor-pointer"
        >
          <span>Ver opción</span>
          <ExternalLink className="size-3" />
        </a>
      </div>
    </div>
  );
}
