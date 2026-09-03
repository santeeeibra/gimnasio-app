"use client";

import { useState } from "react";
import { resetearPinConContrasena } from "./configurar-pin/actions";
import { Button, Field, linkClasses } from "@/components/ui";
import { useRouter } from "next/navigation";

export function RecuperarPinForm() {
  const router = useRouter();
  const [mostrar, setMostrar] = useState(false);
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [reseteando, setReseteando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setReseteando(true);

    const reseteado = await resetearPinConContrasena(contrasena);

    if (reseteado) {
      // Recargar la página para que muestre el formulario de configuración
      router.refresh();
    } else {
      setError("Contraseña incorrecta");
      setContrasena("");
    }
    setReseteando(false);
  };

  if (!mostrar) {
    return (
      <div>
        <p className="text-sm text-ink-soft mb-3">
          ¿Olvidaste tu PIN actual?
        </p>
        <button
          onClick={() => setMostrar(true)}
          className={`text-sm ${linkClasses.accion}`}
        >
          Resetear PIN con contraseña de cuenta
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => {
          setMostrar(false);
          setContrasena("");
          setError("");
        }}
        className={`mb-3 text-sm ${linkClasses.accion}`}
      >
        ← Cancelar
      </button>
      <h3 className="text-lg mb-2">Resetear PIN</h3>
      <p className="text-sm text-ink-soft mb-4">
        Ingresá tu contraseña de cuenta para borrar el PIN actual. Luego podrás configurar uno nuevo sin necesidad del PIN anterior.
      </p>

      <form onSubmit={handleSubmit} className="max-w-sm space-y-4">
        <Field
          label="Contraseña de tu cuenta"
          name="contrasena"
          type="password"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          autoComplete="current-password"
          required
        />

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={reseteando}>
            {reseteando ? "Reseteando…" : "Resetear PIN"}
          </Button>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      </form>
    </div>
  );
}
