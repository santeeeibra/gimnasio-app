"use client";

/**
 * Card de racha de constancia en /mi.
 *
 * ESTRUCTURA MÍNIMA — props + gate de visibilidad. Sin estilos ni animación;
 * el diseño final lo hace otra herramienta.
 */

import { RACHA_MINIMA_VISIBLE, type ResultadoRacha } from "@/lib/logros/tipos";

export type RachaCardProps = {
  racha: ResultadoRacha;
  /** Se llama al tocar "Compartir" (sólo se ofrece en un hito). */
  onCompartir?: () => void;
};

export function RachaCard({ racha, onCompartir }: RachaCardProps) {
  if (racha.dias < RACHA_MINIMA_VISIBLE) return null;

  return (
    <div data-logro="racha">
      <p>🔥 {racha.dias} días seguidos entrenando</p>
      {racha.conPerdon && <p>Te salvó el día de perdón</p>}
      {racha.enHito && (
        <button type="button" onClick={onCompartir}>
          Compartir
        </button>
      )}
    </div>
  );
}
