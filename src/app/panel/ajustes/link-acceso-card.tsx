"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";

export function LinkAccesoCard({ slug }: { slug: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copiado, setCopiado] = useState(false);
  const [qrGenerado, setQrGenerado] = useState(false);

  const url = typeof window !== "undefined" 
    ? `${window.location.origin}/login?g=${slug}`
    : `https://tuapp.com/login?g=${slug}`;

  useEffect(() => {
    // Generar QR client-side
    const generarQR = async () => {
      if (!canvasRef.current) return;
      try {
        const QRCode = (await import("qrcode")).default;
        await QRCode.toCanvas(canvasRef.current, url, {
          width: 200,
          margin: 2,
          color: {
            dark: "#16181d",
            light: "#ffffff",
          },
        });
        setQrGenerado(true);
      } catch (err) {
        console.error("Error generando QR:", err);
      }
    };
    generarQR();
  }, [url]);

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (err) {
      console.error("Error copiando:", err);
    }
  };

  const descargarQR = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `qr-acceso-${slug}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="card-cut card-cut-lg mt-6 border border-rule bg-paper-2 p-6">
      <h2 className="text-lg mb-1">Link de acceso para tus socios</h2>
      <p className="text-sm text-ink-soft mb-4">
        Compartí este link por WhatsApp o imprimí el QR y pegalo en recepción.
        Lleva directo al login con tu gimnasio ya cargado.
      </p>

      <div className="space-y-4">
        {/* Link */}
        <div>
          <label className="block text-[13px] font-medium text-ink-soft mb-2">
            Link directo
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              readOnly
              className="flex-1 h-10 px-3 rounded-lg border border-rule bg-paper text-sm text-ink-soft select-all outline-none"
            />
            <Button
              type="button"
              onClick={copiarLink}
              variant="secondary"
              className="shrink-0"
            >
              {copiado ? "✓ Copiado" : "Copiar"}
            </Button>
          </div>
        </div>

        {/* QR */}
        <div>
          <label className="block text-[13px] font-medium text-ink-soft mb-2">
            Código QR
          </label>
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="rounded-lg border border-rule bg-paper p-3">
              <canvas ref={canvasRef} className="block" />
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-xs text-ink-soft leading-snug">
                Escaneá el QR con la cámara del celular para abrir el login
                directo. Podés descargarlo e imprimirlo.
              </p>
              <Button
                type="button"
                onClick={descargarQR}
                variant="secondary"
                disabled={!qrGenerado}
                className="w-full sm:w-auto"
              >
                Descargar QR
              </Button>
            </div>
          </div>
        </div>

        {/* Hint PWA */}
        <div className="rounded-lg border border-volt/20 bg-volt/5 p-3">
          <p className="text-xs text-ink-soft leading-snug">
            <strong className="text-ink">Consejo:</strong> Pedile a tus socios
            que después de entrar toquen "Agregar a inicio" en el navegador.
            Así el ícono queda directo en su celular, como una app.
          </p>
        </div>
      </div>
    </div>
  );
}
