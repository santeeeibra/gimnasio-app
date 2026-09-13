"use client";

import Link from "next/link";
import { diasRestantes, estadoDesdeDias } from "@/lib/cuota";
import { hapticoImpactoSuave } from "@/lib/ui/hapticos";
import { RenovarBtn } from "./renovar-btn";

export type ClienteVista = {
  id: string;
  estado_cuota: "al_dia" | "por_vencer" | "vencido";
  fecha_vencimiento: string | null;
  plan_id: string | null;
  foto_url?: string | null;
  en_prueba?: boolean;
  profile: { nombre: string; dni: string; telefono: string | null } | null;
  plan: { nombre: string } | null;
};

const TONE: Record<string, string> = {
  al_dia: "text-ink-soft",
  por_vencer: "text-ink",
  vencido: "text-danger",
};

/** Chip de estado de cuota: jerarquía visual fuerte, color del tema. */
const CHIP: Record<string, string> = {
  al_dia: "bg-ok/12 text-ok border border-ok/30",
  por_vencer: "bg-volt/25 text-ink border border-volt/50",
  vencido: "bg-danger text-paper border border-danger",
  en_prueba: "bg-paper-3 text-ink-soft border border-rule",
  prueba_vencida: "bg-danger text-paper border border-danger",
};

const CHIP_LABEL: Record<string, string> = {
  al_dia: "Al día",
  por_vencer: "Por vencer",
  vencido: "Vencido",
  en_prueba: "En prueba",
  prueba_vencida: "Prueba vencida",
};

function contador(dias: number | null) {
  if (dias === null) return { kicker: "sin cuota", valor: "—" };
  if (dias < 0) return { kicker: "venció hace", valor: `${Math.abs(dias)} d` };
  if (dias === 0) return { kicker: "vence", valor: "hoy" };
  return { kicker: "quedan", valor: `${dias} d` };
}

export function ClienteRow({
  cliente,
  pruebaVencida = false,
}: {
  cliente: ClienteVista;
  /** en_prueba = true y ya pasó el primer ingreso → falta cobrar. */
  pruebaVencida?: boolean;
}) {
  const dias = diasRestantes(cliente.fecha_vencimiento);
  const estado = estadoDesdeDias(dias);
  const { kicker, valor } = contador(dias);
  const enPrueba = !!cliente.en_prueba;
  const puedeRenovar = !enPrueba && !!cliente.plan_id && estado !== "al_dia";

  const chipKey = pruebaVencida
    ? "prueba_vencida"
    : enPrueba
      ? "en_prueba"
      : estado;

  const iniciales = cliente.profile?.nombre
    ? cliente.profile.nombre
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0])
        .join("")
        .toUpperCase()
    : "👤";

  return (
    <li className="overflow-hidden rounded-[18px] border border-rule bg-paper-2 shadow-[0_1px_2px_rgb(0_0_0_/_0.05)] transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.99]">
      <Link
        href={`/panel/clientes/${cliente.id}`}
        onClick={() => hapticoImpactoSuave()}
        className="block p-4 transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper/50 active:bg-paper/50"
      >
        <div className="flex items-center gap-3">
          {cliente.foto_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={cliente.foto_url}
              alt=""
              className="size-11 shrink-0 rounded-full border border-rule bg-paper-2 object-cover"
            />
          ) : (
            <span className="grid size-11 shrink-0 place-items-center rounded-full border border-rule bg-paper-3 text-xs font-semibold uppercase tracking-wider text-ink-soft">
              {iniciales}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-medium leading-tight">
              {cliente.profile?.nombre ?? "—"}
            </p>
            <p className="mt-1 truncate text-xs text-ink-soft">
              DNI <span className="tabular-nums font-mono">{cliente.profile?.dni ?? "—"}</span> ·{" "}
              {cliente.plan?.nombre ?? "sin plan"}
            </p>
          </div>
        </div>

        <div className="mt-3.5 flex items-end justify-between gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] leading-none ${CHIP[chipKey]}`}
          >
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-current opacity-80"
            />
            {CHIP_LABEL[chipKey]}
          </span>

          <span className="shrink-0 text-right">
            <span className="block text-[10px] uppercase tracking-[0.08em] text-ink-soft">
              {kicker}
            </span>
            <span
              className={`font-display text-xl leading-none tracking-tight tabular-nums font-mono ${TONE[estado]}`}
            >
              {valor}
            </span>
          </span>
        </div>
      </Link>

      {puedeRenovar && cliente.plan_id ? (
        <div className="flex justify-end border-t border-rule bg-paper/40 px-3 py-2">
          <RenovarBtn clienteId={cliente.id} planId={cliente.plan_id} />
        </div>
      ) : null}
    </li>
  );
}
