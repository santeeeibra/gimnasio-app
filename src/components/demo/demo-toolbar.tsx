"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button, Spinner } from "@/components/ui";
import { hapticoExito, hapticoError, hapticoSeleccion } from "@/lib/ui/hapticos";
import {
  demoAltaCliente,
  demoRegistrarPago,
  demoCheckin,
  demoEnviarAviso,
  demoCrearPlan,
  demoCrearPlanConDescuento,
  demoGenerarRutinaCliente,
  demoGenerarMiRutina,
  demoRegistrarProgreso,
} from "@/lib/demo/actions";
import { salirCheckinSoporte } from "@/app/checkin/actions";

type Accion = {
  label: string;
  run: () => Promise<{ error?: string; ok?: string }>;
};

// Generales: siempre disponibles para el dueño, sin importar la pantalla.
const GENERALES_DUENO: Accion[] = [
  { label: "Alta cliente random", run: demoAltaCliente },
  { label: "Registrar pago random", run: demoRegistrarPago },
  { label: "Simular check-in", run: demoCheckin },
];

// Contextuales: el flujo que probablemente quieras mostrar en esa pantalla puntual.
const CONTEXTUALES_DUENO: { prefix: string; acciones: Accion[] }[] = [
  {
    prefix: "/panel/planes",
    acciones: [
      { label: "Crear plan random", run: demoCrearPlan },
      { label: "Crear plan con descuento", run: demoCrearPlanConDescuento },
    ],
  },
  {
    prefix: "/panel/clientes",
    acciones: [
      { label: "Alta cliente random", run: demoAltaCliente },
      { label: "Generar rutina a un cliente", run: demoGenerarRutinaCliente },
      { label: "Registrar pago random", run: demoRegistrarPago },
    ],
  },
  {
    prefix: "/panel/mensajes",
    acciones: [{ label: "Enviar aviso masivo (notificación)", run: demoEnviarAviso }],
  },
  {
    prefix: "/panel/ingresos",
    acciones: [{ label: "Registrar pago random", run: demoRegistrarPago }],
  },
  {
    prefix: "/panel/asistencia",
    acciones: [{ label: "Simular check-in", run: demoCheckin }],
  },
  {
    prefix: "/checkin",
    acciones: [{ label: "Salir del check-in sin PIN (soporte)", run: salirCheckinSoporte }],
  },
];

const ACCIONES_SOCIO: { prefix: string; acciones: Accion[] }[] = [
  {
    prefix: "/mi/rutina",
    acciones: [
      { label: "Generar mi rutina", run: demoGenerarMiRutina },
      { label: "Cargar progreso de hoy", run: demoRegistrarProgreso },
    ],
  },
];
const GENERALES_SOCIO: Accion[] = [
  { label: "Generar mi rutina", run: demoGenerarMiRutina },
  { label: "Cargar progreso de hoy", run: demoRegistrarProgreso },
];

function dedupe(lista: Accion[]): Accion[] {
  const vistos = new Set<string>();
  return lista.filter((a) => (vistos.has(a.label) ? false : (vistos.add(a.label), true)));
}

export function DemoToolbar({
  rol,
  habilitado,
}: {
  rol: "dueno" | "socio";
  /** Solo el superadmin (real o impersonando) puede ver el modo demo. */
  habilitado: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "1" || !habilitado) return null;

  const contextuales =
    rol === "dueno"
      ? CONTEXTUALES_DUENO.filter((c) => pathname?.startsWith(c.prefix)).flatMap((c) => c.acciones)
      : ACCIONES_SOCIO.filter((c) => pathname?.startsWith(c.prefix)).flatMap((c) => c.acciones);
  const generales = dedupe(rol === "dueno" ? GENERALES_DUENO : GENERALES_SOCIO);

  function ejecutar(accion: Accion) {
    hapticoSeleccion();
    startTransition(async () => {
      const res = await accion.run();
      if (res.error) {
        hapticoError();
        setMensaje({ texto: res.error, error: true });
      } else {
        hapticoExito();
        setMensaje({ texto: res.ok ?? "Listo.", error: false });
        // revalidatePath en la action marca la ruta como stale server-side,
        // pero no empuja el cambio a la página ya montada — sin esto había
        // que navegar y volver para ver el pago/alta/etc. recién creado.
        router.refresh();
      }
      setTimeout(() => setMensaje(null), 4000);
    });
  }

  return (
    <div className="fixed bottom-24 right-4 md:bottom-6 z-40 flex flex-col items-end gap-2">
      {mensaje ? (
        <div
          className={`max-w-[220px] rounded-[10px] border px-3 py-2 text-xs shadow-lg ${
            mensaje.error
              ? "border-danger bg-danger/10 text-danger"
              : "border-volt bg-volt/10 text-ink"
          }`}
        >
          {mensaje.texto}
        </div>
      ) : null}

      {abierto ? (
        <div className="w-64 rounded-[14px] border border-emerald-500/30 bg-zinc-950 p-3 shadow-xl">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-emerald-400">
            Modo Demo
          </p>

          {contextuales.length > 0 ? (
            <>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-white/40">
                Para esta pantalla
              </p>
              <div className="mb-2.5 flex flex-col gap-1.5">
                {contextuales.map((accion) => (
                  <Button
                    key={`ctx-${accion.label}`}
                    variant="ghost"
                    className="h-9 w-full justify-start border-emerald-500/30 bg-emerald-500/5 text-xs text-white hover:bg-emerald-500/15"
                    disabled={pending}
                    onClick={() => ejecutar(accion)}
                  >
                    {pending ? <Spinner /> : null}
                    {accion.label}
                  </Button>
                ))}
              </div>
            </>
          ) : null}

          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-white/40">
            Generales
          </p>
          <div className="flex flex-col gap-1.5">
            {generales.map((accion) => (
              <Button
                key={`gen-${accion.label}`}
                variant="ghost"
                className="h-9 w-full justify-start border-white/10 text-xs text-white hover:bg-white/10"
                disabled={pending}
                onClick={() => ejecutar(accion)}
              >
                {pending ? <Spinner /> : null}
                {accion.label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex size-12 items-center justify-center rounded-full border border-emerald-500/40 bg-zinc-950 text-lg shadow-xl active:scale-95 transition-transform"
        aria-label="Modo Demo"
      >
        🐙
      </button>
    </div>
  );
}
