import Link from "next/link";
import { diasRestantes, estadoDesdeDias, ESTADO_LABEL } from "@/lib/cuota";

export type ClienteVista = {
  id: string;
  estado_cuota: "al_dia" | "por_vencer" | "vencido";
  fecha_vencimiento: string | null;
  plan_id: string | null;
  profile: { nombre: string; dni: string; telefono: string | null } | null;
  plan: { nombre: string } | null;
};

const EDGE: Record<string, string> = {
  al_dia: "border-l-ok",
  por_vencer: "border-l-warn",
  vencido: "border-l-danger",
};

export function ClienteRow({ cliente }: { cliente: ClienteVista }) {
  const dias = diasRestantes(cliente.fecha_vencimiento);
  const estado = estadoDesdeDias(dias);
  const texto =
    dias === null
      ? "sin cuota registrada"
      : dias < 0
        ? `venció hace ${Math.abs(dias)} d`
        : dias === 0
          ? "vence hoy"
          : `quedan ${dias} d`;

  return (
    <li className={`border-l-2 ${EDGE[estado]}`}>
      <Link
        href={`/panel/clientes/${cliente.id}`}
        className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-paper-2"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {cliente.profile?.nombre ?? "—"}
          </p>
          <p className="text-xs text-ink-soft truncate">
            DNI {cliente.profile?.dni} · {cliente.plan?.nombre ?? "sin plan"}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p
            className={`text-xs font-medium ${
              estado === "vencido"
                ? "text-danger"
                : estado === "por_vencer"
                  ? "text-warn"
                  : "text-ink-soft"
            }`}
          >
            {ESTADO_LABEL[estado]}
          </p>
          <p className="text-xs text-ink-soft">{texto}</p>
        </div>
      </Link>
    </li>
  );
}
