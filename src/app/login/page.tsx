"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import { Button, Field } from "@/components/ui";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {},
  );

  return (
    <main className="min-h-screen grid md:grid-cols-[1.1fr_1fr]">
      <section className="hidden md:flex flex-col justify-between bg-ink text-paper p-10">
        <span className="text-sm tracking-wide text-paper/60">
          Gestión de gimnasio
        </span>
        <div>
          <h1 className="font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.95] text-volt">
            Tu cuota,
            <br />
            tu rutina,
            <br />
            tus avisos.
          </h1>
          <p className="mt-6 max-w-sm text-paper/70 text-sm leading-relaxed">
            Todo lo del gimnasio en un lugar. Sin planillas, sin grupos de
            WhatsApp perdidos.
          </p>
        </div>
        <span className="text-xs text-paper/40">
          Entrás con el DNI que cargó tu gimnasio.
        </span>
      </section>

      <section className="flex items-center justify-center p-6">
        <form action={formAction} className="w-full max-w-sm">
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
            <Field
              label="Contraseña"
              name="clave"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          {state.error ? (
            <p className="mt-4 text-sm text-danger">{state.error}</p>
          ) : null}

          <Button type="submit" className="w-full mt-6" disabled={pending}>
            {pending ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </section>
    </main>
  );
}
