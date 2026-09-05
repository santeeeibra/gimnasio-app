"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, ZoomIn, ZoomOut, RotateCw, Check, Circle, Square, RefreshCw } from "lucide-react";
import { Spinner } from "@/components/ui";

export interface ImageCropModalProps {
  isOpen: boolean;
  file: File | null;
  onCrop: (croppedCanvas: HTMLCanvasElement) => void;
  onCancel: () => void;
}

type CropShape = "circle" | "square";

const CANVAS_SIZE = 280; // Tamaño de render en CSS px para móvil/desktop
const CROP_SIZE = 240;   // Tamaño de la zona de recorte en CSS px

export function ImageCropModal({
  isOpen,
  file,
  onCrop,
  onCancel,
}: ImageCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cropShape, setCropShape] = useState<CropShape>("circle");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);

  // Pointers para tracking táctil / pinch-to-zoom
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({
    x: 0,
    y: 0,
    panX: 0,
    panY: 0,
  });
  const pinchStartRef = useRef<{ dist: number; zoom: number }>({
    dist: 0,
    zoom: 1,
  });

  // Bloquear scroll del body mientras el modal está abierto (§9 REGLAS_UI_EMIL.md)
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Cerrar con tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCancel();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  // Cargar imagen desde el objeto File
  useEffect(() => {
    if (!isOpen || !file) {
      setImageLoaded(false);
      setLoadError(null);
      imageRef.current = null;
      return;
    }

    setImageLoaded(false);
    setLoadError(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      setLoadError(null);
    };

    img.onerror = () => {
      setLoadError("No se pudo cargar la imagen. Probá con otro archivo.");
      setImageLoaded(false);
    };

    img.src = objectUrl;

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [isOpen, file]);

  // Cálculo de límites y dibujo en el canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const width = CANVAS_SIZE;
    const height = CANVAS_SIZE;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const isRotatedSideways = rotation % 180 !== 0;
    const effectiveW = isRotatedSideways ? img.naturalHeight : img.naturalWidth;
    const effectiveH = isRotatedSideways ? img.naturalWidth : img.naturalHeight;

    const baseScale = Math.max(CROP_SIZE / effectiveW, CROP_SIZE / effectiveH);
    const currentScale = baseScale * zoom;

    const renderedW = effectiveW * currentScale;
    const renderedH = effectiveH * currentScale;
    const maxPanX = Math.max(0, (renderedW - CROP_SIZE) / 2);
    const maxPanY = Math.max(0, (renderedH - CROP_SIZE) / 2);

    const clampedX = Math.max(-maxPanX, Math.min(maxPanX, pan.x));
    const clampedY = Math.max(-maxPanY, Math.min(maxPanY, pan.y));

    const cx = width / 2;
    const cy = height / 2;

    // 1. Dibujar imagen con posición, rotación y escala
    ctx.save();
    ctx.translate(cx + clampedX, cy + clampedY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(currentScale, currentScale);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    // 2. Máscara oscura con cutout central
    ctx.save();
    ctx.fillStyle = "rgba(4, 7, 12, 0.72)";
    ctx.beginPath();
    ctx.rect(0, 0, width, height);

    const cropRadius = CROP_SIZE / 2;
    const cropLeft = cx - cropRadius;
    const cropTop = cy - cropRadius;

    if (cropShape === "circle") {
      ctx.arc(cx, cy, cropRadius, 0, Math.PI * 2, true);
    } else {
      // Cuadrado con esquinas suaves
      const r = 14;
      ctx.moveTo(cropLeft + r, cropTop);
      ctx.lineTo(cropLeft + CROP_SIZE - r, cropTop);
      ctx.arcTo(cropLeft + CROP_SIZE, cropTop, cropLeft + CROP_SIZE, cropTop + r, r);
      ctx.lineTo(cropLeft + CROP_SIZE, cropTop + CROP_SIZE - r);
      ctx.arcTo(cropLeft + CROP_SIZE, cropTop + CROP_SIZE, cropLeft + CROP_SIZE - r, cropTop + CROP_SIZE, r);
      ctx.lineTo(cropLeft + r, cropTop + CROP_SIZE);
      ctx.arcTo(cropLeft, cropTop + CROP_SIZE, cropLeft, cropTop + CROP_SIZE - r, r);
      ctx.lineTo(cropLeft, cropTop + r);
      ctx.arcTo(cropLeft, cropTop, cropLeft + r, cropTop, r);
      ctx.closePath();
    }
    ctx.fill("evenodd");

    // 3. Borde nítido en la zona activa de recorte
    ctx.strokeStyle = "rgba(16, 231, 160, 0.9)"; // Hyper-Mint / Accent
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (cropShape === "circle") {
      ctx.arc(cx, cy, cropRadius, 0, Math.PI * 2);
    } else {
      const r = 14;
      ctx.moveTo(cropLeft + r, cropTop);
      ctx.lineTo(cropLeft + CROP_SIZE - r, cropTop);
      ctx.arcTo(cropLeft + CROP_SIZE, cropTop, cropLeft + CROP_SIZE, cropTop + r, r);
      ctx.lineTo(cropLeft + CROP_SIZE, cropTop + CROP_SIZE - r);
      ctx.arcTo(cropLeft + CROP_SIZE, cropTop + CROP_SIZE, cropLeft + CROP_SIZE - r, cropTop + CROP_SIZE, r);
      ctx.lineTo(cropLeft + r, cropTop + CROP_SIZE);
      ctx.arcTo(cropLeft, cropTop + CROP_SIZE, cropLeft, cropTop + CROP_SIZE - r, r);
      ctx.lineTo(cropLeft, cropTop + r);
      ctx.arcTo(cropLeft, cropTop, cropLeft + r, cropTop, r);
      ctx.closePath();
    }
    ctx.stroke();

    // 4. Guía de regla de tercios al mover/interactuar
    if (isInteracting) {
      ctx.save();
      ctx.beginPath();
      if (cropShape === "circle") {
        ctx.arc(cx, cy, cropRadius, 0, Math.PI * 2);
      } else {
        ctx.rect(cropLeft, cropTop, CROP_SIZE, CROP_SIZE);
      }
      ctx.clip();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      const third = CROP_SIZE / 3;
      ctx.beginPath();
      ctx.moveTo(cropLeft + third, cropTop);
      ctx.lineTo(cropLeft + third, cropTop + CROP_SIZE);
      ctx.moveTo(cropLeft + third * 2, cropTop);
      ctx.lineTo(cropLeft + third * 2, cropTop + CROP_SIZE);

      ctx.moveTo(cropLeft, cropTop + third);
      ctx.lineTo(cropLeft + CROP_SIZE, cropTop + third);
      ctx.moveTo(cropLeft, cropTop + third * 2);
      ctx.lineTo(cropLeft + CROP_SIZE, cropTop + third * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }, [imageLoaded, cropShape, zoom, pan, rotation, isInteracting]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Soporte de rueda de ratón (wheel zoom) sin pasividad bloqueante
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = -e.deltaY * 0.0015;
      setZoom((prev) => Math.max(1, Math.min(3, +(prev + zoomDelta).toFixed(2))));
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, []);

  // Manejo de eventos táctiles y puntero (Touch / Mouse drag + Pinch to zoom)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setIsInteracting(true);

    if (pointersRef.current.size === 1) {
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    } else if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStartRef.current = {
        dist: dist > 0 ? dist : 1,
        zoom,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 1) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPan({
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy,
      });
    } else if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const scaleFactor = dist / pinchStartRef.current.dist;
      const newZoom = Math.max(1, Math.min(3, +(pinchStartRef.current.zoom * scaleFactor).toFixed(2)));
      setZoom(newZoom);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }
    pointersRef.current.delete(e.pointerId);

    if (pointersRef.current.size === 0) {
      setIsInteracting(false);
    } else if (pointersRef.current.size === 1) {
      const remaining = Array.from(pointersRef.current.values())[0];
      dragStartRef.current = {
        x: remaining.x,
        y: remaining.y,
        panX: pan.x,
        panY: pan.y,
      };
    }
  };

  // Confirmar y generar el canvas recortado en alta fidelidad
  const handleConfirm = () => {
    const img = imageRef.current;
    if (!img) return;

    const isRotatedSideways = rotation % 180 !== 0;
    const effectiveW = isRotatedSideways ? img.naturalHeight : img.naturalWidth;
    const effectiveH = isRotatedSideways ? img.naturalWidth : img.naturalHeight;

    const baseScale = Math.max(CROP_SIZE / effectiveW, CROP_SIZE / effectiveH);
    const currentScale = baseScale * zoom;

    const renderedW = effectiveW * currentScale;
    const renderedH = effectiveH * currentScale;
    const maxPanX = Math.max(0, (renderedW - CROP_SIZE) / 2);
    const maxPanY = Math.max(0, (renderedH - CROP_SIZE) / 2);

    const clampedX = Math.max(-maxPanX, Math.min(maxPanX, pan.x));
    const clampedY = Math.max(-maxPanY, Math.min(maxPanY, pan.y));

    // Resolución de exportación: cuadrada de alto contraste (512px a 1024px)
    const naturalCropSize = CROP_SIZE / currentScale;
    const outputSize = Math.max(512, Math.min(1024, Math.round(naturalCropSize)));

    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = outputSize;
    outputCanvas.height = outputSize;

    const outCtx = outputCanvas.getContext("2d");
    if (!outCtx) return;

    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = "high";

    const factor = outputSize / CROP_SIZE;

    outCtx.save();
    outCtx.translate(outputSize / 2, outputSize / 2);
    outCtx.translate(clampedX * factor, clampedY * factor);
    outCtx.rotate((rotation * Math.PI) / 180);
    outCtx.scale(currentScale * factor, currentScale * factor);
    outCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    outCtx.restore();

    onCrop(outputCanvas);
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Recortar foto"
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[color:var(--scrim)] p-3 sm:p-4 backdrop-blur-sm animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm sm:max-w-md rounded-[22px] border border-rule bg-paper p-4 sm:p-5 shadow-2xl flex flex-col gap-3.5 sm:gap-4 overflow-hidden"
      >
        {/* Encabezado */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-ink leading-tight">
              Ajustar encuadre
            </h2>
            <p className="text-xs text-ink-soft mt-0.5">
              Arrastrá para mover y hacé zoom con los controles o dedos.
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            aria-label="Cerrar y cancelar recorte"
            className="size-9 shrink-0 inline-flex items-center justify-center rounded-[10px] border border-rule bg-paper-2 text-ink-soft hover:text-ink hover:bg-paper active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Selector de forma (Círculo vs Cuadrado) */}
        <div className="flex items-center justify-between gap-2 border-b border-rule pb-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft">
            Vista previa
          </span>

          <div className="flex items-center gap-1 p-0.5 rounded-[10px] bg-paper-2 border border-rule">
            <button
              type="button"
              onClick={() => setCropShape("circle")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-[8px] transition-colors ${
                cropShape === "circle"
                  ? "bg-paper text-ink shadow-sm"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              <Circle className="size-3.5" />
              <span>Círculo</span>
            </button>
            <button
              type="button"
              onClick={() => setCropShape("square")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-[8px] transition-colors ${
                cropShape === "square"
                  ? "bg-paper text-ink shadow-sm"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              <Square className="size-3.5" />
              <span>Cuadro</span>
            </button>
          </div>
        </div>

        {/* Área del Canvas interactivo */}
        <div className="relative flex items-center justify-center rounded-[16px] border border-rule bg-paper-2 overflow-hidden select-none touch-none aspect-square w-full max-w-[280px] mx-auto shadow-inner">
          {!imageLoaded && !loadError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-ink-soft text-xs">
              <Spinner className="size-5" />
              <span>Cargando imagen...</span>
            </div>
          )}

          {loadError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-xs text-danger">
              <p>{loadError}</p>
            </div>
          )}

          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`touch-none block w-[280px] h-[280px] ${
              imageLoaded ? "cursor-grab active:cursor-grabbing" : "opacity-0"
            }`}
          />
        </div>

        {/* Controles de Zoom y Rotación */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(1, +(z - 0.2).toFixed(2)))}
              disabled={!imageLoaded || zoom <= 1}
              aria-label="Reducir zoom"
              className="size-9 shrink-0 inline-flex items-center justify-center rounded-[10px] border border-rule bg-paper-2 text-ink hover:bg-paper active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              <ZoomOut className="size-4" />
            </button>

            <label className="flex-1 flex items-center gap-2">
              <span className="sr-only">Nivel de zoom</span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.02"
                value={zoom}
                disabled={!imageLoaded}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-2 rounded-full bg-paper-3 accent-accent cursor-pointer disabled:opacity-40"
              />
            </label>

            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(2)))}
              disabled={!imageLoaded || zoom >= 3}
              aria-label="Aumentar zoom"
              className="size-9 shrink-0 inline-flex items-center justify-center rounded-[10px] border border-rule bg-paper-2 text-ink hover:bg-paper active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              <ZoomIn className="size-4" />
            </button>

            <span className="text-xs font-mono text-ink-soft min-w-[36px] text-right">
              {zoom.toFixed(1)}x
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              disabled={!imageLoaded}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] border border-rule bg-paper-2 text-xs font-medium text-ink hover:bg-paper active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              <RotateCw className="size-3.5" />
              <span>Girar 90°</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={!imageLoaded || (zoom === 1 && pan.x === 0 && pan.y === 0 && rotation === 0)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] border border-rule bg-paper-2 text-xs font-medium text-ink-soft hover:text-ink hover:bg-paper active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              <RefreshCw className="size-3.5" />
              <span>Restablecer</span>
            </button>
          </div>
        </div>

        {/* Botones de acción principales */}
        <div className="flex items-center gap-3 pt-1 border-t border-rule">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 px-4 rounded-[12px] border border-rule bg-paper-2 text-ink text-sm font-medium hover:bg-paper active:scale-95 transition-all flex-1"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!imageLoaded}
            className="h-11 px-5 rounded-[12px] bg-accent text-accent-ink text-sm font-semibold hover:brightness-105 active:scale-[0.97] transition-all flex-1 inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none shadow-sm"
          >
            <Check className="size-4" />
            <span>Confirmar recorte</span>
          </button>
        </div>
      </div>
    </div>
  );
}
