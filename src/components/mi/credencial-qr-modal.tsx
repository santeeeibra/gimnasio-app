"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import QRCode from "qrcode";
import { QrCode, X, ShieldCheck, Dumbbell, Sparkles } from "lucide-react";
import { hapticoExito, hapticoModalAbrir, hapticoModalCerrar } from "@/lib/ui/hapticos";

const Lanyard = dynamic(() => import("./lanyard"), { ssr: false });

type CredencialQRModalProps = {
  nombre: string;
  dni: string;
  gymNombre?: string;
  estadoCuota?: string;
  fullAncho?: boolean;
  compacto?: boolean;
  className?: string;
};

export function CredencialQRModal({
  nombre,
  dni,
  gymNombre = "SysGym",
  estadoCuota = "al_dia",
  fullAncho = false,
  compacto = false,
  className = "",
}: CredencialQRModalProps) {
  const [abierto, setAbierto] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (dni) {
      // Generar QR en alta resolución con el formato SYSGYM:DNI:<dni>
      QRCode.toDataURL(`SYSGYM:DNI:${dni}`, {
        width: 600,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
        .then((url) => setQrUrl(url))
        .catch((err) => console.error("Error generando QR", err));
    }
  }, [dni]);

  const toggleModal = () => {
    if (!abierto) {
      hapticoModalAbrir();
      hapticoExito();
    } else {
      hapticoModalCerrar();
    }
    setAbierto((prev) => !prev);
  };

  const alDia = estadoCuota === "al_dia";

  const defaultClasses = compacto
    ? "group relative flex items-center justify-center size-10 rounded-full border border-volt/35 bg-volt/10 text-volt transition-all duration-150 active:scale-90 hover:bg-volt/20 hover:border-volt/50 shadow-sm shrink-0"
    : fullAncho
    ? "group relative flex w-full items-center justify-center gap-2.5 rounded-[14px] border border-volt/40 bg-volt/15 py-3 px-4 text-xs font-bold text-ink transition-all duration-150 active:scale-[0.98] hover:bg-volt/25 hover:border-volt/60 shadow-sm shadow-volt/5"
    : "group relative flex items-center gap-2 rounded-[12px] border border-volt/30 bg-volt/10 px-3.5 py-2 text-xs font-semibold text-ink transition-all duration-200 active:scale-95 hover:bg-volt/20 hover:border-volt/50";

  return (
    <>
      <button
        type="button"
        onClick={toggleModal}
        aria-label="Abrir mi QR de Ingreso al gimnasio"
        title="Mi QR de Ingreso"
        className={`${defaultClasses} ${className}`}
      >
        <QrCode className={`${compacto ? "size-5" : "size-4"} text-volt transition-transform group-hover:scale-110`} />
        {!compacto && <span>Mi QR de Ingreso</span>}
      </button>

      {mounted &&
        abierto &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
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

              {/* Tarjeta contenedora con la Credencial 3D interactiva */}
              <div className="my-4 flex flex-col items-center justify-center rounded-[16px] border border-rule bg-paper p-5 text-center shadow-inner overflow-hidden">
                <div className="relative w-full h-72 -mt-2 -mb-2">
                  <Lanyard
                    position={[0, 0, 20]}
                    gravity={[0, -40, 0]}
                    frontImage={qrUrl || undefined}
                  />
                </div>

                <div className="space-y-1 mt-2">
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
          </div>,
          document.body
        )}
    </>
  );
}
