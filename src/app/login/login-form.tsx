"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Eye,
  EyeOff,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { login, type LoginState } from "./actions";
import {
  iniciarAudioHaptico,
  hapticoDial,
  hapticoImpactoSuave,
  hapticoImpactoMedio,
  hapticoSeleccion,
  hapticoError,
} from "@/lib/ui/hapticos";

const STORAGE_KEY = "gym.ultimo_slug";

interface LoginFormProps {
  initialGymSlug?: string | null;
  initialGymNombre?: string | null;
}

export function LoginForm({
  initialGymSlug = null,
  initialGymNombre = null,
}: LoginFormProps) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {},
  );
  const [showPass, setShowPass] = useState(false);
  const [gimnasio, setGimnasio] = useState(initialGymSlug ?? "");
  const [gimnasioNombre, setGimnasioNombre] = useState<string | null>(
    initialGymNombre ?? null,
  );
  const [cambiandoGimnasio, setCambiandoGimnasio] = useState(false);
  const [dni, setDni] = useState("");
  const [clave, setClave] = useState("");

  // Cargar gimnasio recordado desde localStorage si no vino precargado por SSR
  useEffect(() => {
    if (initialGymSlug) {
      setGimnasio(initialGymSlug);
      if (initialGymNombre) setGimnasioNombre(initialGymNombre);
      return;
    }
    const recordado = localStorage.getItem(STORAGE_KEY);
    if (recordado) {
      try {
        const data = JSON.parse(recordado);
        if (data.slug) {
          setGimnasio(data.slug);
          setGimnasioNombre(data.nombre || data.slug);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [initialGymSlug, initialGymNombre]);

  // Alerta sonora y háptica ante error de autenticación
  useEffect(() => {
    if (state.error) {
      hapticoError();
    }
  }, [state.error]);

  // Sanitización en tiempo real con micro-feedback háptico por dígito
  const handleDniChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const soloNumeros = e.target.value.replace(/\D/g, "");
    setDni(soloNumeros);
    hapticoDial(35);
  };

  const toggleShowPass = () => {
    hapticoSeleccion();
    setShowPass((v) => !v);
  };

  const tieneGimnasioFijado = Boolean(gimnasio && !cambiandoGimnasio);

  return (
    <main
      onPointerDown={() => iniciarAudioHaptico()}
      className="min-h-screen relative overflow-hidden bg-[#0c0d11] text-[#f4f4f6] flex flex-col justify-between selection:bg-volt selection:text-volt-ink"
    >
      {/* ── Halo lumínico ambiental GPU (Acoustic / Visual Depth) ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[680px] h-[520px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(205,233,74,0.14)_0%,rgba(16,231,160,0.05)_45%,transparent_70%)] blur-3xl"
      />

      {/* Trama sutil de cuadrícula arquitectónica */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_75%_65%_at_50%_10%,#000_65%,transparent_100%)]"
      />

      {/* ── Encabezado / Hero Unificado ── */}
      <header className="relative z-10 shrink-0 pt-10 pb-4 px-6 md:pt-14 md:pb-8">
        <div className="max-w-md mx-auto">
          {/* Badges píldora */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-[11px] font-bold tracking-widest uppercase text-volt shadow-[0_2px_10px_rgba(0,0,0,0.4)]">
              <span className="size-1.5 rounded-full bg-volt animate-pulse" />
              Gestión de gimnasio
            </div>
            <a
              href="/promo-video/index.html"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-400/50 text-[11px] font-bold tracking-wide uppercase text-emerald-300 backdrop-blur-md transition-all active:scale-95 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
            >
              🎬 Ver Video Promo
            </a>
          </div>

          <h1 className="font-display tracking-tight leading-[0.95] text-[clamp(2.2rem,7.5vw,3.2rem)] font-black">
            <span className="text-white block">Tu cuota,</span>
            <span className="text-volt block drop-shadow-[0_0_24px_rgba(205,233,74,0.4)]">
              tu rutina,
            </span>
            <span className="text-white block">tus avisos.</span>
          </h1>

          <p className="mt-3 text-slate-300 text-[14px] sm:text-[15px] leading-relaxed max-w-sm">
            Todo lo de tu gimnasio en un lugar. Sin planillas de papel ni grupos
            de WhatsApp perdidos.
          </p>
        </div>
      </header>

      {/* ── Módulo de Entrada (Card Sólido de Alto Contraste) ── */}
      <section className="relative z-10 flex-1 px-4 sm:px-6 pb-8 flex items-center">
        <div className="w-full max-w-md mx-auto">
          <div className="relative overflow-hidden rounded-[28px] border border-white/[0.16] bg-[#161922] shadow-[0_24px_70px_rgba(0,0,0,0.85)] p-6 sm:p-8">
            {/* Specular hairline superior */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent"
            />

            <form
              action={formAction}
              onSubmit={() => {
                const slug = gimnasio.trim();
                if (slug) {
                  localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify({ slug, nombre: gimnasioNombre || slug }),
                  );
                }
              }}
              className="space-y-5"
            >
              {/* Encabezado interno del card */}
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Entrar
                </h2>
                <p className="mt-1 text-[13px] text-slate-300 leading-relaxed">
                  Primera vez: la contraseña es la que te dieron en recepción.
                </p>
              </div>

              {/* Gimnasio: Credencial estilo Apple Wallet Pass o Selector editable */}
              {tieneGimnasioFijado ? (
                <div className="relative rounded-2xl p-3.5 bg-[#1d212d] border border-white/15 flex items-center justify-between gap-3 shadow-inner">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-xl bg-volt/15 border border-volt/30 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(205,233,74,0.2)]">
                      <Building2 className="size-5 text-volt" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                          Gimnasio
                        </span>
                      </div>
                      <span className="block text-[15px] font-bold text-white truncate">
                        {gimnasioNombre || gimnasio}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      hapticoImpactoSuave();
                      setCambiandoGimnasio(true);
                      setTimeout(() => {
                        document
                          .querySelector<HTMLInputElement>(
                            'input[name="gimnasio"]',
                          )
                          ?.focus();
                      }, 50);
                    }}
                    className="h-8.5 px-3.5 rounded-full text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 active:scale-95 transition-all touch-manipulation flex items-center shrink-0"
                  >
                    Cambiar
                  </button>
                  <input type="hidden" name="gimnasio" value={gimnasio} />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="gimnasio-input"
                      className="text-[12px] font-bold text-slate-200 uppercase tracking-wider"
                    >
                      Gimnasio
                    </label>
                    {gimnasio ? (
                      <button
                        type="button"
                        onClick={() => {
                          hapticoImpactoSuave();
                          setCambiandoGimnasio(false);
                        }}
                        className="text-xs text-volt hover:underline font-bold transition-colors"
                      >
                        Volver al anterior
                      </button>
                    ) : null}
                  </div>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4.5 text-slate-400 pointer-events-none" />
                    <input
                      id="gimnasio-input"
                      name="gimnasio"
                      autoComplete="organization"
                      placeholder="Nombre o código de tu gimnasio"
                      value={gimnasio}
                      onChange={(e) => setGimnasio(e.target.value)}
                      required
                      className="w-full h-12.5 pl-10.5 pr-4 rounded-xl border border-white/20 bg-[#1d212d] text-white text-[15px] placeholder:text-slate-400 font-medium outline-none transition-[border-color,box-shadow,background-color] duration-150 focus:border-volt focus:bg-[#222736] focus:ring-2 focus:ring-volt/30"
                    />
                  </div>
                </div>
              )}

              {/* DNI */}
              <div className="space-y-1.5">
                <label
                  htmlFor="dni-input"
                  className="block text-[12px] font-bold text-slate-200 uppercase tracking-wider"
                >
                  DNI
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4.5 text-slate-400 pointer-events-none" />
                  <input
                    id="dni-input"
                    name="dni"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="username"
                    placeholder="12345678 (sin puntos)"
                    value={dni}
                    onChange={handleDniChange}
                    required
                    className="w-full h-12.5 pl-10.5 pr-4 rounded-xl border border-white/20 bg-[#1d212d] text-white text-[16px] placeholder:text-slate-400 font-mono tracking-wider tabular-nums outline-none transition-[border-color,box-shadow,background-color] duration-150 focus:border-volt focus:bg-[#222736] focus:ring-2 focus:ring-volt/30"
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div className="space-y-1.5">
                <label
                  htmlFor="clave-input"
                  className="block text-[12px] font-bold text-slate-200 uppercase tracking-wider"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4.5 text-slate-400 pointer-events-none" />
                  <input
                    id="clave-input"
                    name="clave"
                    type={showPass ? "text" : "password"}
                    autoComplete="current-password"
                    value={clave}
                    onChange={(e) => setClave(e.target.value)}
                    required
                    className="w-full h-12.5 pl-10.5 pr-12 rounded-xl border border-white/20 bg-[#1d212d] text-white text-[16px] outline-none transition-[border-color,box-shadow,background-color] duration-150 focus:border-volt focus:bg-[#222736] focus:ring-2 focus:ring-volt/30"
                  />
                  <button
                    type="button"
                    onClick={toggleShowPass}
                    aria-pressed={showPass}
                    aria-label={
                      showPass ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                    className="absolute right-1 top-1/2 -translate-y-1/2 size-10.5 flex items-center justify-center text-slate-300 hover:text-white active:scale-90 transition-all rounded-lg touch-manipulation cursor-pointer"
                  >
                    {showPass ? (
                      <EyeOff className="size-5" />
                    ) : (
                      <Eye className="size-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Mensaje de Error */}
              {state.error ? (
                <div
                  role="alert"
                  className="px-4 py-3 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-200 text-[13px] font-medium flex items-center gap-2.5 animate-shake shadow-[0_0_20px_rgba(244,63,94,0.25)]"
                >
                  <span className="size-2 rounded-full bg-rose-400 shrink-0" />
                  <p>{state.error}</p>
                </div>
              ) : null}

              {/* Botón CTA Principal con Destello y Háptico */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={pending}
                  onClick={() => hapticoImpactoMedio()}
                  className="relative group w-full h-13 rounded-xl font-bold text-[16px] tracking-wide text-volt-ink bg-volt hover:brightness-105 active:scale-[0.98] transition-all duration-150 shadow-[0_4px_24px_rgba(205,233,74,0.4)] hover:shadow-[0_6px_32px_rgba(205,233,74,0.55)] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 overflow-hidden cursor-pointer touch-manipulation"
                >
                  {/* Destello sweep */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none opacity-40"
                  />

                  {pending ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="animate-spin size-4 text-volt-ink"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                      </svg>
                      <span>Entrando…</span>
                    </span>
                  ) : (
                    <>
                      <span>Entrar</span>
                      <ArrowRight className="size-4.5 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </div>

              {/* Micro-credencial de Seguridad y Links Auxiliares */}
              <div className="pt-2 text-center space-y-2.5">
                <div className="inline-flex items-center justify-center gap-1.5 text-xs text-slate-300">
                  <ShieldCheck className="size-4 text-emerald-400" />
                  <span>Acceso seguro cifrado con tu DNI</span>
                </div>

                <div>
                  <Link
                    href="/login/olvide-clave"
                    onClick={() => hapticoImpactoSuave()}
                    className="inline-flex items-center justify-center min-h-[44px] px-3 text-[14px] text-slate-300 hover:text-white font-medium transition-colors"
                  >
                    Olvidé mi contraseña
                  </Link>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* ── Pie de página sutil ── */}
      <footer className="relative z-10 shrink-0 pb-6 pt-2 text-center text-xs text-slate-400">
        SysGym • Plataforma integral de gestión deportiva
      </footer>
    </main>
  );
}
