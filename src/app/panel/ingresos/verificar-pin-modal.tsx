"use client";

import { useState, useEffect } from "react";
import { verificarPinIngresos, resetearPinConContrasena } from "./configurar-pin/actions";
import { Button } from "@/components/ui";
import { useRouter } from "next/navigation";

export function VerificarPinModal() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(true);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [verificando, setVerificando] = useState(false);
  
  // Estado para recuperación
  const [mostrarRecuperar, setMostrarRecuperar] = useState(false);
  const [contrasena, setContrasena] = useState("");
  const [reseteando, setReseteando] = useState(false);

  // Verificar si ya está verificado en esta sesión
  useEffect(() => {
    const verificado = sessionStorage.getItem("pin_ingresos_verificado");
    if (verificado === "true") {
      setAbierto(false);
    }
  }, []);

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

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 animate-fade-in">
      <div className="w-full max-w-sm mx-4 rounded-[8px] border border-rule bg-paper p-6 shadow-lg animate-slide-up">
        {!mostrarRecuperar ? (
          <>
            <h2 className="text-xl mb-2">Ingresá tu PIN</h2>
            <p className="text-sm text-ink-soft mb-4">
              Necesitás ingresar tu PIN para ver los ingresos.
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
                  className="w-full h-11 px-3 rounded-[5px] border border-rule bg-paper-2 text-[16px] text-center tracking-widest outline-none transition-[border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] focus:border-ink focus:shadow-[0_0_0_3px_rgb(22_24_29_/_0.08)]"
                  autoComplete="off"
                  autoFocus
                  required
                />
                {error && (
                  <p className="text-sm text-danger mt-1.5">{error}</p>
                )}
              </div>

              <Button type="submit" disabled={verificando} className="w-full">
                {verificando ? "Verificando…" : "Ingresar"}
              </Button>

              <button
                type="button"
                onClick={() => setMostrarRecuperar(true)}
                className="w-full text-sm text-ink-soft underline underline-offset-2 hover:text-ink transition-colors"
              >
                Olvidé mi PIN
              </button>
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
              className="text-sm text-ink-soft underline underline-offset-2 mb-2"
            >
              ← Volver
            </button>
            <h2 className="text-xl mb-2">Recuperar PIN</h2>
            <p className="text-sm text-ink-soft mb-4">
              Ingresá tu contraseña de cuenta para resetear el PIN. Luego podrás configurar uno nuevo.
            </p>

            <form onSubmit={handleRecuperar} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  placeholder="Contraseña de tu cuenta"
                  className="w-full h-11 px-3 rounded-[5px] border border-rule bg-paper-2 text-[16px] outline-none transition-[border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] focus:border-ink focus:shadow-[0_0_0_3px_rgb(22_24_29_/_0.08)]"
                  autoComplete="current-password"
                  autoFocus
                  required
                />
                {error && (
                  <p className="text-sm text-danger mt-1.5">{error}</p>
                )}
              </div>

              <Button type="submit" disabled={reseteando} className="w-full">
                {reseteando ? "Reseteando…" : "Resetear PIN"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
