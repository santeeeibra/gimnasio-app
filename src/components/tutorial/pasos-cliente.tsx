"use client";

import type { Paso } from "./overlay";
import { ActivarNotificaciones } from "@/app/mi/activar-notificaciones";

const EJERCICIOS = [
  { nombre: "Press de banca", detalle: "4 series · 8 reps" },
  { nombre: "Press inclinado con mancuernas", detalle: "3 series · 10-12 reps" },
  { nombre: "Aperturas en polea", detalle: "3 series · 12-15 reps" },
];

export const pasosCliente: Paso[] = [
  {
    titulo: "Tu cuota",
    cuerpo:
      "Acá ves si estás al día y cuándo vence. Si falta poco, se pone en rojo y te llega un aviso.",
    demo: (
      <div className="rounded-[6px] border border-rule bg-paper p-3 border-l-2 border-l-ok">
        <p className="text-xs text-ink-soft">Tu cuota</p>
        <p className="font-display text-xl text-ok">Al día</p>
        <p className="mt-0.5 text-xs text-ink-soft">Mensual · vence en 24 días</p>
      </div>
    ),
  },
  {
    titulo: "Tu rutina",
    cuerpo:
      "Un plan armado según tus objetivos. Podés cambiar series, repeticiones y ejercicios que no conozcas.",
    demo: (
      <div className="rounded-[6px] border border-rule bg-paper p-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-soft">
          Día 1 · Pecho
        </p>
        <ul className="mt-2 divide-y divide-rule">
          {EJERCICIOS.map((e) => (
            <li key={e.nombre} className="py-2 first:pt-0 last:pb-0">
              <p className="text-sm font-medium leading-tight">{e.nombre}</p>
              <p className="text-xs text-ink-soft">{e.detalle}</p>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    titulo: "Mensajes del gimnasio",
    cuerpo: "Los avisos y novedades del gimnasio te llegan a esta bandeja.",
    demo: (
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-full border border-rule bg-paper text-xs font-medium text-ink-soft"
        >
          G
        </span>
        <div className="min-w-0 rounded-[6px] border border-rule bg-paper p-3">
          <p className="text-xs text-ink-soft">Gimnasio</p>
          <p className="mt-0.5 text-sm leading-snug">
            Mañana el gimnasio abre a las 8. ¡Buen entrenamiento!
          </p>
        </div>
      </div>
    ),
  },
  {
    titulo: "Activar notificaciones",
    cuerpo:
      "Te avisan cuando tu cuota está por vencer o cuando el gimnasio te escribe. Activalas acá:",
    demo: <ActivarNotificaciones />,
  },
];
