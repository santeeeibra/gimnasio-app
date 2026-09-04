"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { verificarPinIngresos, resetearPinConContrasena } from "./configurar-pin/actions";
import { Button, linkClasses } from "@/components/ui";
import { useRouter } from "next/navigation";
import { Lock, KeyRound, ChevronLeft } from "lucide-react";

export function VerificarPinModal() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [abierto, setAbierto] = useState(true);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [verificando, setVerificando] = useState(false);
  
  // Estado para recuperación
  const [mostrarRecuperar, setMostrarRecuperar] = useState(false);
  const [contrasena, setContrasena] = useState("");
  const [reseteando, setReseteando] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Verificar si ya está verificado en esta sesión
  useEffect(() => {
    const verificado = sessionStorage.getItem("pin_ingresos_verificado");
    if (verificado === "true") {
      setAbierto(false);
    }
  }, []);

  // Bloquear scroll de fondo mientras el modal esté activo
  useEffect(() => {
    if (!abierto) return;
    const scrollOrig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = scrollOrig;
    };
  }, [abierto]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setVerificando(true);

    const correcto = await verificarPinIngresos(pin);

    if (correcto) {
      sessionStorage.setItem("pin_ingresos_verificado", "true");
      setAbierto(false);
    } else {
      setError("PIN incorrecto");
      setPin("");
    }
    setVerificando(false);
  };

  const handleRecuperar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setReseteando(true);

    const reseteado = await resetearPinConContrasena(contrasena);

    if (reseteado) {
      // PIN reseteado, redirigir a configurar nuevo PIN
      router.push("/panel/ingresos/configurar-pin");
      router.refresh();
    } else {
      setError("Contraseña incorrecta");
      setContrasena("");
    }
    setReseteando(false);
  };

  if (!mounted || !abierto) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[color:var(--scrim)] p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-[16px] border border-rule bg-paper p-6 shadow-2xl animate-scale-in">
        {!mostrarRecuperar ? (
          <>
            <div className="mb-4 inline-flex size-11 items-center justify-center rounded-[10px] border border-rule bg-paper-2 text-accent">
              <Lock className="size-5" />
            </div>
            <h2 className="text-xl font-display font-bold text-ink mb-1.5">Ingresá tu PIN</h2>
            <p className="text-sm text-ink-soft mb-5 leading-snug">
              Necesitás ingresar tu PIN de seguridad para ver los ingresos del gimnasio.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="\d{4,6}"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="PIN"
                  className="w-full h-12 px-3 rounded-[10px] border border-rule bg-paper-2 text-xl font-bold text-center tracking-[0.3em] outline-none transition-all duration-150 [transition-timing-function:var(--ease-out)] focus:border-ink focus:ring-2 focus:ring-ink/20"
                  autoComplete="off"
                  autoFocus
                  required
                />
                {error && (
                  <p className="text-sm font-medium text-danger mt-2 animate-shake">{error}</p>
                )}
              </div>

              <Button type="submit" disabled={verificando} className="w-full h-11 rounded-[10px] font-bold">
                {verificando ? "Verificando…" : "Ingresar"}
              </Button>

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => setMostrarRecuperar(true)}
                  className={`w-full py-1 text-sm text-center ${linkClasses.plano}`}
                >
                  Olvidé mi PIN
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/panel")}
                  className={`w-full py-1 text-sm text-center ${linkClasses.plano}`}
                >
                  ← Volver al panel
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <button
              onClick={() => {
                setMostrarRecuperar(false);
                setContrasena("");
                setError("");
              }}
              className="inline-flex items-center gap-1 mb-3 text-sm text-ink-soft hover:text-ink transition-colors"
            >
              <ChevronLeft className="size-4" />
              Volver
            </button>
            <div className="mb-4 inline-flex size-11 items-center justify-center rounded-[10px] border border-rule bg-paper-2 text-accent">
              <KeyRound className="size-5" />
            </div>
            <h2 className="text-xl font-display font-bold text-ink mb-1.5">Recuperar PIN</h2>
            <p className="text-sm text-ink-soft mb-5 leading-snug">
              Ingresá tu contraseña de cuenta para resetear el PIN. Luego podrás configurar uno nuevo.
            </p>

            <form onSubmit={handleRecuperar} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  placeholder="Contraseña de tu cuenta"
                  className="w-full h-12 px-3.5 rounded-[10px] border border-rule bg-paper-2 text-base outline-none transition-all duration-150 [transition-timing-function:var(--ease-out)] focus:border-ink focus:ring-2 focus:ring-ink/20"
                  autoComplete="current-password"
                  autoFocus
                  required
                />
                {error && (
                  <p className="text-sm font-medium text-danger mt-2 animate-shake">{error}</p>
                )}
              </div>

              <Button type="submit" disabled={reseteando} className="w-full h-11 rounded-[10px] font-bold">
                {reseteando ? "Reseteando…" : "Resetear PIN"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
