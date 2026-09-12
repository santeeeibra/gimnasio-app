"use client";

/**
 * Aviso de retención anti-churn ("Pulpo Volt te extraña") generado por el
 * cron `job-retencion-diaria` (ver supabase/migrations/0068_retencion_automatica.sql).
 * No consume IA ni cron de Vercel: sólo lee `notificaciones_pendientes`.
 */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PulpoCard } from "@/components/mascota/pulpo";
import { aceptarRutinaExpressRetencion } from "@/app/mi/rutina/actions";
import { hapticoExito, hapticoImpactoSuave, iniciarAudioHaptico } from "@/lib/ui/hapticos";

type NotificacionPendiente = {
  id: string;
  mensaje: string;
};

export function PulpoRetencionCard() {
  const [aviso, setAviso] = useState<NotificacionPendiente | null>(null);
  const [saliendo, setSaliendo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let activo = true;
    const supabase = createClient();

    supabase
      .from("notificaciones_pendientes")
      .select("id, mensaje")
      .eq("tipo", "retencion")
      .eq("estado", "pendiente")
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (activo && data) setAviso(data as NotificacionPendiente);
      });

    return () => {
      activo = false;
    };
  }, []);

  if (!aviso) return null;

  async function aceptarRutinaExpress() {
    if (!aviso || enviando) return;
    iniciarAudioHaptico();
    hapticoImpactoSuave();
    setEnviando(true);

    const res = await aceptarRutinaExpressRetencion(aviso.id);
    if (res.error) {
      setEnviando(false);
      return;
    }

    hapticoExito();
    setSaliendo(true);
    window.setTimeout(() => setAviso(null), 220);
  }

  return (
    <div
      data-aviso="retencion"
      className={`relative w-full rounded-[16px] border border-emerald-500/25 bg-zinc-900/90 p-4 shadow-xl backdrop-blur-xl transition-all duration-200 [transition-timing-function:var(--ease-out)] ${
        saliendo ? "opacity-0 scale-[0.97] -translate-y-1" : "opacity-100 scale-100 translate-y-0"
      }`}
    >
      <div className="flex items-start gap-3.5">
        <PulpoCard
          size={52}
          pose="buzon"
          cardClassName="flex-shrink-0 w-16 h-16 !p-1.5 !rounded-[14px] border-emerald-500/30"
        />

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Te extrañamos
          </p>
          <p className="mt-0.5 text-sm font-medium text-white leading-snug">
            {aviso.mensaje}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={aceptarRutinaExpress}
        disabled={enviando}
        className="mt-3.5 flex h-11 w-full items-center justify-center rounded-[12px] bg-emerald-500 font-bold text-sm text-zinc-950 shadow-md shadow-emerald-500/20 transition-transform active:scale-[0.97] disabled:opacity-60"
      >
        Aceptar rutina express
      </button>
    </div>
  );
}
