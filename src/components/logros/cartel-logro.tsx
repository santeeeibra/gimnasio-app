"use client";

/**
 * Cartel de logro (récord de peso o hito de racha) con botones para compartir.
 *
 * ESTRUCTURA MÍNIMA — props + estado + wiring a la lógica de
 * `src/lib/logros/*`. Sin estilos ni animación: el diseño final (incluida la
 * mascota <Pulpo /> en su badge de fondo fijo) lo hace otra herramienta.
 */

import { useState } from "react";
import {
  generarImagenLogro,
  type ColoresImagen,
} from "@/lib/logros/imagen";
import {
  descargarDataUrl,
  linkWhatsAppLogro,
  mensajeWhatsAppRacha,
  mensajeWhatsAppRecord,
} from "@/lib/logros/compartir";
import type { TipoLogro } from "@/lib/logros/tipos";

export type CartelLogroProps = {
  tipo: TipoLogro;
  /** Texto principal del cartel y de la imagen. */
  titulo: string;
  subtitulo?: string;
  gimnasioNombre: string;
  logoUrl?: string | null;
  /** Colores del tema del gimnasio (paper / ink / volt / voltInk). */
  colores: ColoresImagen;
  /** Datos para el texto de WhatsApp según el tipo. */
  whatsapp: { pesoKg?: number; ejercicio?: string; dias?: number };
  onCerrar?: () => void;
};

export function CartelLogro(props: CartelLogroProps) {
  const [generando, setGenerando] = useState(false);
  const [imagen, setImagen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generar(): Promise<string | null> {
    setGenerando(true);
    setError(null);
    try {
      const dataUrl = await generarImagenLogro({
        titulo: props.titulo,
        subtitulo: props.subtitulo,
        gimnasioNombre: props.gimnasioNombre,
        logoUrl: props.logoUrl ?? null,
        colores: props.colores,
      });
      setImagen(dataUrl);
      return dataUrl;
    } catch {
      setError("No se pudo generar la imagen.");
      return null;
    } finally {
      setGenerando(false);
    }
  }

  async function descargar() {
    const dataUrl = imagen ?? (await generar());
    if (dataUrl) descargarDataUrl(dataUrl, `logro-${props.tipo}.png`);
  }

  async function compartirWhatsApp() {
    if (!imagen) await generar();
    const msg =
      props.tipo === "record"
        ? mensajeWhatsAppRecord(
            props.gimnasioNombre,
            props.whatsapp.pesoKg ?? 0,
            props.whatsapp.ejercicio ?? "",
          )
        : mensajeWhatsAppRacha(props.gimnasioNombre, props.whatsapp.dias ?? 0);
    window.open(linkWhatsAppLogro(msg), "_blank", "noopener");
  }

  return (
    <div role="dialog" aria-label={props.titulo} data-logro={props.tipo}>
      <p>{props.titulo}</p>
      {props.subtitulo && <p>{props.subtitulo}</p>}

      {imagen && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imagen} alt="Imagen del logro para compartir" />
      )}
      {error && <p>{error}</p>}

      <button type="button" onClick={descargar} disabled={generando}>
        {generando ? "Generando…" : "Descargar imagen"}
      </button>
      <button type="button" onClick={compartirWhatsApp} disabled={generando}>
        Compartir por WhatsApp
      </button>
      {props.onCerrar && (
        <button type="button" onClick={props.onCerrar}>
          Cerrar
        </button>
      )}
    </div>
  );
}
