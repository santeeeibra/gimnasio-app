"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, Sparkles, ArrowRight, Check } from "lucide-react";
import { hapticoImpactoMedio } from "@/lib/ui/hapticos";

interface BloqueoEliteGateProps {
  bloqueado: boolean;
  titulo?: string;
  descripcion?: string;
  beneficios?: string[];
  badge?: string;
  hrefUpgrade?: string;
  children: React.ReactNode;
  className?: string;
  fullScreen?: boolean;
}

/**
 * Insignia brillante y ultra-saturada para Plan Elite con destello de luz continuo.
 */
export function BadgeElite({
  className = "",
  label = "PLAN ELITE",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={`animate-destello relative inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider text-black bg-gradient-to-r from-[#10e7a0] via-[#22c55e] to-[#10b981] shadow-[0_0_20px_rgba(16,231,160,0.65),0_3px_10px_rgba(0,0,0,0.4)] select-none ${className}`}
    >
      <Sparkles className="size-3 shrink-0 text-black fill-black animate-pulse" />
      <span className="font-mono tracking-widest">{label}</span>
    </span>
  );
}

/**
 * Componente que renderiza una funcionalidad con su interfaz real visible en
 * segundo plano pero bloqueada de forma no interactiva, superponiendo un
 * cartel brillante con animación de destello, saturación alta, resplandor y sombra profunda.
 */
export function BloqueoEliteGate({
  bloqueado,
  titulo = "Función Exclusiva Plan Elite",
  descripcion = "Automatizá y profesionalizá tu gimnasio con las herramientas avanzadas de SysGym.",
  beneficios,
  badge = "✦ EXCLUSIVO ELITE",
  hrefUpgrade = "/panel/plan",
  children,
  className = "",
  fullScreen = false,
}: BloqueoEliteGateProps) {
  const [pressed, setPressed] = useState(false);

  if (!bloqueado) {
    return <>{children}</>;
  }

  const handlePointerDown = () => {
    hapticoImpactoMedio();
    setPressed(true);
    setTimeout(() => setPressed(false), 250);
  };

  if (fullScreen) {
    return (
      <div className={`relative min-h-screen w-full overflow-hidden ${className}`}>
        {/* Contenido real en el fondo en modo preview visual */}
        <div
          className="pointer-events-none select-none opacity-40 filter blur-[1.5px] scale-[0.99] transition-all duration-300"
          tabIndex={-1}
          aria-hidden="true"
        >
          {children}
        </div>

        {/* Overlay translúcido de pantalla completa con destello y sombra */}
        <div
          onPointerDown={handlePointerDown}
          className={`absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center bg-paper/75 backdrop-blur-md transition-transform duration-200 [transition-timing-function:var(--ease-spring)] ${
            pressed ? "scale-[0.99]" : "scale-100"
          }`}
        >
          <div className="glow-elite animate-destello w-full max-w-md rounded-[24px] border-2 border-[#10e7a0]/60 bg-paper-2/95 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_40px_rgba(16,231,160,0.35)] backdrop-blur-2xl">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border-2 border-[#10e7a0] bg-gradient-to-b from-[#10e7a0]/30 to-[#10e7a0]/10 text-[#10e7a0] shadow-[0_0_25px_rgba(16,231,160,0.5)]">
              <Lock className="size-7 text-[#10e7a0]" />
            </div>

            <div className="mt-5 flex justify-center">
              <BadgeElite label={badge} />
            </div>

            <h2 className="mt-4 font-display text-2xl font-black text-ink leading-tight">
              {titulo}
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {descripcion}
            </p>

            {beneficios && beneficios.length > 0 ? (
              <ul className="mt-5 space-y-2.5 text-left text-xs text-ink-soft">
                {beneficios.map((b, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#10e7a0]/25 text-[#10e7a0] shadow-[0_0_8px_rgba(16,231,160,0.4)]">
                      <Check className="size-3 text-[#10e7a0]" />
                    </span>
                    <span className="font-medium text-ink">{b}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-7 flex flex-col gap-3">
              <Link
                href={hrefUpgrade}
                className="animate-destello inline-flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-r from-[#10e7a0] via-[#22c55e] to-[#059669] font-black text-black shadow-[0_0_24px_rgba(16,231,160,0.6),0_4px_16px_rgba(0,0,0,0.4)] transition-all duration-150 [transition-timing-function:var(--ease-out)] hover:brightness-110 active:scale-[0.97]"
              >
                <span>Desbloquear con Plan Elite</span>
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
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-[16px] ${className}`}>
      {/* Contenido real visible pero no interactivo */}
      <div
        className="pointer-events-none select-none opacity-45 filter blur-[0.7px] transition-all duration-300"
        tabIndex={-1}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Cartel brillante Liquid Glass con destello, saturación y sombra profunda */}
      <div
        onPointerDown={handlePointerDown}
        className={`glow-elite animate-destello absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-paper-2/85 backdrop-blur-[5px] border-2 border-[#10e7a0]/60 rounded-[16px] shadow-[0_16px_48px_rgba(0,0,0,0.65),0_0_35px_rgba(16,231,160,0.3)] transition-transform duration-150 [transition-timing-function:var(--ease-spring)] ${
          pressed ? "scale-[0.99]" : "scale-100"
        }`}
      >
        <div className="flex justify-center">
          <BadgeElite label={badge} />
        </div>

        <div className="mt-3 flex size-11 items-center justify-center rounded-2xl border-2 border-[#10e7a0] bg-gradient-to-b from-[#10e7a0]/25 to-[#10e7a0]/5 text-[#10e7a0] shadow-[0_0_18px_rgba(16,231,160,0.45)]">
          <Lock className="size-5 text-[#10e7a0]" />
        </div>

        <h3 className="mt-3 font-display text-base font-black text-ink leading-tight">
          {titulo}
        </h3>

        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-ink-soft">
          {descripcion}
        </p>

        {beneficios && beneficios.length > 0 ? (
          <div className="mt-3.5 flex flex-wrap justify-center gap-2">
            {beneficios.map((b, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#10e7a0]/30 bg-paper/90 px-2.5 py-1 text-[11px] font-medium text-ink shadow-sm"
              >
                <Check className="size-3 text-[#10e7a0]" />
                <span>{b}</span>
              </span>
            ))}
          </div>
        ) : null}

        <Link
          href={hrefUpgrade}
          className="animate-destello mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#10e7a0] via-[#22c55e] to-[#059669] px-5 text-xs font-black text-black shadow-[0_0_20px_rgba(16,231,160,0.55),0_3px_10px_rgba(0,0,0,0.3)] transition-all duration-150 [transition-timing-function:var(--ease-out)] hover:brightness-110 active:scale-[0.97]"
        >
          <span>Mejorar a Plan Elite</span>
          <ArrowRight className="size-3.5 stroke-[3]" />
        </Link>
      </div>
    </div>
  );
}
