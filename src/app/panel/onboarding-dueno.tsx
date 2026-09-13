"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Step {
  id: string;
  title: string;
  desc: string;
  href: string;
  cta: string;
}

const STEPS: Step[] = [
  {
    id: "planes",
    title: "1. Plan mensual de 30 días configurado",
    desc: "Ajustá tu precio general y descuentos para estudiantes o jubilados.",
    href: "/panel/planes",
    cta: "Ir a planes →",
  },
  {
    id: "socio",
    title: "2. Registrar a tu primer socio",
    desc: "Cargalo con su DNI para que pueda acceder y ver su rutina.",
    href: "/panel/clientes",
    cta: "Alta de socio →",
  },
  {
    id: "cobro",
    title: "3. Cobrar la primera cuota",
    desc: "Registrá el pago para dejar la cuota al día por 30 días corridos.",
    href: "/panel/clientes",
    cta: "Ver socios →",
  },
  {
    id: "checkin",
    title: "4. Probar la pantalla de Check-in",
    desc: "La pantalla de recepción para que los alumnos ingresen con su DNI.",
    href: "/checkin",
    cta: "Abrir check-in →",
  },
];

export function OnboardingDueno({
  tienePlanes,
  tieneSocios,
}: {
  tienePlanes: boolean;
  tieneSocios: boolean;
}) {
  const [completados, setCompletados] = useState<string[]>([]);
  const [oculto, setOculto] = useState<boolean>(true); // default true hasta hidratar
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
    try {
      const guardados = localStorage.getItem("onboarding_dueno_pasos");
      const estaOculto = localStorage.getItem("onboarding_dueno_oculto") === "true";
      setOculto(estaOculto);

      let iniciales = guardados ? JSON.parse(guardados) : [];
      // Auto-completar según el estado real del gym si no estaban marcados
      if (tienePlanes && !iniciales.includes("planes")) {
        iniciales = [...iniciales, "planes"];
      }
      if (tieneSocios && !iniciales.includes("socio")) {
        iniciales = [...iniciales, "socio"];
      }
      setCompletados(iniciales);
    } catch {
      setOculto(false);
    }
  }, [tienePlanes, tieneSocios]);

  if (!montado) return null;

  function togglePaso(id: string) {
    setCompletados((prev) => {
      const next = prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id];
      try {
        localStorage.setItem("onboarding_dueno_pasos", JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function toggleOcultar(valor: boolean) {
    setOculto(valor);
    try {
      localStorage.setItem("onboarding_dueno_oculto", String(valor));
    } catch {}
  }

  const cantidadCompletados = completados.length;
  const porcentaje = Math.round((cantidadCompletados / STEPS.length) * 100);

  if (oculto) {
    return (
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => toggleOcultar(false)}
          className="text-xs text-ink-soft hover:text-ink flex items-center gap-1.5 transition-colors"
        >
          <span>🚀</span>
          <span>Mostrar guía de inicio ({cantidadCompletados}/{STEPS.length})</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mb-8 card-cut card-cut-lg border border-rule-strong bg-paper-2 p-5 relative overflow-hidden">
      <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🚀</span>
            <h2 className="text-base font-bold text-ink">
              Guía rápida: Tu gimnasio en marcha
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-accent/15 text-accent font-semibold">
              {cantidadCompletados} de {STEPS.length} listos
            </span>
          </div>
          <p className="text-xs text-ink-soft mt-1">
            Los pasos fundamentales para dominar la app y operar tu día a día sin fricción.
          </p>
        </div>

        <button
          type="button"
          onClick={() => toggleOcultar(true)}
          className="text-xs text-ink-soft hover:text-ink px-2 py-1 rounded border border-rule transition-colors"
          title="Ocultar esta guía"
        >
          ✕ Ocultar
        </button>
      </div>

      {/* Barra de progreso */}
      <div className="w-full h-1.5 bg-paper-3 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${porcentaje}%` }}
        />
      </div>

      {/* Lista de pasos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {STEPS.map((s) => {
          const hecho = completados.includes(s.id);
          return (
            <div
              key={s.id}
              className={`p-3 rounded-[6px] border transition-colors flex items-center justify-between gap-3 ${
                hecho
                  ? "border-ok/25 bg-paper/40 opacity-75"
                  : "border-rule bg-paper"
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => togglePaso(s.id)}
                  className={`size-5 rounded border mt-0.5 grid place-items-center text-xs font-bold shrink-0 transition-colors ${
                    hecho
                      ? "bg-ok border-ok text-[#042417]"
                      : "border-rule-strong hover:border-ink"
                  }`}
                  aria-label={hecho ? "Marcar incompleto" : "Marcar completado"}
                >
                  {hecho ? "✓" : ""}
                </button>
                <div className="min-w-0">
                  <p
                    className={`text-xs font-semibold truncate ${
                      hecho ? "line-through text-ink-soft" : "text-ink"
                    }`}
                  >
                    {s.title}
                  </p>
                  <p className="text-[11px] text-ink-soft mt-0.5 line-clamp-1">
                    {s.desc}
                  </p>
                </div>
              </div>

              <Link
                href={s.href}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 h-11 rounded-[12px] border border-rule bg-paper-2 hover:bg-paper-3 hover:border-ink/40 text-ink transition-all shrink-0 active:scale-95"
              >
                {s.cta}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
