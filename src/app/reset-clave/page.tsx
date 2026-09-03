"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Field } from "@/components/ui";

type Estado = "cargando" | "listo" | "sin_sesion" | "guardando" | "ok";

export default function ResetClavePage() {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelado = false;

    // El link de recovery de Supabase deja la sesión en la URL; el cliente la
    // levanta solo (detectSessionInUrl). Le damos un par de intentos.
    async function chequear(intentos: number) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelado) return;
      if (session) {
        setEstado("listo");
      } else if (intentos > 0) {
        setTimeout(() => chequear(intentos - 1), 400);
      } else {
        setEstado("sin_sesion");
      }
    }
    chequear(4);

    return () => {
      cancelado = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const nueva = String(fd.get("nueva") ?? "");
    const repetir = String(fd.get("repetir") ?? "");

    if (nueva.length < 6) {
      setError("Usá al menos 6 caracteres.");
      return;
    }
    if (nueva !== repetir) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setEstado("guardando");
    const supabase = createClient();
    const { error: updErr } = await supabase.auth.updateUser({ password: nueva });
    if (updErr) {
      setEstado("listo");
      setError("No se pudo cambiar la contraseña. Probá con el enlace de nuevo.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ debe_cambiar_clave: false })
        .eq("id", user.id);
    }
    setEstado("ok");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-paper">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-display mb-1">Nueva contraseña</h1>

        {estado === "cargando" ? (
          <p className="text-sm text-ink-soft mt-4">Verificando el enlace…</p>
        ) : null}

        {estado === "sin_sesion" ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-danger">
              El enlace no es válido o ya venció. Pedí uno nuevo desde “Olvidé mi
              contraseña”.
            </p>
            <a
              href="/login/olvide-clave"
              className="text-sm text-ink-soft underline underline-offset-2 hover:text-ink"
            >
              Pedir un enlace nuevo
            </a>
          </div>
        ) : null}

        {estado === "ok" ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-ok">
              Listo, tu contraseña quedó cambiada.
            </p>
            <a
              href="/login"
              className="inline-block text-sm font-medium underline underline-offset-2"
            >
              Ir a entrar
            </a>
          </div>
        ) : null}

        {estado === "listo" || estado === "guardando" ? (
          <form onSubmit={onSubmit} className="mt-4">
            <p className="text-sm text-ink-soft mb-4">
              Elegí una contraseña nueva para tu cuenta.
            </p>
            <div className="space-y-4">
              <Field
                label="Nueva contraseña"
                name="nueva"
                type="password"
                required
              />
              <Field label="Repetir" name="repetir" type="password" required />
            </div>
            {error ? (
              <p className="mt-4 text-sm text-danger">{error}</p>
            ) : null}
            <Button
              type="submit"
              className="w-full mt-6"
              loading={estado === "guardando"}
            >
              {estado === "guardando" ? "Guardando…" : "Guardar contraseña"}
            </Button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
