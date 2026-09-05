"use client";

import { useRef, useState, useTransition } from "react";
import { marcarIngreso, type CheckinState } from "./actions";
import { Button } from "@/components/ui";
import { SalirModoCheckin } from "./salir-form";
import { encolar } from "@/lib/offline/cola";

type Tono = "ok" | "prueba_vencida" | "cuota_vencida" | "no_encontrado" | "encolado";

const TONO: Record<Tono, { rail: string; kicker: string; texto: string }> = {
  ok: {
    rail: "border-l-ok",
    kicker: "text-ok",
    texto: "Ingreso registrado",
  },
  encolado: {
    rail: "border-l-warn",
    kicker: "text-warn",
    texto: "Ingreso guardado — se sincroniza al volver la conexión",
  },
  cuota_vencida: {
    rail: "border-l-danger",
    kicker: "text-danger",
    texto: "Cuota vencida — pasá por recepción a regularizar",
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

const TIMEOUT_MS = 8_000;

export function CheckinForm() {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<CheckinState & { encolado?: boolean }>({});
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const limpiar = () => {
    formRef.current?.reset();
    inputRef.current?.focus();
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const dni = (inputRef.current?.value ?? "").replace(/\D/g, "").trim();
    if (!dni) {
      setState({ error: "Escribí un DNI." });
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set("dni", dni);
      try {
        const res = await Promise.race([
          marcarIngreso({}, fd),
          new Promise<never>((_, rej) =>
            setTimeout(() => rej(new Error("timeout")), TIMEOUT_MS),
          ),
        ]);
        if (res.error) {
          // Error de servidor real: encolamos para no perder el ingreso.
          encolar("checkin", { dni });
          setState({ encolado: true });
        } else {
          setState(res);
        }
      } catch {
        // Sin respuesta (Supabase caído / sin red): a la cola.
        encolar("checkin", { dni });
        setState({ encolado: true });
      } finally {
        limpiar();
        setTimeout(() => window.location.reload(), 6000);
      }
    });
  };

  const tonoKey: Tono | null = state.encolado
    ? "encolado"
    : state.estado ?? null;
  const tono = tonoKey ? TONO[tonoKey] : null;

  return (
    <div className="w-full max-w-md">
      <h1 className="font-display text-3xl leading-tight">Marcá tu ingreso</h1>
      <p className="mt-1 text-[15px] text-ink-soft">
        Escribí tu DNI y tocá el botón.
      </p>

      <form ref={formRef} onSubmit={onSubmit} className="mt-6">
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
