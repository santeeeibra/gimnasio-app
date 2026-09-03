import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { linkClasses } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import type {
  Enfasis,
  Nivel,
  Objetivo,
  PreferenciaEquipo,
  Sexo,
} from "@/lib/rutina/tipos";
import { generarMiRutinaAvanzada } from "../actions";
import {
  GenerarRutinaForm,
  type AvanzadoDefaults,
} from "../generar-form";

export const dynamic = "force-dynamic";

type Prefs = {
  equipo?: PreferenciaEquipo;
  sexo?: Sexo;
  enfasis?: Enfasis[];
  avanzado?: AvanzadoDefaults | null;
} | null;

export default async function RutinaAvanzadaPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, sexo")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const clienteSexo = (cliente?.sexo as Sexo | null) ?? null;

  const { data: rutina } = cliente
    ? await supabase
        .from("rutinas")
        .select("objetivo, nivel, dias_por_semana, preferencias")
        .eq("cliente_id", cliente.id)
        .maybeSingle()
    : { data: null };

  const prefs = (rutina?.preferencias as Prefs) ?? null;

  return (
    <main className="stagger max-w-md mx-auto px-5 py-6 space-y-6">
      <div>
        <Link
          href="/mi/rutina"
          className={`text-sm ${linkClasses.accion}`}
        >
          ← Volver a tu rutina
        </Link>
        <h1 className="mt-2 text-2xl">Modo avanzado</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Afiná la generación: estructura, repeticiones, volumen, esfuerzo y
          técnicas. Cada opción explica de dónde sale. Los ajustes finos solo se
          aplican si elegís nivel <strong>Avanzado</strong>.
        </p>
      </div>

      <GenerarRutinaForm
        action={generarMiRutinaAvanzada}
        mostrarAvanzado
        tieneRutina={!!rutina}
        defaults={{
          objetivo: (rutina?.objetivo as Objetivo) ?? undefined,
          nivel: (rutina?.nivel as Nivel) ?? "avanzado",
          dias: rutina?.dias_por_semana ?? undefined,
          preferencia: prefs?.equipo ?? undefined,
          sexo: prefs?.sexo ?? undefined,
          enfasis: prefs?.enfasis ?? undefined,
        }}
        clienteSexo={clienteSexo}
        avanzadoDefaults={prefs?.avanzado ?? undefined}
      />
    </main>
  );
}
