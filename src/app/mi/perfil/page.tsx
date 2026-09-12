import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CardPeso } from "@/components/peso/card-peso";
import { guardarPesoCliente, obtenerPesosCliente } from "@/lib/peso/actions";
import { linkClasses, pillClasses } from "@/components/ui";
import { User, Dumbbell, ShieldCheck, Calendar, Phone, Mail, IdCard } from "lucide-react";
import { ArchivosSeccion } from "@/components/archivos/archivos-seccion";

export const dynamic = "force-dynamic";

export default async function MiPerfilPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: cliente }, { data: gym }] = await Promise.all([
    supabase
      .from("clientes")
      .select(
        "id, email, sexo, foto_url, creado_at, estado_cuota, fecha_vencimiento, plan:planes(nombre, duracion_dias)"
      )
      .eq("profile_id", profile.id)
      .maybeSingle(),
    supabase
      .from("gimnasios")
      .select("nombre, slug")
      .eq("id", profile.gimnasio_id)
      .single(),
  ]);

  const c = cliente as any;
  const fechaAlta = c?.creado_at
    ? new Date(c.creado_at).toLocaleDateString("es-AR", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <main className="stagger max-w-md mx-auto min-h-full p-6 pb-24 space-y-6">
      {/* Breadcrumb / Volver */}
      <Link href="/mi" className={`text-sm ${linkClasses.inline}`}>
        ← Volver al inicio
      </Link>

      {/* Cabecera del perfil */}
      <div className="card-cut border border-rule bg-paper-2 p-5 flex items-center gap-4">
        <div className="relative size-16 shrink-0 rounded-full border-2 border-rule bg-paper-3 overflow-hidden grid place-items-center text-xl font-bold text-ink-soft">
          {c?.foto_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.foto_url}
              alt={`Foto de ${profile.nombre}`}
              className="size-full object-cover"
            />
          ) : (
            <span>
              {profile.nombre
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((p: string) => p[0])
                .join("")
                .toUpperCase() || "👤"}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-ink truncate leading-tight">
            {profile.nombre}
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            DNI {profile.dni} · {gym?.nombre ?? "Gimnasio"}
          </p>
          {fechaAlta && (
            <p className="text-[11px] text-ink-soft/70 mt-1 flex items-center gap-1">
              <Calendar className="size-3" /> Socio desde {fechaAlta}
            </p>
          )}
        </div>
      </div>

      {/* ── SECCIÓN 1: Peso corporal (Dial horizontal de regla + historial) ── */}
      {c?.id && (
        <CardPeso
          clienteId={c.id}
          creadoPor="cliente"
          action={guardarPesoCliente}
          fetchRegistros={obtenerPesosCliente}
        />
      )}

      {/* ── SECCIÓN 2: Datos de Contacto y Cuenta ── */}
      <div className="card-cut border border-rule bg-paper-2 p-5 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-ink-soft">
          Datos de la cuenta
        </h2>

        <ul className="divide-y divide-rule text-xs">
          <li className="py-2.5 flex items-center justify-between">
            <span className="text-ink-soft flex items-center gap-2">
              <IdCard className="size-3.5 text-ink-soft" /> DNI
            </span>
            <span className="font-mono text-ink">{profile.dni}</span>
          </li>

          {profile.telefono && (
            <li className="py-2.5 flex items-center justify-between">
              <span className="text-ink-soft flex items-center gap-2">
                <Phone className="size-3.5 text-ink-soft" /> Teléfono
              </span>
              <span className="text-ink">{profile.telefono}</span>
            </li>
          )}

          {c?.email && (
            <li className="py-2.5 flex items-center justify-between">
              <span className="text-ink-soft flex items-center gap-2">
                <Mail className="size-3.5 text-ink-soft" /> Email
              </span>
              <span className="text-ink">{c.email}</span>
            </li>
          )}

          {c?.sexo && (
            <li className="py-2.5 flex items-center justify-between">
              <span className="text-ink-soft flex items-center gap-2">
                <User className="size-3.5 text-ink-soft" /> Sexo
              </span>
              <span className="capitalize text-ink">{c.sexo}</span>
            </li>
          )}

          <li className="py-2.5 flex items-center justify-between">
            <span className="text-ink-soft flex items-center gap-2">
              <Dumbbell className="size-3.5 text-ink-soft" /> Plan actual
            </span>
            <span className="font-semibold text-ink">
              {c?.plan?.nombre ?? "Sin plan asignado"}
            </span>
          </li>
        </ul>
      </div>

      {/* ── SECCIÓN 2.5: Mis archivos (apto médico, dieta, etc.) ── */}
      {c?.id && (
        <div className="card-cut border border-rule bg-paper-2 p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-ink-soft">
            Mis archivos
          </h2>
          <ArchivosSeccion clienteId={c.id} />
        </div>
      )}

      {/* ── SECCIÓN 3: Preferencias y Seguridad ── */}
      <div className="flex flex-col gap-2">
        <Link
          href="/mi/ajustes"
          className="card-cut border border-rule bg-paper-2 p-4 flex items-center justify-between text-xs font-medium text-ink hover:bg-paper transition-colors"
        >
          <span>Personalizar tema visual de la app</span>
          <span className="text-ink-soft">→</span>
        </Link>
        <Link
          href="/cambiar-clave"
          className="card-cut border border-rule bg-paper-2 p-4 flex items-center justify-between text-xs font-medium text-ink hover:bg-paper transition-colors"
        >
          <span>Cambiar contraseña</span>
          <span className="text-ink-soft">→</span>
        </Link>
      </div>
    </main>
  );
}
