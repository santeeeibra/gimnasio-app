"use client";

import Link from "next/link";
import { Pulpo } from "@/components/mascota/pulpo";
import { hapticoSeleccion } from "@/lib/ui/hapticos";

export default function NotFound() {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-paper p-6 text-ink">
      <div className="w-full max-w-sm space-y-4 rounded-[16px] border border-rule bg-paper-2 p-6 text-center">
        <div className="mx-auto grid size-24 place-items-center rounded-full bg-[#052e1f]">
          <Pulpo size={72} pose="mareado" />
        </div>
        <h1 className="font-display text-xl font-bold">No encontramos esta página</h1>
        <p className="text-sm text-ink-soft">El enlace puede haber cambiado o el contenido ya no estar disponible.</p>
        <Link href="/" onClick={hapticoSeleccion} className="inline-flex min-h-11 items-center justify-center rounded-[12px] border border-rule px-5 font-semibold active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
