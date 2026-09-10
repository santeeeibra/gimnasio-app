"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui";
import { hapticoImpactoMedio } from "@/lib/ui/hapticos";

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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 backdrop-blur-sm animate-fade-in sm:items-center">
      <div className="w-full max-w-sm rounded-t-[20px] border border-rule bg-paper p-6 shadow-xl animate-slide-up sm:rounded-[20px]">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="mb-1 -mt-1 ml-auto flex size-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-paper-2"
          >
            <X className="size-4" />
          </button>
        ) : null}

        <h2 className="font-display text-xl">{titulo}</h2>
        <p className="mt-2 text-sm text-ink-soft">{detalle}</p>

        <div className="mt-5 space-y-2.5">
          <Link href="/registrarse" className="block" onClick={() => hapticoImpactoMedio()}>
            <Button variant="volt" className="w-full">
              Crear cuenta gratis
            </Button>
          </Link>
          <Link href="/login" className="block">
            <Button variant="ghost" className="w-full">
              Ya tengo cuenta
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
