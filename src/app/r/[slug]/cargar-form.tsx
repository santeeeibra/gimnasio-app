"use client";

import { useActionState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { hapticoError } from "@/lib/ui/hapticos";
import {
  cargarPlantillaLogueado,
  onboardingConPlantilla,
  type OnboardingState,
} from "./actions";

export function CargarForm({
  codigo,
  logueado,
}: {
  codigo: string;
  logueado: boolean;
}) {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(
    logueado ? cargarPlantillaLogueado : onboardingConPlantilla,
    {},
  );

  useEffect(() => {
    if (state.error) hapticoError();
  }, [state]);

  if (logueado) {
    return (
      <form action={action} className="space-y-3">
        <input type="hidden" name="codigo" value={codigo} />
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-accent text-sm font-bold text-accent-ink shadow-md active:scale-[0.98] disabled:opacity-60"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Cargar esta rutina
        </button>
      </form>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="codigo" value={codigo} />
      {/* honeypot */}
      <input
        type="text"
        name="empresa"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden
      />
      <input
        name="nombre"
        required
        placeholder="Tu nombre"
        autoComplete="name"
        className="h-12 w-full rounded-[12px] border border-rule bg-paper px-4 text-[16px] text-ink"
      />
      <input
        name="email"
        type="email"
        required
        placeholder="Tu email"
        autoComplete="email"
        className="h-12 w-full rounded-[12px] border border-rule bg-paper px-4 text-[16px] text-ink"
      />
      <input
        name="password"
        type="password"
        required
        minLength={6}
        placeholder="Una contraseña (mín. 6)"
        autoComplete="new-password"
        className="h-12 w-full rounded-[12px] border border-rule bg-paper px-4 text-[16px] text-ink"
      />
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-accent text-sm font-bold text-accent-ink shadow-md active:scale-[0.98] disabled:opacity-60"
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Empezar a entrenar
      </button>
      <p className="text-center text-xs text-ink-soft">
        Ya tenés cuenta?{" "}
        <a href="/login" className="underline underline-offset-2">
          Iniciá sesión
        </a>{" "}
        y cargá el código <span className="font-mono">{codigo}</span> desde “Tu rutina”.
      </p>
    </form>
  );
}
