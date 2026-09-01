"use client";

import { useActionState, useState } from "react";
import { login, type LoginState } from "./actions";
import { Button, Field } from "@/components/ui";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {},
  );
  const [showPass, setShowPass] = useState(false);

  return (
    <main className="min-h-screen flex flex-col md:grid md:grid-cols-[1.1fr_1fr]">
      <section className="shrink-0 bg-ink text-paper px-6 pt-9 pb-8 md:p-10 md:flex md:flex-col md:justify-between">
        <span className="text-xs uppercase tracking-[0.18em] text-paper/50">
          Gestión de gimnasio
        </span>
        <div className="mt-6 md:mt-0">
          <h1 className="font-display text-[clamp(2rem,9vw,4.5rem)] leading-[0.95] text-volt">
            Tu cuota,
            <br />
            tu rutina,
            <br />
            tus avisos.
          </h1>
          <p className="mt-4 md:mt-6 max-w-sm text-paper/70 text-sm leading-relaxed">
            Todo lo del gimnasio en un lugar. Sin planillas, sin grupos de
            WhatsApp perdidos.
          </p>
        </div>
        <span className="hidden md:block text-xs text-paper/40">
          Entrás con el DNI que cargó tu gimnasio.
        </span>
      </section>

      <section className="flex-1 flex items-start md:items-center justify-center px-6 py-10 md:p-6">
        <form action={formAction} className="w-full max-w-sm animate-rise">
          <h2 className="text-2xl mb-1">Entrar</h2>
          <p className="text-sm text-ink-soft mb-6">
            Primera vez: la contraseña es la que te dieron en recepción.
          </p>

          <div className="space-y-4">
            <Field
              label="Gimnasio"
              name="gimnasio"
              autoComplete="organization"
              placeholder="nombre o código"
              required
            />
            <Field
              label="DNI"
              name="dni"
              inputMode="numeric"
              autoComplete="username"
              required
            />

            <label className="block">
              <span className="block text-[13px] font-medium text-ink-soft mb-1.5">
                Contraseña
              </span>
              <div className="relative">
                <input
                  name="clave"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="w-full h-11 pl-3 pr-16 rounded-[5px] border border-rule bg-white text-[16px] outline-none transition-[border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] focus:border-ink focus:shadow-[0_0_0_3px_rgb(22_24_29_/_0.08)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={
                    showPass ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-9 px-2.5 text-xs font-medium text-ink-soft rounded-[4px] select-none touch-manipulation transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-95"
                >
                  {showPass ? "Ocultar" : "Ver"}
                </button>
              </div>
            </label>
          </div>

          {state.error ? (
            <p role="alert" className="mt-4 text-sm text-danger animate-rise">
              {state.error}
            </p>
          ) : null}

          <Button
            type="submit"
            className="w-full mt-6 h-12 text-base"
            disabled={pending}
          >
            {pending ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </section>
    </main>
  );
}
