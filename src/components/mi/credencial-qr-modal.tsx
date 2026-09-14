"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode, X, ShieldCheck, Dumbbell, Sparkles } from "lucide-react";
import { hapticoImpactoSuave, hapticoExito } from "@/lib/ui/hapticos";

type CredencialQRModalProps = {
  nombre: string;
  dni: string;
  gymNombre?: string;
  estadoCuota?: string;
  fullAncho?: boolean;
  className?: string;
};

export function CredencialQRModal({
  nombre,
  dni,
  gymNombre = "SysGym",
  estadoCuota = "al_dia",
  fullAncho = false,
  className = "",
}: CredencialQRModalProps) {
  const [abierto, setAbierto] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  useEffect(() => {
    if (abierto && dni) {
      hapticoExito();
      // Generar QR con el formato SYSGYM:DNI:<dni>
      QRCode.toDataURL(`SYSGYM:DNI:${dni}`, {
        width: 280,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
        .then((url) => setQrUrl(url))
        .catch((err) => console.error("Error generando QR", err));
    }
  }, [abierto, dni]);

  const toggleModal = () => {
    hapticoImpactoSuave();
    setAbierto((prev) => !prev);
  };

  const alDia = estadoCuota === "al_dia";

  const defaultClasses = fullAncho
    ? "group relative flex w-full items-center justify-center gap-2.5 rounded-[14px] border border-volt/40 bg-volt/15 py-3 px-4 text-xs font-bold text-ink transition-all duration-150 active:scale-[0.98] hover:bg-volt/25 hover:border-volt/60 shadow-sm shadow-volt/5"
    : "group relative flex items-center gap-2 rounded-[12px] border border-volt/30 bg-volt/10 px-3.5 py-2 text-xs font-semibold text-ink transition-all duration-200 active:scale-95 hover:bg-volt/20 hover:border-volt/50";

  return (
    <>
      <button
        type="button"
        onClick={toggleModal}
        aria-label="Abrir mi QR de Ingreso al gimnasio"
        className={`${defaultClasses} ${className}`}
      >
        <QrCode className="size-4 text-volt transition-transform group-hover:scale-110" />
        <span>Mi QR de Ingreso</span>
      </button>

      {abierto && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm overflow-hidden rounded-[20px] border border-rule/80 bg-paper-2 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header modal */}
            <div className="flex items-center justify-between pb-4 border-b border-rule">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-full bg-volt/20 grid place-items-center text-volt">
                  <Dumbbell className="size-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                    Credencial Digital
                  </h3>
                  <p className="text-sm font-bold text-ink truncate">{gymNombre}</p>
                </div>
              </div>
              <button
                onClick={toggleModal}
                className="rounded-full p-1.5 text-ink-soft hover:bg-paper-3 hover:text-ink transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Tarjeta de pase / QR */}
            <div className="my-6 flex flex-col items-center justify-center rounded-[16px] border border-rule bg-paper p-6 text-center shadow-inner">
              <div className="relative size-48 rounded-[12px] bg-white p-3 shadow-md grid place-items-center overflow-hidden border border-zinc-200">
                {qrUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrUrl}
                    alt={`Código QR de ingreso para ${nombre}`}
                    className="size-full object-contain"
                  />
                ) : (
                  <div className="size-full animate-pulse bg-zinc-200 rounded-[8px]" />
                )}
              </div>

              <div className="mt-4 space-y-1">
                <h4 className="text-base font-bold text-ink truncate">{nombre}</h4>
                <p className="font-mono text-xs text-ink-soft tracking-wider">
                  DNI {dni}
                </p>
              </div>

              {/* Badge estado cuota */}
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide">
                {alDia ? (
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-volt bg-emerald-500/10 dark:bg-volt/15 px-3 py-1 rounded-full border border-emerald-500/20 dark:border-volt/30">
                    <ShieldCheck className="size-3.5" /> Pase Habilitado
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                    Cuota Pendiente
                  </span>
                )}
              </div>
            </div>

            {/* Footer instruccion */}
            <p className="text-center text-[11px] text-ink-soft flex items-center justify-center gap-1">
              <Sparkles className="size-3 text-volt shrink-0" />
              Acercá este código al tótem o cámara de recepción.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
