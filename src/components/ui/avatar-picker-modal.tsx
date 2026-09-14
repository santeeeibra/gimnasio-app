"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Camera, Check } from "lucide-react";
import { hapticoImpactoSuave } from "@/lib/ui/hapticos";

export const AVATARES_PRESET = [
  { url: "/avatares-preset/volt-1.png", nombre: "Volt clásico" },
  { url: "/avatares-preset/volt-2.png", nombre: "Volt saludo" },
  { url: "/avatares-preset/volt-3.png", nombre: "Volt guiño" },
  { url: "/avatares-preset/volt-biceps.png", nombre: "Volt doble bíceps" },
  { url: "/avatares-preset/volt-arana.png", nombre: "Volt araña" },
  { url: "/avatares-preset/volt-prote.png", nombre: "Volt proteína" },
] as const;

export function AvatarPickerModal({
  isOpen,
  fotoActual,
  onSelectPreset,
  onSubirPropia,
  onQuitar,
  onClose,
}: {
  isOpen: boolean;
  fotoActual: string | null;
  onSelectPreset: (url: string) => void;
  onSubirPropia: () => void;
  onQuitar?: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] grid place-items-end sm:place-items-center bg-ink/40 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:w-[380px] max-h-[85vh] overflow-y-auto rounded-t-[20px] sm:rounded-[20px] border border-rule bg-paper p-5 shadow-lg animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-ink">Elegí tu foto de perfil</h3>
          <button
            type="button"
            onClick={onClose}
            className="size-7 grid place-items-center rounded-full text-ink-soft hover:bg-paper-2 active:scale-95 transition"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="text-[11px] text-ink-soft mb-4">
          Elegí un avatar de Volt o subí tu propia foto
        </p>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {AVATARES_PRESET.map((av) => {
            const seleccionado = fotoActual === av.url;
            return (
              <button
                key={av.url}
                type="button"
                onClick={() => {
                  hapticoImpactoSuave();
                  onSelectPreset(av.url);
                }}
                title={av.nombre}
                className={`relative aspect-square rounded-full overflow-hidden border-2 transition-all active:scale-95 ${
                  seleccionado ? "border-brand shadow-md" : "border-rule hover:border-ink/40"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={av.url}
                  alt={av.nombre}
                  className="size-full object-cover bg-paper-2"
                />
                {seleccionado && (
                  <div className="absolute inset-0 bg-ink/20 grid place-items-center">
                    <div className="size-5 rounded-full bg-brand text-ink grid place-items-center">
                      <Check className="size-3.5" strokeWidth={3} />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            hapticoImpactoSuave();
            onSubirPropia();
          }}
          className="w-full h-10 flex items-center justify-center gap-2 rounded-[10px] border border-rule bg-paper-2 text-xs font-semibold text-ink hover:bg-paper-3 active:scale-[0.98] transition-all"
        >
          <Camera className="size-3.5" />
          Subir tu propia foto
        </button>

        {fotoActual && onQuitar ? (
          <button
            type="button"
            onClick={() => {
              hapticoImpactoSuave();
              onQuitar();
            }}
            className="w-full h-9 mt-2 flex items-center justify-center text-xs font-medium text-danger hover:underline"
          >
            Quitar foto
          </button>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
