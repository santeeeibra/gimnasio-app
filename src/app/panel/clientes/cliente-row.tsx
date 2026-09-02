import Link from "next/link";
import { diasRestantes, estadoDesdeDias } from "@/lib/cuota";

export type ClienteVista = {
  id: string;
  estado_cuota: "al_dia" | "por_vencer" | "vencido";
  fecha_vencimiento: string | null;
  plan_id: string | null;
  en_prueba?: boolean;
  profile: { nombre: string; dni: string; telefono: string | null } | null;
  plan: { nombre: string } | null;
};

const RAIL: Record<string, string> = {
  al_dia: "border-l-rule",
  por_vencer: "border-l-volt",
  vencido: "border-l-danger",
};

const TONE: Record<string, string> = {
  al_dia: "text-ink-soft",
  por_vencer: "text-ink",
  vencido: "text-danger",
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

  return (
    <li className={`border-l-[3px] ${RAIL[estado]}`}>
      <Link
        href={`/panel/clientes/${cliente.id}`}
        className="flex items-center justify-between gap-4 px-4 py-4 transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper active:bg-paper"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-[15px] font-medium">
              {cliente.profile?.nombre ?? "—"}
            </p>
            {pruebaVencida ? (
              <span className="shrink-0 rounded-full border border-danger px-2 py-0.5 text-[11px] font-medium leading-none text-danger">
                Prueba vencida
              </span>
            ) : enPrueba ? (
              <span className="shrink-0 rounded-full border border-rule px-2 py-0.5 text-[11px] font-medium leading-none text-ink-soft">
                En prueba
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-xs text-ink-soft">
            DNI {cliente.profile?.dni} · {cliente.plan?.nombre ?? "sin plan"}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] uppercase tracking-[0.12em] text-ink-soft">
            {kicker}
          </p>
          <p
            className={`font-display text-2xl leading-none tracking-tight ${TONE[estado]}`}
          >
            {valor}
          </p>
        </div>
      </Link>
    </li>
  );
}
