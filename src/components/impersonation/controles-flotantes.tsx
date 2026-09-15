"use client";

import { useEffect, useState } from "react";
import { EyeOff, Eye } from "lucide-react";
import { salirImpersonacionAction, entrarComoAction } from "@/app/admin/impersonar-actions";
import type { ImpFlag } from "@/lib/impersonation";

export const OCULTO_KEY = "imp_controles_ocultos";

// Panel flotante con switch Dueño/Socio + volver a soporte. Se puede ocultar
// (por ej. para grabar un video desde la pantalla del cliente sin que se vea
// la UI de soporte) — queda oculto entre navegaciones vía localStorage, con
// un botón mínimo para volver a mostrarlo.
export function ControlesFlotantes({
  imp,
  duenoId,
  socioId,
}: {
  imp: ImpFlag;
  duenoId: string | null;
  socioId: string | null;
}) {
  const [oculto, setOculto] = useState(true); // arranca oculto hasta leer localStorage, evita flash

  useEffect(() => {
    try {
      setOculto(localStorage.getItem(OCULTO_KEY) === "1");
    } catch {
      setOculto(false);
    }
  }, []);

  const toggle = () => {
    const next = !oculto;
    setOculto(next);
    try {
      localStorage.setItem(OCULTO_KEY, next ? "1" : "0");
    } catch {}
  };

  if (oculto) {
    return (
      <button
        type="button"
        onClick={toggle}
        title="Mostrar controles de soporte"
        className="fixed top-[calc(env(safe-area-inset-top,0px)+2.75rem)] right-3 z-50 flex size-8 items-center justify-center rounded-full border border-ink/20 bg-ink/70 text-paper shadow-lg backdrop-blur-sm hover:bg-ink"
      >
        <Eye className="size-3.5" />
      </button>
    );
  }

  return (
    <div className="fixed top-[calc(env(safe-area-inset-top,0px)+2.75rem)] right-3 z-50 inline-flex items-stretch overflow-hidden rounded-[10px] border border-ink/20 bg-ink text-paper shadow-lg">
      {duenoId && socioId ? (
        <>
          <form action={entrarComoAction}>
            <input type="hidden" name="profile_id" value={duenoId} />
            <button
              type="submit"
              disabled={imp.rol === "dueno"}
              className={`h-full px-3 py-2 text-xs font-medium transition-colors ${
                imp.rol === "dueno" ? "bg-paper text-ink" : "hover:bg-paper/10"
              }`}
            >
              Dueño
            </button>
          </form>
          <form action={entrarComoAction}>
            <input type="hidden" name="profile_id" value={socioId} />
            <button
              type="submit"
              disabled={imp.rol === "cliente"}
              className={`h-full border-l border-paper/20 px-3 py-2 text-xs font-medium transition-colors ${
                imp.rol === "cliente" ? "bg-paper text-ink" : "hover:bg-paper/10"
              }`}
            >
              Socio
            </button>
          </form>
        </>
      ) : null}
      <form action={salirImpersonacionAction}>
        <button
          type="submit"
          className="h-full border-l border-paper/20 px-3 py-2 text-xs font-medium hover:bg-paper/10"
        >
          Volver a soporte
        </button>
      </form>
      <button
        type="button"
        onClick={toggle}
        title="Ocultar controles (para grabar)"
        className="h-full border-l border-paper/20 px-2.5 py-2 hover:bg-paper/10"
      >
        <EyeOff className="size-3.5" />
      </button>
    </div>
  );
}
