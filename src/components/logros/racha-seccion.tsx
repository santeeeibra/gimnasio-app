"use client";

/**
 * Sección de racha de constancia en /mi (feature "Compartir logros").
 *
 * Envuelve <RachaCard> (siempre visible si dias >= RACHA_MINIMA_VISIBLE) y, en
 * un hito, ofrece el <CartelLogro tipo="racha"> para compartir. En el hito el
 * cartel se auto-abre una sola vez por valor de racha (guardado en
 * localStorage) para no molestar en cada visita.
 *
 * Convive con <RachaConstancia> (mini-calendario de asistencia): son cosas
 * distintas.
 */

import { useEffect, useState } from "react";
import { RachaCard } from "@/components/logros/racha-card";
import { CartelLogro } from "@/components/logros/cartel-logro";
import { tituloRacha } from "@/lib/logros/compartir";
import type { ColoresImagen } from "@/lib/logros/imagen";
import { RACHA_MINIMA_VISIBLE, type ResultadoRacha } from "@/lib/logros/tipos";

export function RachaSeccion({
  racha,
  gimnasioNombre,
  logoUrl,
  colores,
}: {
  racha: ResultadoRacha;
  gimnasioNombre: string;
  logoUrl?: string | null;
  colores: ColoresImagen;
}) {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!racha.enHito) return;
    const clave = `gym.logro-racha-visto.${racha.dias}`;
    try {
      if (localStorage.getItem(clave)) return;
      localStorage.setItem(clave, "1");
    } catch {
      /* sin storage: se abre igual */
    }
    setAbierto(true);
  }, [racha.enHito, racha.dias]);

  if (racha.dias < RACHA_MINIMA_VISIBLE) return null;

  return (
    <>
      <RachaCard racha={racha} onCompartir={() => setAbierto(true)} />
      {abierto && (
        <CartelLogro
          tipo="racha"
          titulo={tituloRacha(racha.dias)}
          subtitulo={
            racha.conPerdon ? "Con un día de perdón, pero la racha sigue viva" : undefined
          }
          gimnasioNombre={gimnasioNombre}
          logoUrl={logoUrl ?? null}
          colores={colores}
          whatsapp={{ dias: racha.dias }}
          onCerrar={() => setAbierto(false)}
        />
      )}
    </>
  );
}
