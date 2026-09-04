"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

type Props = {
  alias: string | null;
  cbu: string | null;
  titular: string | null;
};

function Fila({
  etiqueta,
  valor,
  copiable = true,
}: {
  etiqueta: string;
  valor: string;
  copiable?: boolean;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1600);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft">
          {etiqueta}
        </p>
        <p className="truncate font-hero text-sm font-bold text-ink mt-0.5">{valor}</p>
      </div>
      {copiable ? (
        <button
          type="button"
          onClick={copiar}
          className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-[8px] border px-3.5 py-2 text-xs font-semibold select-none touch-manipulation transition-all duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 ${
            copiado
              ? "border-volt bg-volt text-volt-ink shadow-[0_0_8px_var(--volt-glow,rgba(16,231,160,0.25))]"
              : "border-rule bg-paper text-ink hover:bg-paper-2 hover:border-ink/20"
          }`}
        >
          {copiado ? (
            <>
              <Check aria-hidden strokeWidth={2.5} className="size-3.5" />
              <span>Copiado</span>
            </>
          ) : (
            <>
              <Copy aria-hidden strokeWidth={2} className="size-3.5 text-ink-soft" />
              <span>Copiar</span>
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}

/** Tarjeta con los datos de transferencia del gimnasio. No renderiza nada si el
 *  dueño no cargó ninguno. */
export function DatosTransferencia({ alias, cbu, titular }: Props) {
  if (!alias && !cbu && !titular) return null;

  return (
    <div className="rounded-[14px] border border-rule bg-paper-2 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Datos para transferir tu cuota</p>
      <div className="mt-1 divide-y divide-rule">
        {alias ? <Fila etiqueta="Alias" valor={alias} /> : null}
        {cbu ? <Fila etiqueta="CBU / CVU" valor={cbu} /> : null}
        {titular ? (
          <Fila etiqueta="Titular" valor={titular} copiable={false} />
        ) : null}
      </div>
      <p className="mt-3 text-xs text-ink-soft leading-relaxed">
        Después de transferir, avisale al gimnasio para que registre el pago.
      </p>
    </div>
  );
}
