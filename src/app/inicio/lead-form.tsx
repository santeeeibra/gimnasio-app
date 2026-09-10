"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui";
import { hapticoExito, hapticoError } from "@/lib/ui/hapticos";
import { enviarLead, type LeadState } from "./actions";

const inputCls =
  "h-12 w-full rounded-[12px] border border-rule bg-paper px-3.5 text-[16px] text-ink " +
  "placeholder:text-ink-soft/70 outline-none transition-[border-color,box-shadow] duration-150 " +
  "[transition-timing-function:var(--ease-out)] focus:border-ink focus:ring-2 focus:ring-ink/15";

export function LeadForm() {
  const [state, action, pending] = useActionState<LeadState | null, FormData>(
    enviarLead,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      hapticoExito();
      formRef.current?.reset();
    } else {
      hapticoError();
    }
  }, [state]);

  if (state?.ok) {
    return (
      <div
        className="rounded-[16px] border border-rule bg-paper-2 p-6 text-center"
        role="status"
      >
        <p className="font-display text-lg text-ink">¡Listo! Te contactamos.</p>
        <p className="mt-1.5 text-sm text-ink-soft">
          Vamos a escribirte al teléfono que dejaste para coordinar una prueba
          con los datos de tu gimnasio.
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} action={action} className="grid gap-3">
      <input
        type="text"
        name="empresa_web"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-ink">Tu nombre</span>
          <input
            name="nombre"
            required
            autoComplete="name"
            className={inputCls}
            placeholder="Juan Pérez"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-ink">Nombre del gimnasio</span>
          <input
            name="gimnasio"
            required
            autoComplete="organization"
            className={inputCls}
            placeholder="Powerhouse Gym"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-ink">Teléfono</span>
          <input
            name="telefono"
            required
            inputMode="tel"
            autoComplete="tel"
            className={inputCls}
            placeholder="11 5555 5555"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-ink">Ciudad</span>
          <input
            name="ciudad"
            required
            autoComplete="address-level2"
            className={inputCls}
            placeholder="Córdoba"
          />
        </label>
      </div>

      {state && !state.ok ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="volt"
        loading={pending}
        className="mt-1 h-12 w-full text-[15px]"
      >
        {pending ? "Enviando…" : "Quiero probarlo"}
      </Button>
      <p className="text-center text-xs text-ink-soft">
        Sin tarjeta. Te escribimos nosotros.
      </p>
    </form>
  );
}
