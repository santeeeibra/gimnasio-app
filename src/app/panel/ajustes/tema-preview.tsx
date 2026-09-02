"use client";

import { temaToVars, type Tema } from "@/lib/tema";

/** Maqueta en vivo de las secciones reales de la app con el tema aplicado. */
export function TemaPreview({ tema }: { tema: Tema }) {
  return (
    <div>
      <span className="block text-[13px] font-medium text-ink-soft mb-1.5">
        Vista previa
      </span>
      <div
        style={temaToVars(tema)}
        className="rounded-[6px] border border-[color:var(--rule)] overflow-hidden [&_*]:transition-[background-color,color,border-color] [&_*]:duration-150 [&_*]:ease-out"
      >
        {/* barra superior */}
        <div className="flex items-center justify-between px-4 py-3 bg-[color:var(--paper-2)] border-b border-[color:var(--rule)]">
          <span className="font-display text-sm font-semibold text-[color:var(--ink)]">
            Mi Gimnasio
          </span>
          <span className="text-[11px] text-[color:var(--ink-soft)]">Dueño</span>
        </div>

        <div className="p-4 space-y-3 bg-[color:var(--paper)] font-sans">
          {/* stat + alerta */}
          <div className="flex gap-3">
            <div className="flex-1 rounded-[5px] border border-[color:var(--rule)] bg-[color:var(--paper-2)] p-3">
              <p className="font-display text-xl font-semibold text-[color:var(--ink)]">
                24
              </p>
              <p className="text-[11px] text-[color:var(--ink-soft)]">
                Clientes activos
              </p>
            </div>
            <div className="flex-1 rounded-[5px] border border-[color:var(--rule)] border-l-2 border-l-[#c1362f] bg-[color:var(--paper-2)] p-3">
              <p className="font-display text-xl font-semibold text-[#c1362f]">
                3
              </p>
              <p className="text-[11px] text-[color:var(--ink-soft)]">
                Cuotas por vencer
              </p>
            </div>
          </div>

          {/* fila cliente */}
          <div className="rounded-[5px] border border-[color:var(--rule)] border-l-2 border-l-[#2f7d4f] bg-[color:var(--paper-2)] px-3 py-2.5">
            <p className="text-[13px] font-medium text-[color:var(--ink)]">
              Lucía Fernández
            </p>
            <p className="text-[11px] text-[color:var(--ink-soft)]">
              Plan Mensual · 18 días restantes
            </p>
          </div>

          {/* botones */}
          <div className="flex gap-2">
            <span className="inline-flex h-9 items-center rounded-[5px] px-3 text-[13px] font-medium bg-[color:var(--ink)] text-[color:var(--paper)]">
              Registrar pago
            </span>
            <span className="inline-flex h-9 items-center rounded-[5px] border border-[color:var(--rule)] px-3 text-[13px] font-medium text-[color:var(--ink)]">
              Ver ficha
            </span>
          </div>

          {/* mensaje sin leer */}
          <div className="rounded-[5px] border border-[color:var(--rule)] border-l-2 border-l-[color:var(--volt)] bg-[color:var(--paper-2)] px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-[color:var(--volt)] text-[color:var(--volt-ink)]">
                nuevo
              </span>
              <p className="text-[13px] font-medium text-[color:var(--ink)]">
                Recordatorio de pago
              </p>
            </div>
            <p className="mt-1 text-[11px] text-[color:var(--ink-soft)]">
              Tu cuota vence en 5 días. Podés abonar por transferencia.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
