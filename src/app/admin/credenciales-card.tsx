"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Check, KeyRound, UserCheck, ShieldCheck, ArrowUpRight } from "lucide-react";
import { hapticoSeleccion } from "@/lib/ui/hapticos";

export function CredencialesCard() {
  const [copiadoKey, setCopiadoKey] = useState<string | null>(null);

  const copiar = async (texto: string, claveId: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      hapticoSeleccion();
      setCopiadoKey(claveId);
      setTimeout(() => {
        setCopiadoKey((prev) => (prev === claveId ? null : prev));
      }, 2000);
    } catch {
      // Fallback si no hay clipboard api
    }
  };

  return (
    <div className="card-cut rounded-[18px] border border-rule/80 bg-paper-2/90 p-5 shadow-sm backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule/70 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-[10px] bg-ink text-paper">
            <KeyRound className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-ink">
              Credenciales de Prueba (Testing)
            </h2>
            <p className="text-xs text-ink-soft">
              Datos precargados para testear autenticación y login manual
            </p>
          </div>
        </div>

        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 rounded-full border border-rule/80 bg-paper px-3 py-1 text-xs font-medium text-ink transition-colors hover:bg-paper-2 hover:border-ink"
        >
          <span>Ir al Login Manual</span>
          <ArrowUpRight className="size-3.5 text-ink-soft" />
        </Link>
      </div>

      {/* Gimnasio común */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-rule/60 bg-paper/60 px-3.5 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            Gimnasio:
          </span>
          <code className="rounded bg-paper-2 px-2 py-0.5 font-mono text-sm font-bold text-ink">
            sante
          </code>
        </div>
        <button
          type="button"
          onClick={() => copiar("sante", "gym-slug")}
          className="inline-flex items-center gap-1.5 rounded-[8px] border border-rule/80 bg-paper px-2.5 py-1 text-xs font-medium text-ink hover:bg-paper-2 active:scale-95"
          title="Copiar slug"
        >
          {copiadoKey === "gym-slug" ? (
            <>
              <Check className="size-3 text-ok" />
              <span className="text-ok font-semibold">Copiado</span>
            </>
          ) : (
            <>
              <Copy className="size-3 text-ink-soft" />
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>

      {/* Columnas Dueño y Socio */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {/* DUEÑO */}
        <div className="flex flex-col justify-between rounded-[14px] border border-rule/70 bg-paper/70 p-3.5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-volt/25 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-volt-ink">
                <ShieldCheck className="size-3" />
                Rol Dueño
              </span>
              <span className="text-[11px] text-ink-soft">Destino: /panel</span>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2 rounded-[8px] bg-paper-2/60 px-2.5 py-1.5">
                <span className="text-ink-soft">DNI:</span>
                <div className="flex items-center gap-2">
                  <code className="font-mono font-bold text-ink">12345678</code>
                  <button
                    type="button"
                    onClick={() => copiar("12345678", "dueno-dni")}
                    className="text-ink-soft hover:text-ink active:scale-90"
                    title="Copiar DNI"
                  >
                    {copiadoKey === "dueno-dni" ? (
                      <Check className="size-3.5 text-ok" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-[8px] bg-paper-2/60 px-2.5 py-1.5">
                <span className="text-ink-soft">Clave:</span>
                <div className="flex items-center gap-2">
                  <code className="font-mono font-bold text-ink">admin123</code>
                  <button
                    type="button"
                    onClick={() => copiar("admin123", "dueno-clave")}
                    className="text-ink-soft hover:text-ink active:scale-90"
                    title="Copiar contraseña"
                  >
                    {copiadoKey === "dueno-clave" ? (
                      <Check className="size-3.5 text-ok" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 text-[11px] text-ink-soft border-t border-rule/50">
            Administra caja, socios, rutinas y ajustes de planes.
          </div>
        </div>

        {/* SOCIO */}
        <div className="flex flex-col justify-between rounded-[14px] border border-rule/70 bg-paper/70 p-3.5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                <UserCheck className="size-3" />
                Rol Cliente / Socio
              </span>
              <span className="text-[11px] text-ink-soft">Destino: /mi</span>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2 rounded-[8px] bg-paper-2/60 px-2.5 py-1.5">
                <span className="text-ink-soft">DNI:</span>
                <div className="flex items-center gap-2">
                  <code className="font-mono font-bold text-ink">20000000</code>
                  <button
                    type="button"
                    onClick={() => copiar("20000000", "socio-dni")}
                    className="text-ink-soft hover:text-ink active:scale-90"
                    title="Copiar DNI"
                  >
                    {copiadoKey === "socio-dni" ? (
                      <Check className="size-3.5 text-ok" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-[8px] bg-paper-2/60 px-2.5 py-1.5">
                <span className="text-ink-soft">Clave:</span>
                <div className="flex items-center gap-2">
                  <code className="font-mono font-bold text-ink">gym2000</code>
                  <button
                    type="button"
                    onClick={() => copiar("gym2000", "socio-clave")}
                    className="text-ink-soft hover:text-ink active:scale-90"
                    title="Copiar contraseña"
                  >
                    {copiadoKey === "socio-clave" ? (
                      <Check className="size-3.5 text-ok" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 text-[11px] text-ink-soft border-t border-rule/50">
            Vista móvil con carnet virtual, cuota y rutinas de ejercicio.
          </div>
        </div>
      </div>
    </div>
  );
}
