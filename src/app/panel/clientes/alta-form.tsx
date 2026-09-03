"use client";

import { useRef, useState, useTransition } from "react";
import { altaCliente, type AltaState } from "./actions";
import { Button, Field, Select } from "@/components/ui";
import { SEXOS, SEXO_LABEL } from "@/lib/rutina/tipos";
import { CredencialesCard } from "./credenciales-card";
import { encolar } from "@/lib/offline/cola";
import type { PayloadAlta } from "@/lib/offline/handlers";

const TIMEOUT_MS = 8_000;

export function AltaForm({
  planes,
  full = false,
}: {
  planes: { id: string; nombre: string }[];
  full?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<AltaState & { encolado?: boolean }>({});
  const formRef = useRef<HTMLFormElement>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const submitter = (e.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const modo: PayloadAlta["modo"] =
      submitter?.value === "prueba" ? "prueba" : "completa";

    const fd = new FormData(form);
    fd.set("modo", modo);

    const payload: PayloadAlta = {
      nombre: String(fd.get("nombre") ?? "").trim(),
      dni: String(fd.get("dni") ?? "").trim(),
      telefono: String(fd.get("telefono") ?? "").trim() || null,
      sexo: String(fd.get("sexo") ?? "") || null,
      plan_id: String(fd.get("plan_id") ?? "") || null,
      pago_recibido: fd.get("pago_recibido") === "on",
      modo,
    };

    startTransition(async () => {
      try {
        const res = await Promise.race([
          altaCliente({}, fd),
          new Promise<never>((_, rej) =>
            setTimeout(() => rej(new Error("timeout")), TIMEOUT_MS),
          ),
        ]);
        setState(res);
        if (res.alta) form.reset();
      } catch {
        // Supabase no respondió: guardamos el alta para crearla al reconectar.
        encolar("alta_cliente", payload);
        setState({ encolado: true });
        form.reset();
      }
    });
  };

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="stagger grid sm:grid-cols-2 gap-4"
    >
      <Field label="Nombre y apellido" name="nombre" required />
      <Field label="DNI" name="dni" inputMode="numeric" required />
      <Field label="Teléfono" name="telefono" inputMode="tel" />

      <Select label="Sexo" name="sexo" defaultValue="">
        <option value="">Sin especificar todavía</option>
        {SEXOS.filter((s) => s !== "sin_especificar").map((s) => (
          <option key={s} value={s}>
            {SEXO_LABEL[s]}
          </option>
        ))}
      </Select>

      <Select label="Plan" name="plan_id" defaultValue="">
        <option value="">Sin plan por ahora</option>
        {planes.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
          </option>
        ))}
      </Select>

      <label className="sm:col-span-2 flex items-start gap-2.5 rounded-[6px] border border-rule bg-paper p-3">
        <input
          type="checkbox"
          name="pago_recibido"
          defaultChecked
          className="mt-0.5 size-4 accent-[var(--ink)]"
        />
        <span className="text-sm">
          Pago recibido
          <span className="mt-0.5 block text-xs text-ink-soft">
            Si lo destildás, el socio queda dado de alta pero no puede entrar
            hasta que registres el pago.
          </span>
        </span>
      </label>

      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        {full ? (
          <p className="w-full text-sm text-danger">
            Alcanzaste el límite de socios de tu plan. Contactá a soporte para
            ampliarlo.
          </p>
        ) : null}
        <Button
          type="submit"
          name="modo"
          value="completa"
          loading={pending}
          disabled={full}
        >
          {pending ? "Creando…" : "Dar de alta"}
        </Button>
        <Button
          type="submit"
          name="modo"
          value="prueba"
          variant="ghost"
          disabled={pending || full}
        >
          1 día de prueba
        </Button>
        {state.error ? (
          <p className="w-full text-sm text-danger">{state.error}</p>
        ) : null}
        {state.encolado ? (
          <p className="w-full text-sm text-warn">
            Alta guardada sin conexión. Se crea sola cuando vuelva el servidor —
            no repitas la carga.
          </p>
        ) : null}
        {state.ok ? (
          <p className="w-full text-sm text-ok">{state.ok}</p>
        ) : null}
        {state.alta ? (
          <div className="w-full">
            <CredencialesCard
              gimnasio={state.alta.gimnasio}
              slug={state.alta.slug}
              dni={state.alta.dni}
              clave={state.alta.clave}
              bloqueado={state.alta.bloqueado}
            />
          </div>
        ) : null}
      </div>
    </form>
  );
}
