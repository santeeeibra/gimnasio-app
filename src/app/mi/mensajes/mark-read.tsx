"use client";

import { useEffect } from "react";
import { marcarLeido } from "./actions";

export function MarkRead({ mensajeId }: { mensajeId: string }) {
  useEffect(() => {
    marcarLeido(mensajeId);
  }, [mensajeId]);
  return null;
}
