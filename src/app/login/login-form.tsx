"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { login, type LoginState } from "./actions";
import { Button, linkClasses } from "@/components/ui";

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

  // Sanitización en tiempo real: DNI puramente numérico
  const handleDniChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const soloNumeros = e.target.value.replace(/\D/g, "");
    setDni(soloNumeros);
  };

  const tieneGimnasioFijado = Boolean(gimnasio && !cambiandoGimnasio);

  return (
    <main className="min-h-screen flex flex-col bg-paper">
      {/* Hero compacto mobile-first */}
      <section className="shrink-0 bg-ink text-paper px-6 py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          <span className="text-[11px] uppercase tracking-[0.2em] text-paper/40 font-medium">
            Gestión de gimnasio
          </span>
          <h1 className="mt-3 font-display leading-[0.92] text-volt text-[clamp(2rem,8vw,3.5rem)] md:text-[clamp(3rem,6vw,4.5rem)]">
            Tu cuota,
            <br />
            tu rutina,
            <br />
            tus avisos.
          </h1>
          <p className="mt-4 text-paper/70 text-[15px] leading-relaxed max-w-md">
            Todo lo del gimnasio en un lugar. Sin planillas, sin grupos de
            WhatsApp perdidos.
          </p>
        </div>
      </section>

      {/* Formulario */}
      <section className="flex-1 px-6 py-8 md:py-12">
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
          className="max-w-md mx-auto space-y-5 animate-fade-in"
        >
          {/* Header */}
          <div className="animate-slide-up" style={{ animationDelay: "50ms" }}>
            <h2 className="text-2xl font-display">Entrar</h2>
            <p className="mt-1 text-[13px] text-ink-soft leading-relaxed">
              Primera vez: la contraseña es la que te dieron en recepción.
            </p>
          </div>

          {/* Gimnasio: Tarjeta de gimnasio recordado O Campo de texto */}
          {tieneGimnasioFijado ? (
            <div
              className="p-3.5 rounded-xl border border-rule bg-paper-2 flex items-center justify-between gap-3 animate-slide-up"
              style={{ animationDelay: "100ms" }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-9 rounded-lg bg-ink/5 border border-rule flex items-center justify-center shrink-0">
                  <Building2 className="size-4 text-ink-soft" />
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] uppercase tracking-wider text-ink-soft/70 font-semibold">
                    Gimnasio
                  </span>
                  <span className="block text-sm font-semibold text-ink truncate">
                    {gimnasioNombre || gimnasio}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCambiandoGimnasio(true);
                  setTimeout(() => {
                    document
                      .querySelector<HTMLInputElement>('input[name="gimnasio"]')
                      ?.focus();
                  }, 50);
                }}
                className="text-xs text-ink-soft hover:text-ink font-medium px-2.5 py-1.5 rounded-md hover:bg-rule/50 transition-colors shrink-0"
              >
                Cambiar
              </button>
              <input type="hidden" name="gimnasio" value={gimnasio} />
            </div>
          ) : (
            <label
              className="block animate-slide-up"
              style={{ animationDelay: "100ms" }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-medium text-ink-soft">
                  Gimnasio
                </span>
                {gimnasio ? (
                  <button
                    type="button"
                    onClick={() => setCambiandoGimnasio(false)}
                    className="text-xs text-ink-soft hover:text-ink transition-colors"
                  >
                    Volver al anterior
                  </button>
                ) : null}
              </div>
              <input
                name="gimnasio"
                autoComplete="organization"
                placeholder="Nombre o código de tu gimnasio"
                value={gimnasio}
                onChange={(e) => setGimnasio(e.target.value)}
                required
                className="w-full h-12 px-4 rounded-lg border border-rule bg-paper-2 text-[16px] placeholder:text-ink-soft/40 outline-none transition-[border-color,box-shadow] duration-200 ease-out focus:border-ink focus:shadow-[0_0_0_3px_var(--ink)]/8 focus:bg-paper"
              />
            </label>
          )}

          {/* DNI */}
          <label
            className="block animate-slide-up"
            style={{ animationDelay: "150ms" }}
          >
            <span className="block text-[13px] font-medium text-ink-soft mb-2">
              DNI
            </span>
            <input
              name="dni"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="username"
              placeholder="12345678 (sin puntos)"
              value={dni}
              onChange={handleDniChange}
              required
              className="w-full h-12 px-4 rounded-lg border border-rule bg-paper-2 text-[16px] placeholder:text-ink-soft/40 outline-none transition-[border-color,box-shadow] duration-200 ease-out focus:border-ink focus:shadow-[0_0_0_3px_var(--ink)]/8 focus:bg-paper font-mono"
            />
          </label>

          {/* Contraseña */}
          <label
            className="block animate-slide-up"
            style={{ animationDelay: "200ms" }}
          >
            <span className="block text-[13px] font-medium text-ink-soft mb-2">
              Contraseña
            </span>
            <div className="relative">
              <input
                name="clave"
                type={showPass ? "text" : "password"}
                autoComplete="current-password"
                required
                className="w-full h-12 pl-4 pr-20 rounded-lg border border-rule bg-paper-2 text-[16px] outline-none transition-[border-color,box-shadow] duration-200 ease-out focus:border-ink focus:shadow-[0_0_0_3px_var(--ink)]/8 focus:bg-paper"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                aria-pressed={showPass}
                aria-label={
                  showPass ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-11 min-w-[3.5rem] px-3 text-xs font-medium text-ink-soft rounded-md select-none touch-manipulation transition-[transform,background-color] duration-150 ease-out active:scale-95 hover:bg-rule/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
              >
                {showPass ? "Ocultar" : "Ver"}
              </button>
            </div>
          </label>

          {/* Error */}
          {state.error ? (
            <div
              role="alert"
              className="px-4 py-3 rounded-lg bg-danger/10 border border-danger/20 animate-shake"
            >
              <p className="text-[13px] text-danger font-medium">
                {state.error}
              </p>
            </div>
          ) : null}

          {/* Submit */}
          <div
            className="pt-1 animate-slide-up"
            style={{ animationDelay: "250ms" }}
          >
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              loading={pending}
            >
              {pending ? "Entrando…" : "Entrar"}
            </Button>
          </div>

          {/* Hint */}
          <p
            className="text-center text-[11px] text-ink-soft/60 animate-fade-in"
            style={{ animationDelay: "300ms" }}
          >
            Entrás con el DNI registrado en tu gimnasio
          </p>

          <p
            className="text-center text-[13px] animate-fade-in"
            style={{ animationDelay: "320ms" }}
          >
            <Link
              href="/login/olvide-clave"
              className={`inline-flex items-center justify-center min-h-11 px-2 text-ink-soft hover:text-ink ${linkClasses.plano}`}
            >
              Olvidé mi contraseña
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
