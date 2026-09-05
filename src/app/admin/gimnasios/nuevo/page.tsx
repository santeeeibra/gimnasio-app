import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { linkClasses } from "@/components/ui";
import { AltaGymForm } from "./alta-gym-form";
import { ArrowLeft, Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NuevoGimnasioPage() {
  await requireSuperadmin();
  const db = createAdminClient();

  const { data: planes } = await db
    .from("planes_plataforma")
    .select("id, nombre, max_socios")
    .order("precio_mensual", { ascending: true });

  return (
    <main className="mx-auto max-w-lg p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Link href="/admin/gimnasios" className={`inline-flex items-center gap-1 text-xs ${linkClasses.inline}`}>
          <ArrowLeft className="size-3.5" />
          <span>Gimnasios</span>
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
          <Building2 className="size-5" />
          Nuevo Gimnasio
        </h1>
        <p className="text-xs text-ink-soft mt-1">
          Da de alta un gimnasio en segundos desde tu celular y copiale las credenciales al dueño por WhatsApp.
        </p>
      </div>

      <AltaGymForm planes={planes ?? []} />
    </main>
  );
}
