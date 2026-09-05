import Link from "next/link";
import { Lock, ArrowRight } from "lucide-react";
import { SalirModoCheckin } from "./salir-form";
import { BadgeElite } from "@/components/ui/bloqueo-elite-gate";

export function CheckinBloqueadoElite() {
  return (
    <div className="w-full max-w-md">
      <div className="glow-elite animate-destello rounded-[22px] border-2 border-[#10e7a0]/60 bg-paper-2/95 p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_40px_rgba(16,231,160,0.35)] backdrop-blur-2xl">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl border-2 border-[#10e7a0] bg-gradient-to-b from-[#10e7a0]/30 to-[#10e7a0]/10 text-[#10e7a0] shadow-[0_0_25px_rgba(16,231,160,0.5)]">
          <Lock className="size-7 text-[#10e7a0]" />
        </div>

        <div className="flex justify-center">
          <BadgeElite label="✦ EXCLUSIVO PLAN ELITE" />
        </div>

        <h1 className="mt-4 font-display text-2xl font-black leading-tight text-ink">
          Modo Check-in Táctil
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Convertí cualquier tablet o notebook de tu recepción en una terminal de
          ingreso por DNI para tus socios, con validación de cuotas al instante y
          alertas sonoras de morosidad.
        </p>

        <div className="mt-7 flex flex-col gap-3">
          <Link
            href="/panel/plan"
            className="animate-destello inline-flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-r from-[#10e7a0] via-[#22c55e] to-[#059669] font-black text-black shadow-[0_0_24px_rgba(16,231,160,0.6),0_4px_16px_rgba(0,0,0,0.4)] transition-all duration-150 hover:brightness-110 active:scale-[0.98]"
          >
            <span>Ver planes y pasar a Elite</span>
            <ArrowRight className="size-4 stroke-[3]" />
          </Link>

          <Link
            href="/panel"
            className="inline-flex h-10 w-full items-center justify-center rounded-[12px] border border-rule text-sm text-ink-soft transition-colors hover:bg-paper hover:text-ink active:scale-[0.98]"
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
