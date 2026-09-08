"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCw, Check } from "lucide-react";
import { pillClasses } from "@/components/ui";
import { hapticoExito, hapticoImpactoMedio } from "@/lib/ui/hapticos";

type BotonActualizarProps = {
  /** "pill" muestra icono + texto; "icono" muestra un cuadrado táctil de 44px */
  variante?: "pill" | "icono";
  label?: string;
  className?: string;
};

/**
 * Botón de actualización de datos en caliente para el socio.
 * Resuelve el cacheo de Next.js App Router en PWAs instaladas cuando el dueño
 * da de alta una cuota o asigna una rutina nueva, sin requerir logout.
 */
export function BotonActualizar({
  variante = "pill",
  label = "Actualizar",
  className = "",
}: BotonActualizarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [justDone, setJustDone] = useState(false);

  function handleActualizar() {
    if (isPending) return;
    hapticoImpactoMedio();

    startTransition(async () => {
      // Iniciar el refresh de los Server Components
      router.refresh();
      // Pequeño retardo defensivo para dar sensación de procesamiento táctil
      await new Promise((res) => setTimeout(res, 350));
      hapticoExito();
      setJustDone(true);
      setTimeout(() => setJustDone(false), 1400);
    });
  }

  if (variante === "icono") {
    return (
      <button
        type="button"
        onClick={handleActualizar}
        disabled={isPending}
        title="Actualizar datos"
        aria-label="Actualizar datos"
        className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-[10px] border border-rule bg-paper-2 text-ink-soft select-none touch-manipulation transition-[background-color,border-color,color,transform] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper hover:text-ink active:scale-95 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 ${className}`}
      >
        {justDone ? (
          <Check aria-hidden className="size-4 text-ok animate-fade-in" />
        ) : (
          <RotateCw
            aria-hidden
            className={`size-4 transition-transform ${
              isPending ? "animate-spin text-ink" : ""
            }`}
          />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleActualizar}
      disabled={isPending}
      className={`${pillClasses.neutra} ${className}`}
      aria-label={label}
    >
      {justDone ? (
        <Check aria-hidden className="size-3.5 text-ok animate-fade-in" />
      ) : (
        <RotateCw
          aria-hidden
          className={`size-3.5 ${isPending ? "animate-spin text-ink" : ""}`}
        />
      )}
      <span>{justDone ? "Al día" : isPending ? "Actualizando..." : label}</span>
    </button>
  );
}
