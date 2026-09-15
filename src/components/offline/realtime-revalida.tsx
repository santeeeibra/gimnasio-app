"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface RealtimeRevalidaProps {
  gimnasioId?: string | null;
}

/**
 * Revalidación en vivo vía Supabase Realtime.
 * Escucha cambios en la base de datos (clientes, pagos, rutinas, caja, etc.)
 * asociados al gimnasio actual y refresca la vista suavemente con debounce.
 */
export function RealtimeRevalida({ gimnasioId }: RealtimeRevalidaProps) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!gimnasioId) return;

    const supabase = createClient();

    const debouncedRefresh = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        router.refresh();
      }, 500);
    };

    const channel = supabase
      .channel(`gym-realtime-${gimnasioId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          filter: `gimnasio_id=eq.${gimnasioId}`,
        },
        () => {
          debouncedRefresh();
        },
      )
      .subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      void supabase.removeChannel(channel);
    };
  }, [gimnasioId, router]);

  return null;
}
