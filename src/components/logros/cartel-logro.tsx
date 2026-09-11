"use client";

/**
 * Cartel de logro (récord de peso o hito de racha) con botones para compartir.
 *
 * Diseño nativo estilo iOS / SysGym:
 * - Animación 60fps compositor-only de entrada (backdrop blur + GPU scale/fade).
 * - Mascota <PulpoCard> en tarjeta fija oscura (zinc-950), nunca directo en bg-paper.
 * - Micro-interacciones hápticas al detectar récord (fanfarria + Haptics).
 * - Targets táctiles ergónomicos (≥44pt).
 */

import { useEffect, useState } from "react";
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
import { PulpoCard } from "@/components/mascota/pulpo";
import {
  hapticoImpactoMedio,
  hapticoRecordPersonal,
  hapticoExito,
  iniciarAudioHaptico,
} from "@/lib/ui/hapticos";
import { Download, Share2, X, Trophy, Flame, Loader2 } from "lucide-react";

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
  /** Si es llamado desde el panel del dueño, no se agrega marca externa de SysGym */
  esDueno?: boolean;
  /** Control explícito sobre la marca de agua SysGym (default: true para socios) */
  incluirMarcaSysGym?: boolean;
};

export function CartelLogro(props: CartelLogroProps) {
  const [generando, setGenerando] = useState(false);
  const [imagen, setImagen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const esRecord = props.tipo === "record";

  // Disparar micro-interacción sonora/háptica al montar si es un récord o hito
  useEffect(() => {
    iniciarAudioHaptico();
    if (esRecord) {
      hapticoRecordPersonal();
    } else {
      hapticoExito();
    }
  }, [esRecord]);

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
        incluirMarcaSysGym: props.incluirMarcaSysGym ?? !props.esDueno,
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
    iniciarAudioHaptico();
    hapticoImpactoMedio();
    const dataUrl = imagen ?? (await generar());
    if (dataUrl) descargarDataUrl(dataUrl, `logro-${props.tipo}.png`);
  }

  async function compartirWhatsApp() {
    iniciarAudioHaptico();
    hapticoImpactoMedio();
    const dataUrl = imagen ?? (await generar());
    const msg =
      props.tipo === "record"
        ? mensajeWhatsAppRecord(
            props.gimnasioNombre,
            props.whatsapp.pesoKg ?? 0,
            props.whatsapp.ejercicio ?? "",
          )
        : mensajeWhatsAppRacha(props.gimnasioNombre, props.whatsapp.dias ?? 0);

    // Intentar Web Share API con archivo nativo en móviles (Instagram Stories / WhatsApp / etc.)
    if (dataUrl && typeof navigator !== "undefined" && navigator.canShare) {
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], `logro-${props.tipo}.png`, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `¡Logro en ${props.gimnasioNombre}! 🔥`,
            text: msg,
          });
          return;
        }
      } catch {
        // Fallback a wa.me link si el usuario cancela o el navegador falla
      }
    }

    window.open(linkWhatsAppLogro(msg), "_blank", "noopener");
  }

  function handleCerrar() {
    iniciarAudioHaptico();
    hapticoImpactoMedio();
    props.onCerrar?.();
  }

  return (
    <div
      role="dialog"
      aria-label={props.titulo}
      data-logro={props.tipo}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all duration-200 animate-in fade-in"
    >
      <div className="relative w-full max-w-sm rounded-[22px] border border-white/10 bg-zinc-950/95 p-6 shadow-2xl backdrop-blur-2xl text-white animate-in zoom-in-95 duration-200 flex flex-col items-center text-center overflow-hidden">
        {/* Botón de cerrar superior */}
        {props.onCerrar && (
          <button
            type="button"
            onClick={handleCerrar}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer z-10"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Badge de detección de récord o racha */}
        {esRecord ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-extrabold uppercase tracking-wider mb-3 animate-bounce shadow-lg shadow-amber-500/10">
            <Trophy className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>¡Nuevo Récord Personal!</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold uppercase tracking-wider mb-3 animate-pulse shadow-lg shadow-emerald-500/10">
            <Flame className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
            <span>Hito de Constancia</span>
          </div>
        )}

        {/* Mascota en tarjeta de fondo fijo (Regla SysGym) */}
        <div className="mb-4">
          <PulpoCard
            size={90}
            pose="festejo"
            cardClassName={
              esRecord
                ? "border-amber-500/40 shadow-amber-500/20 shadow-2xl !rounded-[22px] !p-4"
                : "border-emerald-500/40 shadow-emerald-500/20 shadow-2xl !rounded-[22px] !p-4"
            }
          />
        </div>

        {/* Sede del gimnasio */}
        {props.gimnasioNombre && props.gimnasioNombre !== "SysGym" && (
          <p className="text-xs font-bold tracking-widest uppercase text-zinc-400 mb-1">
            {props.gimnasioNombre}
          </p>
        )}

        {/* Título y Subtítulo */}
        <h2 className="text-2xl font-black font-display tracking-tight text-white mb-1">
          {props.titulo}
        </h2>
        {props.subtitulo && (
          <p className="text-sm text-zinc-400 mb-4 font-medium max-w-xs leading-relaxed">
            {props.subtitulo}
          </p>
        )}

        {/* Vista previa de imagen si ya fue generada */}
        {imagen && (
          <div className="w-full mb-4 rounded-[16px] overflow-hidden border border-white/10 shadow-lg bg-zinc-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagen}
              alt="Imagen del logro para compartir"
              className="w-full h-auto object-contain max-h-56"
            />
          </div>
        )}

        {error && (
          <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2 mb-3 w-full">
            {error}
          </p>
        )}

        {/* Acciones principales */}
        <div className="w-full space-y-2.5 mt-1">
          <button
            type="button"
            onClick={descargar}
            disabled={generando}
            className="h-12 w-full rounded-[12px] bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-extrabold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
          >
            {generando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generando imagen…</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Descargar imagen</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={compartirWhatsApp}
            disabled={generando}
            className="h-12 w-full rounded-[12px] bg-[#25D366] hover:bg-[#22c55e] text-white font-extrabold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-all shadow-lg shadow-[#25D366]/20 disabled:opacity-50 cursor-pointer"
          >
            <Share2 className="w-4 h-4 stroke-[2.5]" />
            <span>Compartir por WhatsApp</span>
          </button>

          {props.onCerrar && (
            <button
              type="button"
              onClick={handleCerrar}
              className="h-11 w-full rounded-[12px] bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-semibold text-sm flex items-center justify-center active:scale-[0.97] transition-all cursor-pointer border border-white/5"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

