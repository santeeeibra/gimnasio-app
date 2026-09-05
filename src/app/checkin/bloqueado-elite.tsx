import Link from "next/link";
import { Lock, Sparkles, ArrowRight } from "lucide-react";
import { SalirModoCheckin } from "./salir-form";

export function CheckinBloqueadoElite() {
  return (
    <div className="w-full max-w-md">
      <div className="card-cut card-cut-lg border border-rule bg-paper-2 p-7 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-volt/30 bg-volt/10 text-ink shadow-sm">
          <Lock className="size-6 text-volt" />
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full border border-volt/30 bg-volt/10 px-3 py-1 text-xs font-semibold text-ink">
          <Sparkles className="size-3.5 text-volt" />
          <span>Función Exclusiva Plan Elite</span>
        </div>

        <h1 className="mt-4 font-display text-2xl leading-tight">
          Modo Check-in Táctil
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Convertí cualquier tablet o notebook de tu recepción en una terminal de
          ingreso por DNI para tus socios, con validación de cuotas al instante y
          alertas sonoras de morosidad.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/panel/plan"
            className="btn-volt inline-flex h-12 w-full items-center justify-center gap-2 rounded-[6px] font-medium text-ink shadow-sm hover:brightness-110 active:scale-[0.98]"
          >
            <span>Ver planes y pasar a Elite</span>
            <ArrowRight className="size-4" />
          </Link>

          <Link
            href="/panel"
            className="inline-flex h-10 w-full items-center justify-center rounded-[6px] border border-rule text-sm text-ink-soft transition-colors hover:bg-paper hover:text-ink active:scale-[0.98]"
          >
            Volver al panel principal
          </Link>
        </div>
      </div>

      <div className="mt-6 border-t border-rule pt-4 text-center">
        <SalirModoCheckin />
      </div>
    </div>
  );
}
