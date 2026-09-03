"use client";

import { useState } from "react";

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
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.1em] text-ink-soft">
          {etiqueta}
        </p>
        <p className="truncate font-display text-sm">{valor}</p>
      </div>
      {copiable ? (
        <button
          type="button"
          onClick={copiar}
          className="shrink-0 rounded-[5px] border border-rule bg-paper px-2.5 py-1.5 text-xs font-medium transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-95"
        >
          {copiado ? "Copiado ✓" : "Copiar"}
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
    <div className="card-cut border border-rule bg-paper-2 p-4">
      <p className="text-xs text-ink-soft">Datos para transferir tu cuota</p>
      <div className="mt-1 divide-y divide-rule">
        {alias ? <Fila etiqueta="Alias" valor={alias} /> : null}
        {cbu ? <Fila etiqueta="CBU / CVU" valor={cbu} /> : null}
        {titular ? (
          <Fila etiqueta="Titular" valor={titular} copiable={false} />
        ) : null}
      </div>
      <p className="mt-2 text-xs text-ink-soft">
        Después de transferir, avisale al gimnasio para que registre el pago.
      </p>
    </div>
  );
}
