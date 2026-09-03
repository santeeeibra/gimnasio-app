"use client";

import { useActionState, useEffect, useState } from "react";
import { salirModoCheckin } from "./actions";
import { Button, Field, linkClasses } from "@/components/ui";

export function SalirModoCheckin() {
  const [abierto, setAbierto] = useState(false);
  const [state, formAction, pending] = useActionState(salirModoCheckin, {});

  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [abierto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className={`text-xs ${linkClasses.accion}`}
      >
        Salir del modo check-in
      </button>

      {abierto ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Salir del modo check-in"
          onClick={() => setAbierto(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[color:var(--scrim)] p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-[14px] border border-rule bg-paper p-4 shadow-xl"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="font-display text-lg leading-tight">
                  Salir del modo check-in
                </h2>
                <p className="mt-1 text-sm text-ink-soft">
                  Ingresá tu clave para volver al panel completo.
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setAbierto(false)}
                className="size-9 shrink-0 grid place-items-center rounded-[5px] text-ink-soft hover:bg-paper-2 active:scale-90 transition-transform duration-150 [transition-timing-function:var(--ease-out)]"
              >
                <span aria-hidden>✕</span>
              </button>
            </div>

            <form action={formAction} className="mt-4 space-y-3">
              <Field
                label="Clave del dueño"
                name="clave"
                type="password"
                autoComplete="current-password"
                autoFocus
                required
              />
              {state.error ? (
                <p role="alert" className="text-sm text-danger">
                  {state.error}
                </p>
              ) : null}
              <Button type="submit" loading={pending} className="w-full">
                {pending ? "Verificando…" : "Salir al panel"}
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
