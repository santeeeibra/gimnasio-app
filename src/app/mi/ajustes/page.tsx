import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseTema, type TemaPersonalizado } from "@/lib/tema";
import { AjustesSocioForm } from "./ajustes-socio-form";
import { VozGuiadaToggle } from "@/components/rutinas/voz-guiada-toggle";
import { pillClasses } from "@/components/ui";
import { ChevronLeft } from "lucide-react";
import { impersonacionActiva } from "@/lib/impersonation";
import { ToggleOcultarControlesImpersonacion } from "@/components/impersonation/toggle-ocultar";

export const dynamic = "force-dynamic";

export default async function MiAjustesPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const imp = await impersonacionActiva();

  const [{ data: gym }, cliRes] = await Promise.all([
    supabase
      .from("gimnasios")
      .select("nombre, tema")
      .eq("id", profile.gimnasio_id)
      .single(),
    supabase
      .from("clientes")
      .select("tema_personalizado")
      .eq("profile_id", profile.id)
      .maybeSingle(),
  ]);

  let cli = cliRes.data;
  if (cliRes.error && (cliRes.error as { code?: string }).code === "42703") {
    cli = null;
  }

  const temaGym = parseTema(gym?.tema);
  const temaPersonalizado = (cli?.tema_personalizado as TemaPersonalizado) ?? null;

  return (
    <main className="stagger max-w-md mx-auto min-h-full p-6 pb-24 space-y-6">
      <div>
        <Link href="/mi" className={`${pillClasses.neutra} mb-3`}>
          <ChevronLeft aria-hidden strokeWidth={2} className="size-4 shrink-0" />
          Volver a inicio
        </Link>
        <h1 className="text-2xl font-display font-semibold text-ink">
          Personalizar color
        </h1>
        <p className="text-sm text-ink-soft mt-1">
          Elegí tu color de acento favorito para botones y destacados en tu
          app. Solo lo vas a ver vos.
        </p>
      </div>

      <AjustesSocioForm
        temaGym={temaGym}
        temaPersonalizado={temaPersonalizado}
      />

      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-ink-soft mb-2">
          Entrenamiento
        </h2>
        <VozGuiadaToggle />
      </div>

      {/* No es un ajuste del socio, es una herramienta de soporte del
          superadmin — separada visualmente para que no se confunda con
          una preferencia real de la cuenta. */}
      {imp ? (
        <div className="rounded-[12px] border border-dashed border-rule bg-paper px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-ink-soft">Modo soporte (solo vos)</p>
            <p className="text-[11px] text-ink-soft/80 mt-0.5">
              Esto no lo ve el socio real.
            </p>
          </div>
          <ToggleOcultarControlesImpersonacion />
        </div>
      ) : null}
    </main>
  );
}
