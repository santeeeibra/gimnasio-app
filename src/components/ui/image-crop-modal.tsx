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

const CANVAS_SIZE = 280; // Tamaño del canvas en pantalla (CSS px)
const CROP_SIZE = 240;   // Diámetro / ancho de la zona de recorte (CSS px)

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

  // Referencias mutables para cálculo táctil y mouse fluido sin saltos
  const panRef = useRef(pan);
  panRef.current = pan;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const rotationRef = useRef(rotation);
  rotationRef.current = rotation;

  // Función de contención (clamp) para que la imagen nunca deje huecos vacíos en el recorte
  const getClampedPan = useCallback(
    (px: number, py: number, currentZoom: number, currentRot: number) => {
      const img = imageRef.current;
      if (!img || !img.naturalWidth || !img.naturalHeight) {
        return { x: 0, y: 0 };
      }

      const isSideways = currentRot % 180 !== 0;
      const ew = isSideways ? img.naturalHeight : img.naturalWidth;
      const eh = isSideways ? img.naturalWidth : img.naturalHeight;

      if (!ew || !eh) return { x: 0, y: 0 };

      const baseScale = Math.max(CROP_SIZE / ew, CROP_SIZE / eh);
      const scale = baseScale * currentZoom;

      const renderedW = ew * scale;
      const renderedH = eh * scale;

      const maxPanX = Math.max(0, (renderedW - CROP_SIZE) / 2);
      const maxPanY = Math.max(0, (renderedH - CROP_SIZE) / 2);

      const safeX = Number.isFinite(px) ? px : 0;
      const safeY = Number.isFinite(py) ? py : 0;

      return {
        x: Math.max(-maxPanX, Math.min(maxPanX, safeX)),
        y: Math.max(-maxPanY, Math.min(maxPanY, safeY)),
      };
    },
    [],
  );

  // Bloquear scroll del body mientras el modal está abierto
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  // Cargar imagen desde el File
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
      setLoadError("No se pudo cargar la imagen. Probá con otra foto.");
      setImageLoaded(false);
    };

    img.src = objectUrl;

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [isOpen, file]);

  // Dibujar en el canvas de previsualización
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

    const isSideways = rotation % 180 !== 0;
    const ew = isSideways ? img.naturalHeight : img.naturalWidth;
    const eh = isSideways ? img.naturalWidth : img.naturalHeight;

    const baseScale = Math.max(CROP_SIZE / ew, CROP_SIZE / eh);
    const scale = baseScale * zoom;

    const clamped = getClampedPan(pan.x, pan.y, zoom, rotation);

    const cx = width / 2;
    const cy = height / 2;

    // 1. Dibujar imagen trasladada y rotada
    ctx.save();
    ctx.translate(cx + clamped.x, cy + clamped.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    // 2. Máscara oscura con ventana de visualización nítida
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

    // 3. Borde acentuado alrededor del recorte
    ctx.strokeStyle = "rgba(16, 231, 160, 0.95)";
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

    // 4. Guía de tercios al arrastrar o hacer zoom
    if (isInteracting) {
      ctx.save();
      ctx.beginPath();
      if (cropShape === "circle") {
        ctx.arc(cx, cy, cropRadius, 0, Math.PI * 2);
      } else {
        ctx.rect(cropLeft, cropTop, CROP_SIZE, CROP_SIZE);
      }
      ctx.clip();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
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
  }, [imageLoaded, cropShape, zoom, pan, rotation, isInteracting, getClampedPan]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Manejo de eventos nativos Touch y Wheel con preventDefault para evitar rebotes/zoom de Safari iOS
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let touchStartPoints: { x: number; y: number }[] = [];
    let lastPinchDistance = 0;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      setIsInteracting(true);
      if (e.touches.length === 1) {
        touchStartPoints = [{ x: e.touches[0].clientX, y: e.touches[0].clientY }];
      } else if (e.touches.length >= 2) {
        touchStartPoints = [
          { x: e.touches[0].clientX, y: e.touches[0].clientY },
          { x: e.touches[1].clientX, y: e.touches[1].clientY },
        ];
        lastPinchDistance = Math.hypot(
          touchStartPoints[0].x - touchStartPoints[1].x,
          touchStartPoints[0].y - touchStartPoints[1].y,
        );
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && touchStartPoints.length >= 1) {
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const dx = currentX - touchStartPoints[0].x;
        const dy = currentY - touchStartPoints[0].y;
        touchStartPoints = [{ x: currentX, y: currentY }];

        setPan((prev) =>
          getClampedPan(prev.x + dx, prev.y + dy, zoomRef.current, rotationRef.current),
        );
      } else if (e.touches.length >= 2 && lastPinchDistance > 0) {
        const currentDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
        if (currentDist > 0) {
          const ratio = currentDist / lastPinchDistance;
          lastPinchDistance = currentDist;
          setZoom((prev) => {
            const nextZoom = Math.max(1, Math.min(4, +(prev * ratio).toFixed(2)));
            setPan((currPan) =>
              getClampedPan(currPan.x, currPan.y, nextZoom, rotationRef.current),
            );
            return nextZoom;
          });
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        setIsInteracting(false);
        touchStartPoints = [];
        lastPinchDistance = 0;
      } else if (e.touches.length === 1) {
        touchStartPoints = [{ x: e.touches[0].clientX, y: e.touches[0].clientY }];
        lastPinchDistance = 0;
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.002;
      setZoom((prev) => {
        const nextZoom = Math.max(1, Math.min(4, +(prev + delta).toFixed(2)));
        setPan((currPan) =>
          getClampedPan(currPan.x, currPan.y, nextZoom, rotationRef.current),
        );
        return nextZoom;
      });
    };

    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });
    canvas.addEventListener("touchcancel", onTouchEnd, { passive: false });
    canvas.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("touchcancel", onTouchEnd);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [getClampedPan]);

  // Manejo de ratón (desktop)
  const isMouseDownRef = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isMouseDownRef.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    setIsInteracting(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMouseDownRef.current) return;
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    setPan((prev) =>
      getClampedPan(prev.x + dx, prev.y + dy, zoomRef.current, rotationRef.current),
    );
  };

  const handleMouseUp = () => {
    if (isMouseDownRef.current) {
      isMouseDownRef.current = false;
      setIsInteracting(false);
    }
  };

  // Cambio de zoom seguro vía slider o botones
  const handleZoomChange = (nextZoom: number) => {
    const sanitized = Math.max(1, Math.min(4, Number.isFinite(nextZoom) ? nextZoom : 1));
    setZoom(sanitized);
    setPan((currPan) =>
      getClampedPan(currPan.x, currPan.y, sanitized, rotationRef.current),
    );
  };

  // Confirmar y generar el canvas cuadrado en alta fidelidad (512x512)
  const handleConfirm = () => {
    const img = imageRef.current;
    if (!img || !img.naturalWidth || !img.naturalHeight) return;

    const isSideways = rotation % 180 !== 0;
    const ew = isSideways ? img.naturalHeight : img.naturalWidth;
    const eh = isSideways ? img.naturalWidth : img.naturalHeight;

    const baseScale = Math.max(CROP_SIZE / ew, CROP_SIZE / eh);
    const scale = baseScale * zoom;

    const clamped = getClampedPan(pan.x, pan.y, zoom, rotation);

    // Salida fija de 512x512 para máxima nitidez y rendimiento predecible
    const outputSize = 512;
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = outputSize;
    outputCanvas.height = outputSize;

    const outCtx = outputCanvas.getContext("2d");
    if (!outCtx) return;

    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = "high";

    const factor = outputSize / CROP_SIZE;

    outCtx.save();
    // Centrar en el canvas de salida
    outCtx.translate(outputSize / 2 + clamped.x * factor, outputSize / 2 + clamped.y * factor);
    outCtx.rotate((rotation * Math.PI) / 180);
    outCtx.scale(scale * factor, scale * factor);
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
              Ajustar foto de perfil
            </h2>
            <p className="text-xs text-ink-soft mt-0.5">
              Arrastrá para encuadrar y ajustá el zoom con el slider o los dedos.
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

        {/* Selector de forma */}
        <div className="flex items-center justify-between gap-2 border-b border-rule pb-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft">
            Forma de vista previa
          </span>

          <div className="flex items-center gap-1 p-0.5 rounded-[10px] bg-paper-2 border border-rule">
            <button
              type="button"
              onClick={() => setCropShape("circle")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-[8px] transition-colors ${
                cropShape === "circle"
                  ? "bg-paper text-ink shadow-sm font-semibold"
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
                  ? "bg-paper text-ink shadow-sm font-semibold"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              <Square className="size-3.5" />
              <span>Cuadro</span>
            </button>
          </div>
        </div>

        {/* Área interactiva del Canvas */}
        <div className="relative flex items-center justify-center rounded-[16px] border border-rule bg-paper-2 overflow-hidden select-none aspect-square w-full max-w-[280px] mx-auto shadow-inner">
          {!imageLoaded && !loadError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-ink-soft text-xs">
              <Spinner className="size-5" />
              <span>Cargando foto...</span>
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
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ touchAction: "none" }}
            className={`block w-[280px] h-[280px] ${
              imageLoaded ? "cursor-grab active:cursor-grabbing" : "opacity-0"
            }`}
          />
        </div>

        {/* Controles de Zoom y Rotación */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleZoomChange(+(zoom - 0.2).toFixed(2))}
              disabled={!imageLoaded || zoom <= 1}
              aria-label="Alejar imagen"
              className="size-9 shrink-0 inline-flex items-center justify-center rounded-[10px] border border-rule bg-paper-2 text-ink hover:bg-paper active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              <ZoomOut className="size-4" />
            </button>

            <label className="flex-1 flex items-center gap-2">
              <span className="sr-only">Nivel de zoom</span>
              <input
                type="range"
                min="1"
                max="4"
                step="0.02"
                value={zoom}
                disabled={!imageLoaded}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                className="w-full h-2 rounded-full bg-paper-3 accent-accent cursor-pointer disabled:opacity-40"
              />
            </label>

            <button
              type="button"
              onClick={() => handleZoomChange(+(zoom + 0.2).toFixed(2))}
              disabled={!imageLoaded || zoom >= 4}
              aria-label="Acercar imagen"
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
              onClick={() => {
                const nextRot = (rotation + 90) % 360;
                setRotation(nextRot);
                setPan((currPan) => getClampedPan(currPan.x, currPan.y, zoom, nextRot));
              }}
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

        {/* Botones de acción */}
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
