"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui";
import { hapticoImpactoMedio, hapticoSeleccion } from "@/lib/ui/hapticos";

/**
 * Muro de conversión del demo. Usa los tokens del tema (bg-paper, border-rule,
 * --volt) para que se vea como parte de la app, no como una pantalla aparte.
 */
export function LoginWall({
  titulo,
  detalle,
  onClose,
}: {
  titulo: string;
  detalle: string;
  onClose?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/65 backdrop-blur-md animate-fade-in sm:items-center sm:p-4">
      <div className="w-full max-w-sm rounded-t-[24px] border border-rule bg-paper p-6 shadow-[0_24px_50px_rgba(0,0,0,0.45)] animate-slide-up sm:rounded-[24px]">
        {onClose ? (
          <button
            type="button"
            onClick={() => {
              hapticoSeleccion();
              onClose();
            }}
            aria-label="Cerrar"
            className="mb-1 -mt-2 ml-auto flex size-11 items-center justify-center rounded-full text-ink-soft transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper-2 hover:text-ink active:scale-90"
          >
            <X className="size-4" />
          </button>
        ) : null}

        <h2 className="font-display text-xl font-semibold tracking-tight">{titulo}</h2>
        <p className="mt-2 text-sm leading-snug text-ink-soft">{detalle}</p>

        <div className="mt-6 space-y-2.5">
          <Link href="/registrarse" className="block" onClick={() => hapticoImpactoMedio()}>
            <Button variant="volt" className="min-h-12 w-full rounded-[12px] text-sm font-semibold shadow-sm active:scale-[0.98] transition-transform duration-150 [transition-timing-function:var(--ease-out)]">
              Crear cuenta gratis
            </Button>
          </Link>
          <Link href="/login" className="block" onClick={() => hapticoSeleccion()}>
            <Button variant="ghost" className="min-h-11 w-full rounded-[12px] text-sm active:scale-[0.98] transition-transform duration-150 [transition-timing-function:var(--ease-out)]">
              Ya tengo cuenta
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
