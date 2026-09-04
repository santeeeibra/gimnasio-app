import Link from "next/link";
import { requireDueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Panel, pillClasses } from "@/components/ui";
import { ChevronLeft } from "lucide-react";
import { ConfigurarPinForm } from "../configurar-pin-form";
import { RecuperarPinForm } from "../recuperar-pin-form";

export default async function ConfigurarPinPage() {
  const dueno = await requireDueno();
  const supabase = await createClient();

  const { data: gym } = await supabase
    .from("gimnasios")
    .select("pin_ingresos")
    .eq("id", dueno.gimnasio_id)
    .single();

  const tienePinActual = !!gym?.pin_ingresos;

  return (
    <div>
      <Link href="/panel/ingresos" className={pillClasses.neutra}>
        <ChevronLeft aria-hidden strokeWidth={2} className="size-4" />
        Volver a Ingresos
      </Link>
      <h1 className="text-2xl mt-2 mb-6">
        {tienePinActual ? "Cambiar PIN de Ingresos" : "Configurar PIN de Ingresos"}
      </h1>

      <Panel className="p-5">
        <p className="text-sm text-ink-soft mb-4">
          {tienePinActual
            ? "Ingresá tu PIN actual y elegí uno nuevo para proteger la sección de ingresos."
            : "Elegí un PIN de 4 a 6 dígitos para proteger la sección de ingresos. Solo vos podrás ver los pagos y totales mensuales."}
        </p>
        <ConfigurarPinForm tienePinActual={tienePinActual} />
        
        {tienePinActual && (
          <>
            <hr className="my-6 border-rule" />
            <RecuperarPinForm />
          </>
        )}
      </Panel>
    </div>
  );
}
