"use client";

import { useActionState, useEffect, useRef } from "react";
import { marcarIngreso, type CheckinState } from "./actions";
import { Button } from "@/components/ui";
import { SalirModoCheckin } from "./salir-form";

const TONO: Record<
  NonNullable<CheckinState["estado"]>,
  { rail: string; kicker: string; texto: string }
> = {
  ok: {
    rail: "border-l-ok",
    kicker: "text-ok",
    texto: "Ingreso registrado",
  },
  prueba_vencida: {
    rail: "border-l-danger",
    kicker: "text-danger",
    texto: "Prueba vencida — avisá al encargado",
  },
  no_encontrado: {
    rail: "border-l-rule",
    kicker: "text-ink-soft",
    texto: "DNI no encontrado, avisá al encargado",
  },
};

export function CheckinForm() {
  const [state, formAction, pending] = useActionState<CheckinState, FormData>(
    marcarIngreso,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Tras cada resultado: limpiar y volver el foco al input para el próximo.
  useEffect(() => {
    if (!state.estado && !state.error) return;
    formRef.current?.reset();
    inputRef.current?.focus();
    if (!state.estado) return;
    const t = setTimeout(() => window.location.reload(), 6000);
    return () => clearTimeout(t);
  }, [state]);

  const tono = state.estado ? TONO[state.estado] : null;

  return (
    <div className="w-full max-w-md">
      <h1 className="font-display text-3xl leading-tight">Marcá tu ingreso</h1>
      <p className="mt-1 text-[15px] text-ink-soft">
        Escribí tu DNI y tocá el botón.
      </p>

      <form ref={formRef} action={formAction} className="mt-6">
        <label className="block">
          <span className="sr-only">DNI</span>
          <input
            ref={inputRef}
            name="dni"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            placeholder="DNI"
            className="w-full h-16 px-4 rounded-[8px] border border-rule bg-paper text-center font-display text-3xl tracking-[0.12em] outline-none transition-[border-color,box-shadow] duration-200 [transition-timing-function:var(--ease-out)] focus:border-ink focus:shadow-[0_0_0_3px_rgb(22_24_29_/_0.08)]"
          />
        </label>

        <Button
          type="submit"
          loading={pending}
          className="mt-4 h-14 w-full text-base"
        >
          {pending ? "Marcando…" : "Marcar ingreso"}
        </Button>
      </form>

      {state.error ? (
        <p role="alert" className="mt-4 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      {tono ? (
        <div
          role="status"
          className={`mt-6 animate-fade-in rounded-[10px] border border-rule border-l-[4px] bg-paper-2 px-5 py-4 ${tono.rail}`}
        >
          <p
            className={`text-[11px] font-medium uppercase tracking-[0.14em] ${tono.kicker}`}
          >
            {tono.texto}
          </p>
          {state.nombre ? (
            <p className="mt-1 font-display text-2xl leading-tight">
              {state.nombre}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-10 border-t border-rule pt-4">
        <SalirModoCheckin />
      </div>
    </div>
  );
}
