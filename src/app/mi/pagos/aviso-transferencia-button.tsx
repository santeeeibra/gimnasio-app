"use client";

import { useEffect, useState, useTransition } from "react";
import { Send, Check, Loader2 } from "lucide-react";
import { avisarTransferenciaAction } from "./actions";
import { hapticoImpactoMedio, hapticoExito, hapticoError } from "@/lib/ui/hapticos";

const COOLDOWN_MS = 30 * 60 * 1000; // 30 min: evita mandar el mismo aviso en bucle
const KEY = "aviso_transferencia_enviado_en";

export function AvisoTransferenciaButton() {
  const [isPending, startTransition] = useTransition();
  const [enviado, setEnviado] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const ultimo = Number(localStorage.getItem(KEY) ?? 0);
      if (Date.now() - ultimo < COOLDOWN_MS) setEnviado(true);
    } catch {}
  }, []);

  const avisar = () => {
    hapticoImpactoMedio();
    setErrorMsg(null);
    startTransition(async () => {
      const res = await avisarTransferenciaAction();
      if (!res.ok) {
        setErrorMsg(res.msg);
        hapticoError();
        return;
      }
      hapticoExito();
      setEnviado(true);
      try {
        localStorage.setItem(KEY, String(Date.now()));
      } catch {}
    });
  };

  if (enviado) {
    return (
      <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-ok">
        <Check className="size-3.5" /> Le avisamos a tu gimnasio
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={avisar}
        disabled={isPending}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-rule bg-paper px-4 py-2.5 text-xs font-semibold text-ink transition-all active:scale-[0.98] hover:bg-paper-2 disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Send className="size-3.5" />
        )}
        Ya transferí
      </button>
      {errorMsg ? <p className="text-[11px] text-danger">{errorMsg}</p> : null}
    </div>
  );
}
