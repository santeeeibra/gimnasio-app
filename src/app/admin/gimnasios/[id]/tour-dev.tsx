"use client";

import { useEffect, useState } from "react";
import { TourPago, type PasoTour } from "@/components/tour-pago/tour-pago";

const DEV_FLAG = "tour_pago_dev_visto";

const PASOS_DEV: PasoTour[] = [
  {
    titulo: "Revisá el pago pendiente",
    descripcion:
      "Verificá el monto y el comprobante o nota de transferencia cargados por el dueño del gimnasio.",
    selector: '[data-tour="admin-pago-pendiente"], [data-tour="admin-pagos-card"]',
  },
  {
    titulo: "Confirmalo",
    descripcion:
      "Aprobá la transferencia. El sistema ya cuenta con bloqueo automático contra pagos duplicados.",
    selector: '[data-tour="admin-pago-confirmar"], [data-tour="admin-pagos-card"]',
  },
  {
    titulo: "Verificá",
    descripcion:
      "Comprobá que el plan asignado y la fecha de vencimiento se hayan actualizado correctamente en la ficha del gimnasio.",
    selector: '[data-tour="admin-plan-card"]',
  },
];

export function TourDev() {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DEV_FLAG) !== "1") {
        setAbierto(true);
      }
    } catch {
      // Si localStorage no está disponible, no forzamos la apertura
    }
  }, []);

  const handleClose = () => {
    setAbierto(false);
    try {
      localStorage.setItem(DEV_FLAG, "1");
    } catch {
      // Ignorar fallos de localStorage
    }
  };

  const handleAbrir = () => {
    setAbierto(true);
  };

  return (
    <TourPago
      pasos={PASOS_DEV}
      abierto={abierto}
      onClose={handleClose}
      onAbrir={handleAbrir}
      posicionBotonFlotante="bottom-6 right-6"
    />
  );
}
