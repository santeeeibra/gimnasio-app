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
 * Componente que renderiza una funcionalidad con su interfaz real visible en
 * segundo plano pero bloqueada de forma no interactiva, superponiendo un
 * cartel "Liquid Glass" brillante con estética premium para motivar el upgrade a Elite.
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
        {/* Contenido real en el fondo en modo preview visual no interactivo */}
        <div
          className="pointer-events-none select-none opacity-40 filter blur-[1.5px] scale-[0.99] transition-all duration-300"
          tabIndex={-1}
          aria-hidden="true"
        >
          {children}
        </div>

        {/* Overlay translúcido de pantalla completa */}
        <div
          onPointerDown={handlePointerDown}
          className={`absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center bg-paper/70 backdrop-blur-md transition-transform duration-200 [transition-timing-function:var(--ease-spring)] ${
            pressed ? "scale-[0.99]" : "scale-100"
          }`}
        >
          <div className="w-full max-w-md rounded-[22px] border border-volt/40 bg-paper-2/90 p-7 shadow-[0_0_50px_rgba(16,231,160,0.22)] backdrop-blur-xl">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-volt/40 bg-volt/15 text-volt shadow-[0_0_20px_rgba(16,231,160,0.35)]">
              <Lock className="size-6 text-volt" />
            </div>

            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-volt/50 bg-volt/15 px-3.5 py-1 text-xs font-semibold text-ink shadow-[0_0_12px_rgba(16,231,160,0.3)]">
              <Sparkles className="size-3.5 text-volt shrink-0 animate-pulse" />
              <span className="font-mono tracking-wider">{badge}</span>
            </div>

            <h2 className="mt-3 font-display text-2xl font-bold text-ink leading-tight">
              {titulo}
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {descripcion}
            </p>

            {beneficios && beneficios.length > 0 ? (
              <ul className="mt-4 space-y-2 text-left text-xs text-ink-soft">
                {beneficios.map((b, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-volt/20 text-volt">
                      <Check className="size-2.5" />
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-6 flex flex-col gap-3">
              <Link
                href={hrefUpgrade}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-volt font-semibold text-volt-ink shadow-md transition-all duration-150 [transition-timing-function:var(--ease-out)] hover:brightness-110 active:scale-[0.97]"
              >
                <span>Desbloquear con Plan Elite</span>
                <ArrowRight className="size-4" />
              </Link>

              <Link
                href="/panel"
                className="inline-flex h-10 w-full items-center justify-center rounded-[10px] border border-rule text-sm text-ink-soft transition-colors hover:bg-paper hover:text-ink active:scale-[0.98]"
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
    <div className={`relative overflow-hidden rounded-[14px] ${className}`}>
      {/* Contenido real visible pero protegido contra clics */}
      <div
        className="pointer-events-none select-none opacity-50 filter blur-[0.6px] transition-all duration-300"
        tabIndex={-1}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Cartel brillante Liquid Glass sobrepuesto */}
      <div
        onPointerDown={handlePointerDown}
        className={`absolute inset-0 z-20 flex flex-col items-center justify-center p-5 text-center bg-paper-2/65 backdrop-blur-[3px] border border-volt/35 rounded-[14px] shadow-[0_0_35px_rgba(16,231,160,0.14)] transition-transform duration-150 [transition-timing-function:var(--ease-spring)] ${
          pressed ? "scale-[0.99]" : "scale-100"
        }`}
      >
        <div className="inline-flex items-center gap-1.5 rounded-full border border-volt/50 bg-volt/15 px-3 py-0.5 text-[11px] font-semibold text-ink shadow-[0_0_12px_rgba(16,231,160,0.25)]">
          <Sparkles className="size-3 text-volt shrink-0 animate-pulse" />
          <span className="font-mono tracking-wider uppercase">{badge}</span>
        </div>

        <div className="mt-2.5 flex size-10 items-center justify-center rounded-xl border border-volt/40 bg-volt/10 text-volt shadow-[0_0_12px_rgba(16,231,160,0.25)]">
          <Lock className="size-4 text-volt" />
        </div>

        <h3 className="mt-2.5 font-display text-base font-bold text-ink">
          {titulo}
        </h3>

        <p className="mt-1 max-w-sm text-xs leading-relaxed text-ink-soft">
          {descripcion}
        </p>

        {beneficios && beneficios.length > 0 ? (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {beneficios.map((b, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full border border-rule bg-paper px-2.5 py-0.5 text-[11px] text-ink-soft"
              >
                <Check className="size-3 text-volt" />
                <span>{b}</span>
              </span>
            ))}
          </div>
        ) : null}

        <Link
          href={hrefUpgrade}
          className="mt-3.5 inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] bg-volt px-4 text-xs font-semibold text-volt-ink shadow-sm transition-all duration-150 [transition-timing-function:var(--ease-out)] hover:brightness-110 active:scale-[0.97]"
        >
          <span>Mejorar a Elite</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
