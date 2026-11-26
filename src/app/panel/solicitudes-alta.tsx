"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Check, Loader2, UserPlus, X } from "lucide-react";
import { aprobarSolicitud, rechazarSolicitud, type SolicitudState } from "./solicitudes-actions";
import { hapticoExito, hapticoImpactoSuave } from "@/lib/ui/hapticos";

export type Solicitud = {
  id: string;
  creado_at: string | null;
  nombre: string;
  dni: string;
  telefono: string | null;
};

function hace(fechaIso: string | null) {
  if (!fechaIso) return "";
  const dias = Math.floor((Date.now() - new Date(fechaIso).getTime()) / 86_400_000);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  return `hace ${dias} días`;
}

function FilaSolicitud({ s }: { s: Solicitud }) {
  const [aprobada, aprobar, aprobando] = useActionState<SolicitudState, FormData>(aprobarSolicitud, {});
  const [rechazada, rechazar, rechazando] = useActionState<SolicitudState, FormData>(rechazarSolicitud, {});
  const ocupado = aprobando || rechazando;
  const error = aprobada.error ?? rechazada.error;

  return (
    <li className="px-4 py-3">
      <div className="flex items-center gap-3">
        <Link href={`/panel/clientes/${s.id}`} className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{s.nombre}</span>
          <span className="block truncate text-xs text-ink-soft tabular-nums">
            DNI {s.dni}
            {s.telefono ? ` · ${s.telefono}` : ""}
            {s.creado_at ? ` · ${hace(s.creado_at)}` : ""}
          </span>
        </Link>
        <form action={rechazar}>
          <input type="hidden" name="cliente_id" value={s.id} />
          <button
            type="submit"
            disabled={ocupado}
            onClick={(e) => {
              if (!window.confirm(`¿Rechazar la solicitud de ${s.nombre}? Se borra su cuenta.`)) {
                e.preventDefault();
                return;
              }
              hapticoImpactoSuave();
            }}
            aria-label={`Rechazar a ${s.nombre}`}
            className="grid size-10 place-items-center rounded-[10px] border border-rule text-ink-soft transition-transform active:scale-95 hover:text-danger disabled:opacity-50"
          >
            {rechazando ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <X aria-hidden className="size-4" />}
          </button>
        </form>
        <form action={aprobar}>
          <input type="hidden" name="cliente_id" value={s.id} />
          <button
            type="submit"
            disabled={ocupado}
            onClick={() => hapticoExito()}
            className="flex h-10 items-center gap-1.5 rounded-[10px] bg-volt px-3.5 text-sm font-semibold text-volt-ink transition-transform active:scale-95 disabled:opacity-50"
          >
            {aprobando ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Check aria-hidden className="size-4" />}
            Aprobar
          </button>
        </form>
      </div>
      {error ? <p role="alert" className="mt-1.5 text-xs text-danger">{error}</p> : null}
    </li>
  );
}

export function SolicitudesAlta({ solicitudes }: { solicitudes: Solicitud[] }) {
  if (solicitudes.length === 0) return null;
  return (
    <section
      aria-labelledby="solicitudes-titulo"
      className="overflow-hidden rounded-[16px] border border-volt/35 bg-paper-2 shadow-xs"
    >
      <header className="flex items-center gap-3 border-b border-rule px-4 py-3">
        <span className="grid size-9 place-items-center rounded-[10px] bg-volt/15 text-volt">
          <UserPlus aria-hidden className="size-[18px]" />
        </span>
        <div className="min-w-0">
          <h2 id="solicitudes-titulo" className="text-sm font-semibold text-ink">
            {solicitudes.length === 1 ? "1 solicitud de alta" : `${solicitudes.length} solicitudes de alta`}
          </h2>
          <p className="text-xs text-ink-soft">Se registraron solos desde la app. Aprobá para darles acceso.</p>
        </div>
      </header>
      <ul className="divide-y divide-rule">
        {solicitudes.map((s) => (
          <FilaSolicitud key={s.id} s={s} />
        ))}
      </ul>
    </section>
  );
}
