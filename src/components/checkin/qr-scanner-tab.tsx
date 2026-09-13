"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, RefreshCw, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { hapticoExito, hapticoError, hapticoImpactoMedio } from "@/lib/ui/hapticos";

type QRScannerTabProps = {
  onScan: (dni: string) => void;
  isProcessing?: boolean;
};

export function QRScannerTab({ onScan, isProcessing }: QRScannerTabProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cargandoCamara, setCargandoCamara] = useState(true);
  const [errorCamara, setErrorCamara] = useState<string | null>(null);
  const [escaneadoUltimo, setEscaneadoUltimo] = useState<string | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let activo = true;

    async function iniciarCamara() {
      try {
        setCargandoCamara(true);
        setErrorCamara(null);

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });

        if (!activo) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCargandoCamara(false);
          iniciarLectura();
        }
      } catch (err: any) {
        console.error("Error al acceder a la cámara:", err);
        setErrorCamara(
          "No se pudo acceder a la cámara. Verificá los permisos de cámara en el navegador."
        );
        setCargandoCamara(false);
      }
    }

    iniciarCamara();

    return () => {
      activo = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const procesarTextoQR = (texto: string) => {
    let dni = texto.trim();
    // Si viene en formato SYSGYM:DNI:12345678 extraemos los dígitos
    if (dni.includes("SYSGYM:DNI:")) {
      dni = dni.split("SYSGYM:DNI:")[1] || dni;
    }
    dni = dni.replace(/\D/g, "");

    if (dni && dni.length >= 6 && dni.length <= 10 && dni !== escaneadoUltimo) {
      setEscaneadoUltimo(dni);
      hapticoExito();
      onScan(dni);
      setTimeout(() => setEscaneadoUltimo(null), 3000);
    }
  };

  const iniciarLectura = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    // Detección nativa con BarcodeDetector si está disponible en el navegador
    const DetectorClass = (window as any).BarcodeDetector;
    let detector: any = null;
    if (DetectorClass) {
      try {
        detector = new DetectorClass({ formats: ["qr_code"] });
      } catch (e) {
        detector = null;
      }
    }

    const escanearFrame = async () => {
      if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animFrameRef.current = requestAnimationFrame(escanearFrame);
        return;
      }

      if (detector) {
        try {
          const barcodes = await detector.detect(video);
          if (barcodes.length > 0 && barcodes[0].rawValue) {
            procesarTextoQR(barcodes[0].rawValue);
          }
        } catch (err) {
          // Fallback a canvas
        }
      }

      animFrameRef.current = requestAnimationFrame(escanearFrame);
    };

    animFrameRef.current = requestAnimationFrame(escanearFrame);
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative size-72 sm:size-80 overflow-hidden rounded-[24px] border-2 border-volt/50 bg-black shadow-2xl">
        <video
          ref={videoRef}
          className="size-full object-cover"
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="hidden" />

        {cargandoCamara && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 text-center p-4">
            <RefreshCw className="size-8 text-volt animate-spin mb-3" />
            <p className="text-sm font-medium text-white">Iniciando cámara...</p>
          </div>
        )}

        {errorCamara && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 text-center p-6 text-rose-400">
            <CameraOff className="size-10 mb-3 text-rose-500" />
            <p className="text-xs font-semibold">{errorCamara}</p>
          </div>
        )}

        {/* Marco visor de escaneo tipo escáner de aeropuerto */}
        {!cargandoCamara && !errorCamara && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
            <div className="relative size-48 rounded-[16px] border-2 border-volt/80 shadow-[0_0_25px_rgba(16,231,160,0.3)] animate-pulse">
              {/* Esquinas destacadas */}
              <div className="absolute -top-1 -left-1 size-4 border-t-4 border-l-4 border-volt rounded-tl-[6px]" />
              <div className="absolute -top-1 -right-1 size-4 border-t-4 border-r-4 border-volt rounded-tr-[6px]" />
              <div className="absolute -bottom-1 -left-1 size-4 border-b-4 border-l-4 border-volt rounded-bl-[6px]" />
              <div className="absolute -bottom-1 -right-1 size-4 border-b-4 border-r-4 border-volt rounded-br-[6px]" />
            </div>
          </div>
        )}

        {escaneadoUltimo && (
          <div className="absolute bottom-4 inset-x-4 bg-emerald-500 text-zinc-950 font-bold text-xs py-2 px-3 rounded-[12px] flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-bottom-2">
            <CheckCircle2 className="size-4" />
            <span>QR Detectado: DNI {escaneadoUltimo}</span>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-ink-soft flex items-center justify-center gap-1">
        <Sparkles className="size-3.5 text-volt" />
        Apunta el pase QR del alumno hacia la cámara.
      </p>
    </div>
  );
}
