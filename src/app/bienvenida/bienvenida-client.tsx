"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { hapticoImpactoSuave, hapticoExito } from "@/lib/ui/hapticos";
import { confirmarMantenerClave } from "./actions";

export function BienvenidaClient({
  nombreDueno,
  nombreGym,
  slug,
  dni,
  claveDefault,
}: {
  nombreDueno: string;
  nombreGym: string;
  slug: string;
  dni: string;
  claveDefault: string;
}) {
  const router = useRouter();
  const [mostrarDatos, setMostrarDatos] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function elegirDejarClave() {
    hapticoImpactoSuave();
    setGuardando(true);
    setError(null);
    const res = await confirmarMantenerClave();
    setGuardando(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    hapticoExito();
    setMostrarDatos(true);
  }

  function irACambiarClave() {
    hapticoImpactoSuave();
    router.push("/cambiar-clave");
  }

  async function copiarDatos() {
    const texto = `Gimnasio: ${slug}\nDNI: ${dni}\nContraseña: ${claveDefault}`;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // si el navegador bloquea el clipboard no pasa nada, el usuario ya lo ve en pantalla
    }
  }

  function continuar() {
    hapticoImpactoSuave();
    router.push("/panel");
  }

  if (mostrarDatos) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-paper">
        <div className="w-full max-w-sm card-cut card-cut-lg border border-rule bg-paper-2 p-6">
          <h1 className="text-xl mb-1">Guardá estos datos</h1>
          <p className="text-sm text-ink-soft mb-5">
            Vas a entrar siempre con esta contraseña. Anotala o copiala antes
            de seguir — después no la vamos a poder mostrar de nuevo.
          </p>

          <dl className="space-y-3 mb-5">
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-soft">
                Gimnasio
              </dt>
              <dd className="text-base font-medium">{nombreGym || slug}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-soft">
                DNI
              </dt>
              <dd className="text-base font-medium">{dni}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-soft">
                Contraseña
              </dt>
              <dd className="text-lg font-mono font-semibold tracking-wide">
                {claveDefault}
              </dd>
            </div>
          </dl>

          <Button variant="ghost" className="w-full mb-3" onClick={copiarDatos}>
            {copiado ? "✓ Copiado" : "Copiar datos"}
          </Button>
          <Button variant="volt" className="w-full" onClick={continuar}>
            Ya los anoté, continuar
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-paper">
      <div className="w-full max-w-sm card-cut card-cut-lg border border-rule bg-paper-2 p-6">
        <h1 className="text-xl mb-1">¡Bienvenido, {nombreDueno}!</h1>
        <p className="text-sm text-ink-soft mb-6">
          Entraste con la contraseña que te dieron. ¿Querés cambiarla ahora o
          dejarla como está?
        </p>

        <div className="space-y-3">
          <Button className="w-full" onClick={irACambiarClave}>
            Cambiar mi contraseña ahora
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={elegirDejarClave}
            loading={guardando}
          >
            Dejar la que tengo
          </Button>
        </div>

        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      </div>
    </main>
  );
}
