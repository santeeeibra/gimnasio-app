"use client";

import { useMemo } from "react";
import { ExternalLink, Shield, Sparkles, Dumbbell, Zap } from "lucide-react";
import {
  obtenerEquipamientoParaEjercicio,
  construirEnlaceAfiliado,
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
  /** Variante visual: 'compacto' (para fila de lista) o 'tarjeta' (para modal/detalle) */
  variante?: "compacto" | "tarjeta";
  className?: string;
}

export function EquipamientoSugerido({
  ejercicio,
  variante = "tarjeta",
  className = "",
}: EquipamientoSugeridoProps) {
  const hapticos = useHapticos();

  const producto: ProductoAfiliado | null = useMemo(() => {
    return obtenerEquipamientoParaEjercicio(ejercicio ?? undefined);
  }, [ejercicio]);

  if (!producto) return null;

  const urlAfiliado = construirEnlaceAfiliado(producto, "mercadolibre");

  const handleClick = () => {
    hapticos.suave();
  };

  if (variante === "compacto") {
    return (
      <a
        href={urlAfiliado}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        aria-label={`Ver ${producto.titulo} en Mercado Libre`}
        className={`inline-flex items-center gap-1.5 rounded-[8px] border border-accent/20 bg-accent/5 px-2.5 py-1 text-[11px] font-medium text-ink-soft transition-all duration-150 [transition-timing-function:var(--ease-out)] hover:border-accent/40 hover:text-ink active:scale-[0.98] ${className}`}
      >
        <Sparkles className="size-3 text-accent shrink-0" />
        <span className="truncate">Sugerido: {producto.titulo}</span>
        <ExternalLink className="size-2.5 text-accent shrink-0" />
      </a>
    );
  }

  // Variante 'tarjeta' completa para modales o pie de ejercicio
  return (
    <div
      className={`rounded-[14px] border border-rule bg-paper-2/80 p-3.5 shadow-xs transition-all backdrop-blur-xs ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="grid size-6 place-items-center rounded-[6px] bg-accent/15 text-accent">
            {producto.icono === "shield" ? (
              <Shield className="size-3.5" />
            ) : producto.icono === "straps" ? (
              <Dumbbell className="size-3.5" />
            ) : (
              <Zap className="size-3.5" />
            )}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-accent">
            Equipamiento recomendado
          </span>
        </div>
        {producto.etiquetaPromo ? (
          <span className="rounded-full bg-accent/10 border border-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">
            {producto.etiquetaPromo}
          </span>
        ) : null}
      </div>

      <div className="mt-1">
        <h4 className="text-[13px] font-bold text-ink leading-tight">
          {producto.titulo}
        </h4>
        <p className="mt-1 text-[11.5px] leading-snug text-ink-soft">
          {producto.beneficioCientifico}
        </p>
      </div>

      <div className="mt-3 pt-2.5 border-t border-rule/60 flex items-center justify-between gap-3">
        <span className="text-[10px] text-ink-soft/70">
          Encontralo en Mercado Libre
        </span>
        <a
          href={urlAfiliado}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-[10px] bg-accent px-3.5 py-1.5 text-xs font-bold text-accent-ink transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 shadow-xs hover:opacity-95 cursor-pointer"
        >
          <span>Ver opciones</span>
          <ExternalLink className="size-3" />
        </a>
      </div>
    </div>
  );
}
