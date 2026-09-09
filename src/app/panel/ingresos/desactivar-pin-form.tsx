"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { desactivarPinIngresos } from "./configurar-pin/actions";
import { Button, Field, linkClasses } from "@/components/ui";
import { hapticoExito, hapticoError } from "@/lib/ui/hapticos";

export function DesactivarPinForm({
  tienePinActual,
}: {
  tienePinActual: boolean;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [cred, setCred] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const desactivar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEnviando(true);
    const ok = await desactivarPinIngresos(cred);
    setEnviando(false);
    if (ok) {
      hapticoExito();
      router.push("/panel/ingresos");
      router.refresh();
    } else {
      hapticoError();
      setError(
        tienePinActual
          ? "PIN o contraseña incorrectos."
          : "No se pudo desactivar. Probá de nuevo.",
      );
    }
  };

  if (!abierto) {
    return (
      <div>
        <p className="mb-3 text-sm text-ink-soft">
          ¿No querés proteger esta sección con PIN?
        </p>
        <button
          onClick={() => setAbierto(true)}
          className={`text-sm ${linkClasses.accion}`}
        >
          No quiero usar PIN en esta sección
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={desactivar} className="max-w-sm space-y-4">
      <button
        type="button"
        onClick={() => {
          setAbierto(false);
          setCred("");
          setError("");
        }}
        className={`text-sm ${linkClasses.accion}`}
      >
        ← Cancelar
      </button>
      <h3 className="text-lg">Desactivar PIN</h3>
      <p className="text-sm text-ink-soft">
        La sección de Ingresos va a quedar accesible sin PIN. Podés volver a
        activarlo cuando quieras.
      </p>

      {tienePinActual && (
        <Field
          label="PIN actual o contraseña de tu cuenta"
          name="cred"
          type="password"
          value={cred}
          onChange={(e) => setCred(e.target.value)}
          autoComplete="off"
          required
        />
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="danger" disabled={enviando}>
          {enviando ? "Desactivando…" : "Desactivar PIN"}
        </Button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </form>
  );
}
