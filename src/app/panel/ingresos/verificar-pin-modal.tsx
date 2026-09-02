"use client";

import { useState, useEffect } from "react";
import { verificarPinIngresos } from "./actions";
import { Button, Field } from "@/components/ui";

export function VerificarPinModal() {
  const [abierto, setAbierto] = useState(true);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [verificando, setVerificando] = useState(false);

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

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 animate-fade-in">
      <div className="w-full max-w-sm mx-4 rounded-[8px] border border-rule bg-paper p-6 shadow-lg animate-slide-up">
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
        </form>
      </div>
    </div>
  );
}
