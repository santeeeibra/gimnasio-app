import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { guardarPesoCliente, obtenerPesosCliente } from "@/lib/peso/actions";
import { CardPeso } from "@/components/peso/card-peso";
import { pillClasses } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function MiPesoPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: cliente, error } = await supabase
    .from("clientes")
    .select("id")
    .eq("profile_id", profile.id)
    .eq("gimnasio_id", profile.gimnasio_id)
    .maybeSingle();

  // Un fallo de conexión debe ir al error boundary, nunca mostrarse como
  // una cuenta sin ficha ni como historial vacío.
  if (error) throw new Error("No se pudo cargar tu ficha de peso.");

  return (
    <main className="stagger mx-auto max-w-md space-y-6 p-6 pb-24">
      <Link href={profile.rol === "dueno" ? "/panel" : "/mi"} className={pillClasses.neutra}>
        <ChevronLeft aria-hidden className="size-4 shrink-0" />
        Volver al inicio
      </Link>
      <div className="space-y-1">
        <h1 className="font-display text-xl font-bold text-ink">Mi peso</h1>
        <p className="text-sm text-ink-soft">Registrá tu peso corporal y seguí tu evolución.</p>
      </div>
      {cliente ? (
        <CardPeso
          clienteId={cliente.id}
          creadoPor="cliente"
          action={guardarPesoCliente}
          fetchRegistros={obtenerPesosCliente}
        />
      ) : (
        <p role="status" className="text-sm text-ink-soft">
          No encontramos tu ficha de entrenamiento. Contactá a soporte para completar tu cuenta.
        </p>
      )}
    </main>
  );
}
