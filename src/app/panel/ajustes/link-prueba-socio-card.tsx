"use client";

import { useState, useTransition } from "react";
import { Link2, Check, Copy, Loader2 } from "lucide-react";
import { generarLinkPruebaSocioAction } from "./actions";
import { hapticoImpactoMedio, hapticoExito, hapticoError, hapticoSeleccion } from "@/lib/ui/hapticos";

type Socio = { id: string; nombre: string | null; dni: string | null };

/** Para que el dueño le mande a un socio nuevo un link que abre su cuenta
 * directo, sin pedirle DNI ni contraseña — sin depender de soporte. */
export function LinkPruebaSocioCard({ socios }: { socios: Socio[] }) {
  const [socioId, setSocioId] = useState(socios[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const [url, setUrl] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (socios.length === 0) {
    return <p className="text-sm text-ink-soft">Todavía no tenés socios cargados.</p>;
  }

  const generar = () => {
    if (!socioId) return;
    hapticoImpactoMedio();
    setErrorMsg(null);
    setUrl(null);

    startTransition(async () => {
      const res = await generarLinkPruebaSocioAction({ profileId: socioId });
      if (!res.ok || !res.url) {
        setErrorMsg(res.msg);
        hapticoError();
        return;
      }
      hapticoExito();
      setUrl(res.url);
    });
  };

  const copiar = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      hapticoSeleccion();
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {}
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-soft">
        Generá un link que lo lleva directo a su cuenta, sin pedirle DNI ni
        contraseña. Válido por 72 horas.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={socioId}
          onChange={(e) => {
            setSocioId(e.target.value);
            setUrl(null);
          }}
          className="h-10 flex-1 rounded-[8px] border border-rule bg-paper px-3 text-sm"
        >
          {socios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre ?? `DNI ${s.dni}`}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={generar}
          disabled={isPending}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[8px] bg-ink px-4 text-xs font-semibold text-paper transition-all active:scale-95 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Link2 className="size-3.5" />
          )}
          Generar link
        </button>
      </div>

      {errorMsg ? <p className="text-xs text-danger">{errorMsg}</p> : null}

      {url ? (
        <div className="flex items-center gap-1.5 rounded-[8px] border border-ok/40 bg-ok/15 px-2 py-1.5 text-xs">
          <code className="flex-1 truncate font-mono text-[11px] text-ok">{url}</code>
          <button
            type="button"
            onClick={copiar}
            className="inline-flex shrink-0 items-center gap-1 rounded bg-paper px-2 py-1 text-[11px] font-semibold text-ink hover:bg-paper-2"
          >
            {copiado ? (
              <>
                <Check className="size-3 text-ok" /> Copiado
              </>
            ) : (
              <>
                <Copy className="size-3" /> Copiar
              </>
            )}
          </button>
        </div>
      ) : null}
    </div>
  );
}
