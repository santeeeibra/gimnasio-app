"use client";

import { useActionState } from "react";
import { solicitarReset, type OlvideState } from "./actions";
import { Button } from "@/components/ui";

export default function OlvideClavePage() {
  const [state, formAction, pending] = useActionState<OlvideState, FormData>(
    solicitarReset,
    {},
  );

  return (
    <main className="min-h-screen flex flex-col bg-paper">
      <section className="shrink-0 bg-ink text-paper px-6 py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          <span className="text-[11px] uppercase tracking-[0.2em] text-paper/40 font-medium">
            Recuperar acceso
          </span>
          <h1 className="mt-3 font-display leading-[0.95] text-volt text-[clamp(1.8rem,7vw,3rem)]">
            Olvidé mi
            <br />
            contraseña.
          </h1>
        </div>
      </section>

      <section className="flex-1 px-6 py-8 md:py-12">
        <form
          action={formAction}
          className="max-w-md mx-auto space-y-5 animate-fade-in"
        >
          <p className="text-[13px] text-ink-soft leading-relaxed">
            Poné el gimnasio, tu DNI y el email que dejaste como contacto. Si
            coinciden, te mandamos un enlace para elegir una contraseña nueva.
          </p>

          <label className="block">
            <span className="block text-[13px] font-medium text-ink-soft mb-2">
              Gimnasio
            </span>
            <input
              name="gimnasio"
              autoComplete="organization"
              placeholder="nombre o código"
              required
              className="w-full h-12 px-4 rounded-lg border border-rule bg-paper-2 text-[16px] outline-none focus:border-ink focus:bg-paper"
            />
          </label>

          <label className="block">
            <span className="block text-[13px] font-medium text-ink-soft mb-2">
              DNI
            </span>
            <input
              name="dni"
              inputMode="numeric"
              placeholder="12345678"
              required
              className="w-full h-12 px-4 rounded-lg border border-rule bg-paper-2 text-[16px] outline-none focus:border-ink focus:bg-paper"
            />
          </label>

          <label className="block">
            <span className="block text-[13px] font-medium text-ink-soft mb-2">
              Email de contacto
            </span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="vos@email.com"
              required
              className="w-full h-12 px-4 rounded-lg border border-rule bg-paper-2 text-[16px] outline-none focus:border-ink focus:bg-paper"
            />
          </label>

          {state.error ? (
            <div
              role="alert"
              className="px-4 py-3 rounded-lg bg-danger/10 border border-danger/20"
            >
              <p className="text-[13px] text-danger font-medium">{state.error}</p>
            </div>
          ) : null}

          {state.ok ? (
            <div className="px-4 py-3 rounded-lg bg-ok/10 border border-ok/20">
              <p className="text-[13px] text-ink">{state.ok}</p>
            </div>
          ) : null}

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold"
            loading={pending}
          >
            {pending ? "Enviando…" : "Enviarme el enlace"}
          </Button>

          <p className="text-center text-[13px]">
            <a
              href="/login"
              className="text-ink-soft underline underline-offset-2 hover:text-ink transition-colors"
            >
              Volver a entrar
            </a>
          </p>
        </form>
      </section>
    </main>
  );
}
