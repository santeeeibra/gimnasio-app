"use client";

import { useState } from "react";
import type { Paso } from "./overlay";
import { MockButton, MockField } from "./mock";

/** Cuota que pasa de "vencida" a "al día" — puro estado local, sin persistir. */
function MockCuota() {
  const [pagada, setPagada] = useState(false);
  return (
    <div className="space-y-3">
      <div
        className={`rounded-[6px] border border-rule bg-paper p-3 border-l-2 ${
          pagada ? "border-l-ok" : "border-l-danger"
        }`}
      >
        <p className="text-xs text-ink-soft">Cliente de ejemplo · Mensual</p>
        <p
          className={`font-display text-xl ${
            pagada ? "text-ok" : "text-danger"
          }`}
        >
          {pagada ? "Al día" : "Vencida"}
        </p>
        <p className="mt-0.5 text-xs text-ink-soft">
          {pagada ? "vence en 30 días" : "venció hace 4 días"}
        </p>
      </div>
      {!pagada ? (
        <MockButton tone="volt" onClick={() => setPagada(true)}>
          Registrar pago
        </MockButton>
      ) : (
        <p className="text-xs text-ok">Pago registrado (ejemplo).</p>
      )}
    </div>
  );
}

/** Notificación dentro de la app: un banner que aparece, no un push real. */
function MockAviso() {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-3">
      {!visible ? (
        <MockButton onClick={() => setVisible(true)}>
          Ver aviso de ejemplo
        </MockButton>
      ) : (
        <div className="flex items-start gap-2.5 rounded-[6px] border border-rule bg-paper p-3 animate-slide-up">
          <span
            aria-hidden
            className="mt-0.5 size-2 shrink-0 rounded-full bg-volt"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight">
              Cuota por vencer
            </p>
            <p className="mt-0.5 text-xs leading-snug text-ink-soft">
              A Cliente de ejemplo le vence la cuota en 3 días.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export const pasosDueno: Paso[] = [
  {
    titulo: "Dar de alta un cliente",
    cuerpo:
      "Cargás nombre, DNI y plan. La contraseña inicial se genera sola con el DNI.",
    demo: ({ avanzar }) => (
      <div className="space-y-3">
        <MockField label="Nombre y apellido" value="Cliente de ejemplo" />
        <div className="grid grid-cols-2 gap-3">
          <MockField label="DNI" value="00000000" />
          <MockField label="Plan" value="Mensual" />
        </div>
        <MockButton onClick={avanzar}>Simular alta</MockButton>
      </div>
    ),
  },
  {
    titulo: "Registrar un pago",
    cuerpo:
      "El pago se hace por fuera del sistema y vos lo anotás acá. La cuota pasa de vencida a al día.",
    demo: <MockCuota />,
  },
  {
    titulo: "Mandar un mensaje",
    cuerpo:
      "Podés escribirle a un cliente o a todos. Les llega a la app y como notificación.",
    demo: ({ avanzar }) => (
      <div className="space-y-3">
        <div className="rounded-[5px] border border-rule bg-paper p-3 text-[15px] text-ink">
          ¡Bienvenido al gimnasio! Cualquier duda, escribinos por acá.
        </div>
        <MockButton tone="volt" onClick={avanzar}>
          Simular envío
        </MockButton>
      </div>
    ),
  },
  {
    titulo: "Notificaciones",
    cuerpo:
      "Cuando una cuota está por vencer, el sistema te avisa. Así se ve dentro de la app.",
    demo: <MockAviso />,
  },
  {
    titulo: "Listo, así es tu día a día",
    cuerpo:
      "Tu panel arranca vacío. En cuanto cargues tu primer cliente real, los números aparecen solos.",
  },
];
