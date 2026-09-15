"use client";

import { useState, useTransition } from "react";
import { Link2, Check, Copy, Loader2, X } from "lucide-react";
import { generarLinkPruebaAction } from "./actions";
import { hapticoImpactoMedio, hapticoExito, hapticoError, hapticoSeleccion } from "@/lib/ui/hapticos";

export function BotonLinkPrueba({
  profileId,
  nombre,
  rol = "cliente",
}: {
  profileId: string;
  nombre?: string | null;
  rol?: "dueno" | "cliente";
}) {
  const [isPending, startTransition] = useTransition();
  const [url, setUrl] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const generar = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    hapticoImpactoMedio();
    setErrorMsg(null);

    startTransition(async () => {
      try {
        const res = await generarLinkPruebaAction({ profileId, horas: 72 });
        if (!res.ok || !res.url) {
          setErrorMsg(res.msg);
          hapticoError();
          return;
        }
        hapticoExito();
        setUrl(res.url);
      } catch (err: any) {
        setErrorMsg(err.message || "Error al generar el link");
        hapticoError();
      }
    });
  };

  const copiar = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      hapticoSeleccion();
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {}
  };

  if (url) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-[8px] bg-ok/15 border border-ok/40 px-2 py-1 text-xs max-w-full">
        <span className="text-[11px] text-ink-soft shrink-0">72h:</span>
        <code className="font-mono text-[11px] text-ok truncate max-w-[180px]">{url}</code>
        <button
          type="button"
          onClick={copiar}
          title="Copiar link"
          className="inline-flex shrink-0 items-center gap-1 rounded bg-paper px-1.5 py-0.5 text-[10px] font-semibold text-ink hover:bg-paper-2 active:scale-95"
        >
          {copiado ? (
            <>
              <Check className="size-3 text-ok" />
              <span className="text-ok">Copiado</span>
            </>
          ) : (
            <>
              <Copy className="size-3 text-ink-soft" />
              <span>Copiar</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setUrl(null);
          }}
          className="shrink-0 text-ink-soft hover:text-ink ml-0.5"
          title="Cerrar"
        >
          <X className="size-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex flex-col">
      <button
        type="button"
        onClick={generar}
        disabled={isPending}
        title={`Generar link de prueba para ${nombre || (rol === "dueno" ? "el dueño" : "el socio")}`}
        className="inline-flex items-center gap-1.5 rounded-[12px] border border-rule bg-paper px-3 py-1.5 text-xs font-semibold text-ink shadow-sm transition-all hover:bg-paper-2 hover:border-ink active:scale-95 disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="size-3.5 animate-spin text-ink" />
            <span>Generando...</span>
          </>
        ) : (
          <>
            <Link2 className="size-3.5 text-ink-soft" />
            <span>Link para probar (sin login)</span>
          </>
        )}
      </button>
      {errorMsg && <span className="text-[11px] text-danger mt-1">{errorMsg}</span>}
    </div>
  );
}
