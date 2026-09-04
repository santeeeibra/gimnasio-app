"use client";

import { useState } from "react";
import { TourPago, type PasoTour } from "@/components/tour-pago/tour-pago";
import { marcarTourPagoVisto } from "./actions";

const PASOS_DUENO: PasoTour[] = [
  {
    titulo: "Elegí tu plan",
    descripcion:
      "Revisá los cupos de socios, precios y el descuento early-bird si te corresponde para elegir el plan ideal.",
    selector: '[data-tour="plan-catalogo"]',
  },
  {
    titulo: "Confirmá el pago",
    descripcion:
      "Transferí el monto indicado a nuestro alias bancario y enviá la solicitud con el comprobante o referencia.",
    selector: '[data-tour="plan-pago"]',
  },
  {
    titulo: "Esperá la aprobación",
    descripcion:
      "Soporte verifica la acreditación y activa tu período. Te avisamos por notificación push cuando quede listo.",
    selector: '[data-tour="plan-estado"]',
  },
];

export function TourDueno({
  tourVistoInicial,
}: {
  tourVistoInicial: boolean;
}) {
  const [abierto, setAbierto] = useState(!tourVistoInicial);
  const [visto, setVisto] = useState(tourVistoInicial);

  const handleClose = async () => {
    setAbierto(false);
    if (!visto) {
      setVisto(true);
      await marcarTourPagoVisto();
    }
  };

  const handleAbrir = () => {
    setAbierto(true);
  };

  return (
    <TourPago
      pasos={PASOS_DUENO}
      abierto={abierto}
      onClose={handleClose}
      onAbrir={handleAbrir}
      posicionBotonFlotante="bottom-20 md:bottom-6 right-5 md:right-6"
    />
  );
}
