"use client";

import { useState } from "react";

type Props = {
  gimnasio: string;
  slug: string;
  dni: string;
  /** null = el socio ya cambió su contraseña, no la conocemos. */
  clave: string | null;
  /** true = dado de alta sin pago, todavía no puede entrar. */
  bloqueado?: boolean;
};

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-xs text-ink-soft">{etiqueta}</span>
      <span className="font-display text-sm tabular-nums">{valor}</span>
    </div>
  );
}

export function CredencialesCard({
  gimnasio,
  slug,
  dni,
  clave,
  bloqueado = false,
}: Props) {
  const [copiado, setCopiado] = useState<null | "datos" | "texto">(null);

  const url =
    typeof window !== "undefined" ? window.location.origin : "";
  const claveTxt = clave ?? "(la que ya cambió)";

  const texto = [
    `Te dimos de alta en ${gimnasio}.`,
    `Entrá a: ${url}/login`,
    `Gimnasio: ${slug}`,
    `Usuario (DNI): ${dni}`,
    `Contraseña: ${claveTxt}`,
    clave ? "En el primer ingreso te va a pedir cambiarla." : "",
  ]
    .filter(Boolean)
    .join("\n");

  async function copiar(qué: "datos" | "texto") {
    const contenido =
      qué === "texto"
        ? texto
        : `Gimnasio: ${slug}\nUsuario: ${dni}\nContraseña: ${claveTxt}`;
    try {
      await navigator.clipboard.writeText(contenido);
      setCopiado(qué);
      setTimeout(() => setCopiado(null), 1800);
    } catch {
      setCopiado(null);
    }
  }

  return (
    <div className="rounded-[6px] border border-rule bg-paper p-4">
      <p className="text-sm font-medium">Datos de acceso del socio</p>
      <p className="mt-0.5 text-xs text-ink-soft">
        Pasáselos por WhatsApp o en persona. El socio los usa en la pantalla de
        ingreso.
      </p>

      <div className="mt-3 divide-y divide-rule border-y border-rule">
        <Dato etiqueta="Gimnasio" valor={slug} />
        <Dato etiqueta="Usuario (DNI)" valor={dni} />
        <Dato etiqueta="Contraseña" valor={claveTxt} />
      </div>

      {bloqueado ? (
        <p className="mt-3 rounded-[5px] bg-danger/10 px-3 py-2 text-xs text-danger">
          Todavía no puede entrar. Registrá el pago para habilitarle el acceso.
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => copiar("datos")}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-[5px] border border-rule bg-paper px-3 text-sm font-medium text-ink transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
        >
          {copiado === "datos" ? "Copiado ✓" : "Copiar datos"}
        </button>
        <button
          type="button"
          onClick={() => copiar("texto")}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-[5px] border border-rule bg-paper px-3 text-sm font-medium text-ink transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
        >
          {copiado === "texto" ? "Copiado ✓" : "Copiar mensaje para WhatsApp"}
        </button>
      </div>
    </div>
  );
}
