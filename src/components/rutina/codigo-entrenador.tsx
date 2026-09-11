"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Ticket } from "lucide-react";
import { hapticoSeleccion } from "@/lib/ui/hapticos";

export function CodigoEntrenador() {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");

  function ir(e: React.FormEvent) {
    e.preventDefault();
    const limpio = codigo.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (limpio.length < 3) return;
    hapticoSeleccion();
    router.push(`/r/${limpio}`);
  }

  return (
    <details className="group rounded-[14px] border border-rule bg-paper-2 p-4 shadow-sm">
      <summary className="flex cursor-pointer select-none list-none items-center gap-3 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
        <span className="grid size-8 shrink-0 place-items-center rounded-[8px] border border-rule bg-paper text-accent">
          <Ticket aria-hidden className="size-4" />
        </span>
        Tengo un código de entrenador
      </summary>
      <form onSubmit={ir} className="mt-3 flex gap-2 animate-fade-in">
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          placeholder="LUCAS"
          className="h-10 flex-1 rounded-[10px] border border-rule bg-paper px-3 text-[16px] uppercase text-ink"
        />
        <button
          type="submit"
          className="inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-accent px-4 text-sm font-medium text-accent-ink active:scale-[0.98]"
        >
          Cargar <ArrowRight className="size-4" />
        </button>
      </form>
    </details>
  );
}
