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
          {/* Badge píldora glassmorphism */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-md text-[11px] font-semibold tracking-widest uppercase text-volt/90 mb-4 shadow-[0_2px_10px_rgba(0,0,0,0.2)]">
            <span className="size-1.5 rounded-full bg-volt animate-pulse" />
            Gestión de gimnasio
          </div>

          <h1 className="font-display tracking-tight leading-[0.93] text-white text-[clamp(2.1rem,7.5vw,3.2rem)] font-extrabold">
            Tu cuota,
            <br />
            <span className="text-volt drop-shadow-[0_0_24px_rgba(205,233,74,0.35)]">
              tu rutina,
            </span>
            <br />
            tus avisos.
          </h1>

          <p className="mt-3 text-white/65 text-[14px] sm:text-[15px] leading-relaxed max-w-sm">
            Todo lo de tu gimnasio en un lugar. Sin planillas de papel ni grupos
            de WhatsApp perdidos.
          </p>
        </div>
      </header>

      {/* ── Módulo de Entrada (Liquid Glass Card) ── */}
      <section className="relative z-10 flex-1 px-4 sm:px-6 pb-8 flex items-center">
        <div className="w-full max-w-md mx-auto">
          <div className="liquid-glass relative overflow-hidden rounded-[26px] border border-white/[0.12] bg-[#14161f]/85 backdrop-blur-2xl shadow-[0_24px_70px_rgba(0,0,0,0.65)] p-6 sm:p-7">
            {/* Specular hairline superior */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"
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
              className="space-y-4.5"
            >
              {/* Encabezado interno del card */}
              <div className="pb-1">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Entrar
                </h2>
                <p className="mt-1 text-[13px] text-white/55 leading-relaxed">
                  Primera vez: la contraseña es la que te dieron en recepción.
                </p>
              </div>

              {/* Gimnasio: Credencial estilo Apple Wallet Pass o Selector editable */}
              {tieneGimnasioFijado ? (
                <div className="relative group rounded-2xl p-3.5 bg-white/[0.04] border border-white/[0.08] hover:border-white/15 transition-all duration-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-xl bg-volt/10 border border-volt/20 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(205,233,74,0.15)]">
                      <Building2 className="size-5 text-volt" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        <span className="text-[10px] uppercase tracking-wider text-white/45 font-semibold">
                          Gimnasio
                        </span>
                      </div>
                      <span className="block text-[15px] font-semibold text-white truncate">
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
                    className="h-8 px-3 rounded-full text-xs font-medium text-white/75 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 active:scale-95 transition-all touch-manipulation flex items-center shrink-0"
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
                      className="text-[12px] font-medium text-white/70 uppercase tracking-wider"
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
                        className="text-xs text-volt hover:underline font-medium transition-colors"
                      >
                        Volver al anterior
                      </button>
                    ) : null}
                  </div>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/40 pointer-events-none" />
                    <input
                      id="gimnasio-input"
                      name="gimnasio"
                      autoComplete="organization"
                      placeholder="Nombre o código de tu gimnasio"
                      value={gimnasio}
                      onChange={(e) => setGimnasio(e.target.value)}
                      required
                      className="w-full h-12 pl-10 pr-4 rounded-xl border border-white/10 bg-white/[0.04] text-white text-[15px] placeholder:text-white/30 outline-none transition-[border-color,box-shadow,background-color] duration-200 focus:border-volt/70 focus:bg-white/[0.06] focus:ring-2 focus:ring-volt/25"
                    />
                  </div>
                </div>
              )}

              {/* DNI */}
              <div className="space-y-1.5">
                <label
                  htmlFor="dni-input"
                  className="block text-[12px] font-medium text-white/70 uppercase tracking-wider"
                >
                  DNI
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/40 pointer-events-none" />
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
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-white/10 bg-white/[0.04] text-white text-[16px] placeholder:text-white/30 outline-none transition-[border-color,box-shadow,background-color] duration-200 focus:border-volt/70 focus:bg-white/[0.06] focus:ring-2 focus:ring-volt/25 font-mono tracking-wider tabular-nums"
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div className="space-y-1.5">
                <label
                  htmlFor="clave-input"
                  className="block text-[12px] font-medium text-white/70 uppercase tracking-wider"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/40 pointer-events-none" />
                  <input
                    id="clave-input"
                    name="clave"
                    type={showPass ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    className="w-full h-12 pl-10 pr-12 rounded-xl border border-white/10 bg-white/[0.04] text-white text-[16px] outline-none transition-[border-color,box-shadow,background-color] duration-200 focus:border-volt/70 focus:bg-white/[0.06] focus:ring-2 focus:ring-volt/25"
                  />
                  <button
                    type="button"
                    onClick={toggleShowPass}
                    aria-pressed={showPass}
                    aria-label={
                      showPass ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                    className="absolute right-1 top-1/2 -translate-y-1/2 size-10 flex items-center justify-center text-white/50 hover:text-white active:scale-90 transition-all rounded-lg touch-manipulation"
                  >
                    {showPass ? (
                      <EyeOff className="size-4.5" />
                    ) : (
                      <Eye className="size-4.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Mensaje de Error con animación Shake y diseño glass rojizo */}
              {state.error ? (
                <div
                  role="alert"
                  className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-[13px] font-medium flex items-center gap-2.5 animate-shake shadow-[0_0_20px_rgba(244,63,94,0.15)]"
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
                  className="relative group w-full h-12.5 rounded-xl font-bold text-[15px] tracking-wide text-volt-ink bg-volt hover:brightness-105 active:scale-[0.98] transition-all duration-150 shadow-[0_4px_20px_rgba(205,233,74,0.35)] hover:shadow-[0_6px_28px_rgba(205,233,74,0.5)] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 overflow-hidden cursor-pointer touch-manipulation"
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
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </div>

              {/* Micro-credencial de Seguridad y Links Auxiliares */}
              <div className="pt-2 text-center space-y-2">
                <div className="inline-flex items-center justify-center gap-1.5 text-[11px] text-white/40">
                  <ShieldCheck className="size-3.5 text-emerald-400/80" />
                  <span>Acceso seguro cifrado con tu DNI</span>
                </div>

                <div>
                  <Link
                    href="/login/olvide-clave"
                    onClick={() => hapticoImpactoSuave()}
                    className="inline-flex items-center justify-center min-h-[44px] px-3 text-[13px] text-white/55 hover:text-white transition-colors"
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
      <footer className="relative z-10 shrink-0 pb-6 pt-2 text-center text-[11px] text-white/25">
        SysGym • Plataforma integral de gestión deportiva
      </footer>
    </main>
  );
}

