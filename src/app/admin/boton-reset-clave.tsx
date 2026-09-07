"use client";

import { useState, useTransition } from "react";
import { KeyRound, Check, Copy, Loader2, X } from "lucide-react";
import { resetearClaveUsuarioAction } from "./actions";
import { hapticoImpactoMedio, hapticoExito, hapticoError, hapticoSeleccion } from "@/lib/ui/hapticos";

export function BotonResetClave({
  profileId,
  nombre,
  dni,
  rol = "cliente",
  compacto = false,
}: {
  profileId: string;
  nombre?: string | null;
  dni?: string | null;
  rol?: "dueno" | "cliente";
  compacto?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [claveGenerada, setClaveGenerada] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const ejecutarReset = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const sujeto = rol === "dueno" ? `al dueño ${nombre || ""}` : `al socio ${nombre || dni || ""}`;
    const confirmar = window.confirm(`¿Seguro que querés restablecer la contraseña ${sujeto}? Se generará su clave inicial (gym<últimos 4 del DNI>).`);
    if (!confirmar) return;

    hapticoImpactoMedio();
    setErrorMsg(null);

    startTransition(async () => {
      try {
        const res = await resetearClaveUsuarioAction({ profileId });
        if (!res.ok) {
          setErrorMsg(res.msg);
          hapticoError();
          return;
        }

        hapticoExito();
        setClaveGenerada(res.clave || null);
      } catch (err: any) {
        setErrorMsg(err.message || "Error al resetear");
        hapticoError();
      }
    });
  };

  const copiar = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!claveGenerada) return;
    try {
      await navigator.clipboard.writeText(claveGenerada);
      hapticoSeleccion();
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {}
  };

  if (claveGenerada) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-[8px] bg-ok/15 border border-ok/40 px-2 py-1 text-xs">
        <span className="text-[11px] text-ink-soft">Nueva:</span>
        <code className="font-mono font-bold text-ok">{claveGenerada}</code>
        <button
          type="button"
          onClick={copiar}
          title="Copiar contraseña"
          className="inline-flex items-center gap-1 rounded bg-paper px-1.5 py-0.5 text-[10px] font-semibold text-ink hover:bg-paper-2 active:scale-95"
        >
          {copiado ? (
            <>
              <Check className="size-3 text-ok" />
              <span className="text-ok">Copiada</span>
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
            setClaveGenerada(null);
          }}
          className="text-ink-soft hover:text-ink ml-0.5"
          title="Cerrar"
        >
          <X className="size-3" />
        </button>
      </div>
    );
  }

  if (compacto) {
    return (
      <button
        type="button"
        onClick={ejecutarReset}
        disabled={isPending}
        title={`Resetear contraseña de ${nombre || dni || "usuario"}`}
        className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink disabled:opacity-50 transition-colors active:scale-95"
      >
        {isPending ? (
          <Loader2 className="size-3 animate-spin text-ink" />
        ) : (
          <KeyRound className="size-3 text-ink-soft hover:text-volt-ink" />
        )}
        <span>resetear clave</span>
      </button>
    );
  }

  return (
    <div className="inline-flex flex-col">
      <button
        type="button"
        onClick={ejecutarReset}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-[12px] border border-rule bg-paper px-3 py-1.5 text-xs font-semibold text-ink shadow-sm transition-all hover:bg-paper-2 hover:border-ink active:scale-95 disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="size-3.5 animate-spin text-ink" />
            <span>Restableciendo...</span>
          </>
        ) : (
          <>
            <KeyRound className="size-3.5 text-ink-soft" />
            <span>Resetear contraseña</span>
          </>
        )}
      </button>
      {errorMsg && (
        <span className="text-[11px] text-danger mt-1">{errorMsg}</span>
      )}
    </div>
  );
}
