"use client";

import { useEffect, useState } from "react";
import { descartar, reintentarItem, suscribir, type ItemCola } from "@/lib/offline/cola";
import type { PayloadAlta, PayloadCheckin, PayloadPago } from "@/lib/offline/handlers";

function tituloItem(i: ItemCola): string {
  if (i.tipo === "alta_cliente") {
    const p = i.payload as PayloadAlta;
    return `${p?.nombre ?? "Socio"} · DNI ${p?.dni ?? "—"}`;
  }
  if (i.tipo === "checkin") {
    const p = i.payload as PayloadCheckin;
    return `Check-in · DNI ${p?.dni ?? "—"}`;
  }
  if (i.tipo === "pago_cuota") {
    const p = i.payload as PayloadPago;
    return `Pago · $${p?.monto ?? "?"}${p?.medio_pago ? ` (${p.medio_pago})` : ""}`;
  }
  return i.tipo;
}

/**
 * Altas locales que al sincronizar chocaron con un socio ya existente (mismo
 * DNI cargado desde otro dispositivo). No se automergea nada: quedan acá hasta
 * que el dueño las revisa y descarta a mano.
 *
 * `variante="card"` → bloque autónomo para poner arriba de /panel/clientes.
 * `variante="inline"` → versión compacta para el área del banner.
 */
export function ConflictosOffline({
  variante = "card",
}: {
  variante?: "card" | "inline";
}) {
  const [items, setItems] = useState<ItemCola[]>([]);
  useEffect(() => suscribir(setItems), []);

  const enConflicto = items.filter((i) => i.estado === "conflicto");
  if (enConflicto.length === 0) return null;

  return (
    <div
      className={
        variante === "card"
          ? "animate-fade-in rounded-[8px] border border-danger/40 bg-danger/5 p-4"
          : "animate-fade-in rounded-[8px] border border-danger/40 bg-danger/5 p-3"
      }
    >
      <p className="text-[13px] font-medium text-danger">
        {enConflicto.length} ítem
        {enConflicto.length === 1 ? "" : "s"} sin sincronizar en conflicto
      </p>
      <ul className="mt-2 space-y-2">
        {enConflicto.map((i) => (
          <li
            key={i.id}
            className="flex items-start gap-3 rounded-[6px] border border-rule bg-paper-2 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{tituloItem(i)}</p>
              {i.detalle ? (
                <p className="mt-0.5 text-xs leading-snug text-ink-soft">
                  {i.detalle}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={() => reintentarItem(i.id)}
                className="rounded-[5px] border border-rule px-2.5 py-1 text-[12px] font-medium text-ink transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper active:scale-[0.97]"
              >
                Reintentar
              </button>
              <button
                type="button"
                onClick={() => descartar(i.id)}
                className="rounded-[5px] border border-rule px-2.5 py-1 text-[12px] font-medium text-danger transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-danger/10 active:scale-[0.97]"
              >
                Descartar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
