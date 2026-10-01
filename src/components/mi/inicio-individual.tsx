"use client";

import Link from "next/link";
import { ArrowUpRight, Dumbbell, Scale, UserRound } from "lucide-react";
import { Pulpo } from "@/components/mascota/pulpo";
import { BotonInstalarApp } from "@/components/pwa/boton-instalar-app";
import { hapticoSeleccion } from "@/lib/ui/hapticos";

export function InicioIndividual({ nombre }: { nombre: string }) {
  const primerNombre = nombre.trim().split(/\s+/)[0] || "";
  return (
    <div className="mx-auto max-w-xl space-y-5 pb-4">
      <header className="flex items-center gap-4 rounded-[16px] border border-rule bg-paper-2 p-5">
        <div className="grid size-16 shrink-0 place-items-center rounded-[16px] bg-[#052e1f]">
          <Pulpo size={52} pose="kettlebell" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Cuenta personal</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink">Hola, {primerNombre}</h1>
          <p className="mt-1 text-sm text-ink-soft">Tu espacio para entrenar y seguir tu evolución.</p>
        </div>
      </header>

      <Link href="/mi/rutina" onClick={hapticoSeleccion} className="flex min-h-28 items-center gap-4 rounded-[16px] border border-accent/30 bg-accent/10 p-5 text-ink transition-transform duration-150 active:scale-[0.98]">
        <Dumbbell aria-hidden className="size-8 shrink-0 text-accent" />
        <div className="flex-1">
          <h2 className="font-display text-xl font-bold">Mi rutina</h2>
          <p className="mt-1 text-sm text-ink-soft">Creá tu plan o continuá tu entrenamiento.</p>
        </div>
        <ArrowUpRight aria-hidden className="size-5 shrink-0" />
      </Link>

      <Link href="/mi/peso" onClick={hapticoSeleccion} className="flex min-h-24 items-center gap-4 rounded-[16px] border border-rule bg-paper-2 p-5 text-ink transition-transform duration-150 active:scale-[0.98]">
        <Scale aria-hidden className="size-7 shrink-0 text-accent" />
        <div className="flex-1">
          <h2 className="font-display text-lg font-bold">Mi peso</h2>
          <p className="mt-1 text-sm text-ink-soft">Registrá tu peso y consultá tu historial.</p>
        </div>
        <ArrowUpRight aria-hidden className="size-5 shrink-0" />
      </Link>

      <Link href="/mi/perfil" onClick={hapticoSeleccion} className="flex min-h-11 items-center gap-3 rounded-[12px] border border-rule px-4 py-3 text-sm font-medium text-ink active:scale-[0.98]">
        <UserRound aria-hidden className="size-5 text-ink-soft" /> Mi perfil
      </Link>
      <BotonInstalarApp />
    </div>
  );
}
