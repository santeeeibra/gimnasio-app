"use client";

import { useEffect } from "react";
import { guardarCache } from "@/lib/offline/cache";

/**
 * No renderiza nada: al montar, persiste en `localStorage` la data que el
 * Server Component ya trajo. Si más tarde Supabase se cae y la página tira
 * error, el `error.tsx` lee esta copia y la muestra con aviso de antigüedad.
 */
export function CacheAlVuelo({
  clave,
  data,
}: {
  clave: string;
  data: unknown;
}) {
  useEffect(() => {
    guardarCache(clave, data);
  }, [clave, data]);
  return null;
}
