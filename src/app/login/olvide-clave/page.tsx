"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { Building2, User, Mail, ArrowLeft, ArrowRight, ShieldAlert, CheckCircle2 } from "lucide-react";
import { solicitarReset, type OlvideState } from "./actions";
import {
  iniciarAudioHaptico,
  hapticoDial,
  hapticoImpactoSuave,
  hapticoImpactoMedio,
  hapticoError,
  hapticoExito,
} from "@/lib/ui/hapticos";

export default function OlvideClavePage() {
  const [state, formAction, pending] = useActionState<OlvideState, FormData>(
    solicitarReset,
    {},
  );

  useEffect(() => {
    if (state.error) hapticoError();
    if (state.ok) hapticoExito();
  }, [state.error, state.ok]);

  return (
    <main
      onPointerDown={() => iniciarAudioHaptico()}
      className="min-h-screen relative overflow-hidden bg-[#0c0d11] text-[#f4f4f6] flex flex-col justify-between selection:bg-volt selection:text-volt-ink"
    >
      {/* Halo lumínico ambiental */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[680px] h-[520px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(205,233,74,0.12)_0%,rgba(16,231,160,0.04)_45%,transparent_70%)] blur-3xl"
      />

      {/* Cuadrícula arquitectónica */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_10%,#000_65%,transparent_100%)]"
      />

      {/* Encabezado */}
      <header className="relative z-10 shrink-0 pt-10 pb-4 px-6 md:pt-14 md:pb-8">
        <div className="max-w-md mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-md text-[11px] font-semibold tracking-widest uppercase text-volt/90 mb-4">
            <span className="size-1.5 rounded-full bg-volt animate-pulse" />
            Recuperar acceso
          </div>

          <h1 className="font-display tracking-tight leading-[0.93] text-white text-[clamp(2rem,7.5vw,3rem)] font-extrabold">
            Olvidé mi
            <br />
            <span className="text-volt drop-shadow-[0_0_24px_rgba(205,233,74,0.35)]">
              contraseña.
            </span>
          </h1>

          <p className="mt-3 text-white/65 text-[14px] leading-relaxed max-w-sm">
            Ingresá tu gimnasio y tu DNI. Te ayudamos a restablecer tu cuenta
            rápidamente.
          </p>
        </div>
      </header>

      {/* Tarjeta Liquid Glass */}
      <section className="relative z-10 flex-1 px-4 sm:px-6 pb-8 flex items-center">
        <div className="w-full max-w-md mx-auto">
          <div className="liquid-glass relative overflow-hidden rounded-[26px] border border-white/[0.12] bg-[#14161f]/85 backdrop-blur-2xl shadow-[0_24px_70px_rgba(0,0,0,0.65)] p-6 sm:p-7">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"
            />

            <form action={formAction} className="space-y-4.5">
              <p className="text-[13px] text-white/60 leading-relaxed">
                Si sos socio, avisamos a tu gimnasio para que te reasignen la
                contraseña en recepción. Si sos el dueño, avisamos a soporte.
              </p>

              {/* Gimnasio */}
              <div className="space-y-1.5">
                <label
                  htmlFor="recuperar-gimnasio"
                  className="block text-[12px] font-medium text-white/70 uppercase tracking-wider"
                >
                  Gimnasio
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/40 pointer-events-none" />
                  <input
                    id="recuperar-gimnasio"
                    name="gimnasio"
                    autoComplete="organization"
                    placeholder="Nombre o código de tu gimnasio"
                    required
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-white/10 bg-white/[0.04] text-white text-[15px] placeholder:text-white/30 outline-none transition-[border-color,box-shadow,background-color] duration-200 focus:border-volt/70 focus:bg-white/[0.06] focus:ring-2 focus:ring-volt/25"
                  />
                </div>
              </div>

              {/* DNI */}
              <div className="space-y-1.5">
                <label
                  htmlFor="recuperar-dni"
                  className="block text-[12px] font-medium text-white/70 uppercase tracking-wider"
                >
                  DNI
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/40 pointer-events-none" />
                  <input
                    id="recuperar-dni"
                    name="dni"
                    inputMode="numeric"
                    placeholder="12345678"
                    onChange={() => hapticoDial(35)}
                    required
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-white/10 bg-white/[0.04] text-white text-[16px] placeholder:text-white/30 outline-none transition-[border-color,box-shadow,background-color] duration-200 focus:border-volt/70 focus:bg-white/[0.06] focus:ring-2 focus:ring-volt/25 font-mono tabular-nums"
                  />
                </div>
              </div>

              {/* Email opcional */}
              <div className="space-y-1.5">
                <label
                  htmlFor="recuperar-email"
                  className="block text-[12px] font-medium text-white/70 uppercase tracking-wider"
                >
                  Email de contacto{" "}
                  <span className="text-white/40 normal-case">(opcional)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/40 pointer-events-none" />
                  <input
                    id="recuperar-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="vos@ejemplo.com"
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-white/10 bg-white/[0.04] text-white text-[15px] placeholder:text-white/30 outline-none transition-[border-color,box-shadow,background-color] duration-200 focus:border-volt/70 focus:bg-white/[0.06] focus:ring-2 focus:ring-volt/25"
                  />
                </div>
              </div>

              {/* Error */}
              {state.error ? (
                <div
                  role="alert"
                  className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-[13px] font-medium flex items-center gap-2.5 animate-shake shadow-[0_0_20px_rgba(244,63,94,0.15)]"
                >
                  <ShieldAlert className="size-4 shrink-0 text-rose-400" />
                  <p>{state.error}</p>
                </div>
              ) : null}

              {/* Éxito */}
              {state.ok ? (
                <div
                  role="status"
                  className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[13px] font-medium flex items-center gap-2.5 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                >
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                  <p>{state.ok}</p>
                </div>
              ) : null}

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={pending}
                  onClick={() => hapticoImpactoMedio()}
                  className="relative group w-full h-12.5 rounded-xl font-bold text-[15px] tracking-wide text-volt-ink bg-volt hover:brightness-105 active:scale-[0.98] transition-all duration-150 shadow-[0_4px_20px_rgba(205,233,74,0.35)] hover:shadow-[0_6px_28px_rgba(205,233,74,0.5)] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 overflow-hidden cursor-pointer touch-manipulation"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none opacity-40"
                  />
                  {pending ? "Enviando solicitud…" : "Recuperar mi acceso"}
                </button>
              </div>

              {/* Volver */}
              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  onClick={() => hapticoImpactoSuave()}
                  className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 text-[13px] text-white/60 hover:text-white transition-colors"
                >
                  <ArrowLeft className="size-3.5" />
                  <span>Volver a entrar</span>
                </Link>
              </div>
            </form>
          </div>
        </div>
      </section>

      <footer className="relative z-10 shrink-0 pb-6 pt-2 text-center text-[11px] text-white/25">
        SysGym • Soporte y seguridad de acceso
      </footer>
    </main>
  );
}
