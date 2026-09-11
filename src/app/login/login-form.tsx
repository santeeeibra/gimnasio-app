"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { JitterPoster } from "./jitter-poster";
import { login, loginIndividual, type LoginState } from "./actions";
import {
  iniciarAudioHaptico,
  hapticoDial,
  hapticoImpactoSuave,
  hapticoImpactoMedio,
  hapticoSeleccion,
  hapticoError,
} from "@/lib/ui/hapticos";
import { createClient } from "@/lib/supabase/client";
import { GoogleOneTap } from "@/components/auth/google-one-tap";

const STORAGE_KEY = "gym.ultimo_slug";

interface LoginFormProps {
  initialGymSlug?: string | null;
  initialGymNombre?: string | null;
  initialError?: string | null;
}

export function LoginForm({
  initialGymSlug = null,
  initialGymNombre = null,
  initialError = null,
}: LoginFormProps) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {},
  );
  const [emailState, formActionEmail, pendingEmail] = useActionState<
    LoginState,
    FormData
  >(loginIndividual, {});
  const [modo, setModo] = useState<"dni" | "email">("email");
  const [identificadorInput, setIdentificadorInput] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [gimnasio, setGimnasio] = useState(initialGymSlug ?? "");
  const [gimnasioNombre, setGimnasioNombre] = useState<string | null>(
    initialGymNombre ?? null,
  );
  const [cambiandoGimnasio, setCambiandoGimnasio] = useState(false);
  const [dni, setDni] = useState("");
  const [clave, setClave] = useState("");
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(initialError);

  const handleOAuthLogin = async (provider: "google" | "apple" | "facebook" | "twitter") => {
    hapticoImpactoMedio();
    setLoadingProvider(provider);
    setOauthError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: provider === "google" ? {
            access_type: "offline",
            prompt: "consent",
          } : undefined,
        },
      });

      if (error) {
        hapticoError();
        setOauthError(error.message);
        setLoadingProvider(null);
      }
    } catch (err: unknown) {
      hapticoError();
      const name = provider.charAt(0).toUpperCase() + provider.slice(1);
      setOauthError(
        err instanceof Error ? err.message : `Error al conectar con ${name}`,
      );
      setLoadingProvider(null);
    }
  };

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
      <GoogleOneTap onError={(msg) => setOauthError(msg)} />

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

      {/* ── Contenedor Principal Unificado con Animación Jitter ── */}
      <div className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex items-center justify-center">
        <div className="w-full grid lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Columna Izquierda: Póster Animado estilo Jitter Video */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <JitterPoster />
          </div>

          {/* Columna Derecha: Módulo de Entrada (Card Sólido de Alto Contraste) */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <div className="relative overflow-hidden rounded-[28px] border border-white/[0.16] bg-[#161922] shadow-[0_24px_70px_rgba(0,0,0,0.85)] p-6 sm:p-8">
              {/* Specular hairline superior */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent"
              />

              {/* Selector de modo: Cuenta Directa (Email) vs Gimnasio (DNI) */}
              <div className="flex rounded-xl bg-[#11131a] p-1 border border-white/10 mb-5">
                <button
                  type="button"
                  onClick={() => {
                    hapticoSeleccion();
                    setModo("email");
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    modo === "email"
                      ? "bg-white/15 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Cuenta individual
                </button>
                <button
                  type="button"
                  onClick={() => {
                    hapticoSeleccion();
                    setModo("dni");
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    modo === "dni"
                      ? "bg-white/15 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Con DNI (Gimnasio)
                </button>
              </div>

              {modo === "email" ? (
                <form action={formActionEmail} className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                      Entrar
                    </h2>
                    <p className="mt-1 text-[13px] text-slate-300 leading-relaxed">
                      Para cuentas individuales y entrenadores.{" "}
                      <button 
                        type="button" 
                        onClick={() => { hapticoSeleccion(); setModo("dni"); }} 
                        className="text-volt hover:underline font-medium"
                      >
                        ¿Estás afiliado a un gimnasio? Ingresá acá.
                      </button>
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[12px] font-bold text-slate-200 uppercase tracking-wider">
                      Usuario, email o teléfono
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
                      <input
                        name="identificador"
                        type="text"
                        autoComplete="username"
                        value={identificadorInput}
                        onChange={(e) => setIdentificadorInput(e.target.value)}
                        placeholder="Nombre, tu@email.com o tu teléfono"
                        required
                        className="w-full h-12.5 pl-10.5 pr-4 rounded-xl border border-white/20 bg-[#1d212d] text-white text-[16px] outline-none transition-[border-color,box-shadow,background-color] duration-150 focus:border-volt focus:bg-[#222736] focus:ring-2 focus:ring-volt/30"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[12px] font-bold text-slate-200 uppercase tracking-wider">
                      Contraseña
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
                      <input
                        name="clave"
                        type={showPass ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        className="w-full h-12.5 pl-10.5 pr-12 rounded-xl border border-white/20 bg-[#1d212d] text-white text-[16px] outline-none transition-[border-color,box-shadow,background-color] duration-150 focus:border-volt focus:bg-[#222736] focus:ring-2 focus:ring-volt/30"
                      />
                      <button
                        type="button"
                        onClick={toggleShowPass}
                        className="absolute right-1 top-1/2 -translate-y-1/2 size-10.5 flex items-center justify-center text-slate-300 hover:text-white active:scale-90 transition-all rounded-lg touch-manipulation cursor-pointer"
                      >
                        {showPass ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                      </button>
                    </div>
                  </div>

                  {emailState.error ? (
                    <div
                      role="alert"
                      className="px-4 py-3 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-200 text-[13px] font-medium flex items-center gap-2.5 animate-shake shadow-[0_0_20px_rgba(244,63,94,0.25)]"
                    >
                      <span className="size-2 rounded-full bg-rose-400 shrink-0" />
                      <p>{emailState.error}</p>
                    </div>
                  ) : null}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={pendingEmail}
                      onClick={() => hapticoImpactoMedio()}
                      className="relative group w-full h-13 rounded-xl font-bold text-[16px] tracking-wide text-volt-ink bg-volt hover:brightness-105 active:scale-[0.98] transition-all duration-150 shadow-[0_4px_24px_rgba(205,233,74,0.4)] disabled:opacity-60 flex items-center justify-center gap-2 overflow-hidden cursor-pointer"
                    >
                      {pendingEmail ? "Entrando…" : "Entrar"}
                    </button>
                  </div>

                  <div className="pt-2 text-center">
                    <Link
                      href="/registrarse"
                      className="text-xs text-volt hover:underline font-medium"
                    >
                      ¿No tenés cuenta? Registrate gratis acá
                    </Link>
                  </div>
                </form>
              ) : (
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
          )}

            {/* Separador y opción de autenticación OAuth Google */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#161922] px-2.5 text-slate-400 font-semibold tracking-wider text-[11px]">
                  O continuar con
                </span>
              </div>
            </div>

            {oauthError ? (
              <div
                role="alert"
                className="mb-4 px-4 py-3 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-200 text-[13px] font-medium flex items-center gap-2.5 animate-shake shadow-[0_0_20px_rgba(244,63,94,0.25)]"
              >
                <span className="size-2 rounded-full bg-rose-400 shrink-0" />
                <p>{oauthError}</p>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleOAuthLogin("google")}
                disabled={loadingProvider !== null || pending || pendingEmail}
                className="group relative flex h-12.5 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] hover:bg-white/[0.12] hover:border-white/30 active:scale-[0.98] transition-all duration-150 font-semibold text-[14px] text-white shadow-sm touch-manipulation disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {loadingProvider === "google" ? (
                  <svg className="animate-spin size-5 text-slate-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                ) : (
                  <>
                    <svg className="size-5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Google</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleOAuthLogin("apple")}
                disabled={loadingProvider !== null || pending || pendingEmail}
                className="group relative flex h-12.5 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] hover:bg-white/[0.12] hover:border-white/30 active:scale-[0.98] transition-all duration-150 font-semibold text-[14px] text-white shadow-sm touch-manipulation disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {loadingProvider === "apple" ? (
                  <svg className="animate-spin size-5 text-slate-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                ) : (
                  <>
                    <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16.365 21.43c-1.397.98-2.73 1.05-3.882.02-1.22-1.1-2.58-1.08-3.95 0-1.22.95-2.53.86-3.79-.1-2.77-2.1-4.7-6.05-4.14-9.3.26-1.54 1.05-2.9 2.21-3.78 1.4-.95 3.12-.91 4.4.4.67.65 1.57.65 2.13 0 1.34-1.37 2.89-1.46 4.31-.5 1.33.91 2.05 2.05 2.26 3.03-2.3 1.25-2.16 4.32.25 5.56-1.55 1.83-2.35 3.65-4.04 4.67zm-3.32-15.06c-.14-1.92 1.35-3.66 3.14-4.05.3 2.04-1.33 3.86-3.14 4.05z" />
                    </svg>
                    <span>Apple</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleOAuthLogin("facebook")}
                disabled={loadingProvider !== null || pending || pendingEmail}
                className="group relative flex h-12.5 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] hover:bg-white/[0.12] hover:border-white/30 active:scale-[0.98] transition-all duration-150 font-semibold text-[14px] text-white shadow-sm touch-manipulation disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {loadingProvider === "facebook" ? (
                  <svg className="animate-spin size-5 text-slate-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                ) : (
                  <>
                    <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="#1877F2">
                      <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07" />
                    </svg>
                    <span>Facebook</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleOAuthLogin("twitter")}
                disabled={loadingProvider !== null || pending || pendingEmail}
                className="group relative flex h-12.5 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] hover:bg-white/[0.12] hover:border-white/30 active:scale-[0.98] transition-all duration-150 font-semibold text-[14px] text-white shadow-sm touch-manipulation disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {loadingProvider === "twitter" ? (
                  <svg className="animate-spin size-5 text-slate-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                ) : (
                  <>
                    <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span>X</span>
                  </>
                )}
              </button>
            </div>

            {/* Botón Probar App sin cuenta (Demo) */}
            <div className="pt-4 border-t border-white/10 mt-5 text-center">
              <Link
                href="/demo"
                onClick={() => hapticoImpactoMedio()}
                className="group relative flex w-full min-h-[46px] items-center justify-center gap-2 rounded-xl border border-volt/35 bg-volt/10 px-4 text-sm font-semibold text-volt transition-all duration-150 hover:bg-volt/20 hover:border-volt/60 active:scale-[0.98] shadow-sm touch-manipulation"
              >
                <Sparkles className="size-4 text-volt" />
                <span>PROBAR APP (DEMO)</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <p className="mt-2 text-[12px] text-slate-400">
                Probá rutinas, timer y seguimiento sin registrarte
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* ── Pie de página sutil ── */}
      <footer className="relative z-10 shrink-0 pb-6 pt-2 text-center text-xs text-slate-400">
        SysGym • Plataforma integral de gestión deportiva
      </footer>
    </main>
  );
}
