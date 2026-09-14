import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/actions";
import { CardPeso } from "@/components/peso/card-peso";
import { guardarPesoCliente, obtenerPesosCliente } from "@/lib/peso/actions";
import { pillClasses } from "@/components/ui";
import {
  User,
  Dumbbell,
  Calendar,
  Phone,
  Mail,
  IdCard,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Palette,
  KeyRound,
} from "lucide-react";
import { ArchivosSeccion } from "@/components/archivos/archivos-seccion";
import { CredencialQRModal } from "@/components/mi/credencial-qr-modal";
import { Pulpo } from "@/components/mascota/pulpo";
import { VozGuiadaToggle } from "@/components/rutinas/voz-guiada-toggle";

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
      <Link href="/mi" className={pillClasses.neutra}>
        <ChevronLeft aria-hidden strokeWidth={2} className="size-4 shrink-0" />
        Volver al inicio
      </Link>

      <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-ink-soft px-1 -mb-2">
        Mi perfil
      </h2>

      {/* Cabecera del perfil */}
      <div className="card-cut border border-rule bg-paper-2 p-5 flex items-center gap-4">
        <div className="relative size-14 shrink-0 rounded-full border-2 border-rule bg-paper-3 overflow-hidden grid place-items-center">
          {c?.foto_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.foto_url}
              alt={`Foto de ${profile.nombre}`}
              className="size-full object-cover"
            />
          ) : (
            <div className="size-full bg-[#052e1f] grid place-items-center">
              <Pulpo size={46} pose="neutral" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold text-ink truncate leading-tight">
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

        {/* Atajo QR compacto junto a los datos del socio */}
        <CredencialQRModal
          nombre={profile.nombre}
          dni={profile.dni}
          gymNombre={gym?.nombre}
          estadoCuota={c?.estado_cuota}
          compacto
        />
      </div>

      {/* ── SECCIÓN 1: Peso corporal (interacción frecuente, arriba de todo) ── */}
      {c?.id && (
        <CardPeso
          clienteId={c.id}
          creadoPor="cliente"
          action={guardarPesoCliente}
          fetchRegistros={obtenerPesosCliente}
        />
      )}

      {/* ── SECCIÓN 2: Mis archivos (jerarquía secundaria, fondo suave) ── */}
      {c?.id && (
        <div className="card-cut border border-rule bg-paper-2 p-4 space-y-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-ink-soft">
              Mis archivos y documentos
            </h2>
            <p className="text-[11px] text-ink-soft mt-0.5">
              Guardá acá tu apto médico, certificados, dietas o rutinas impresas.
            </p>
          </div>
          <ArchivosSeccion clienteId={c.id} />
        </div>
      )}

      {/* ── SECCIÓN 3: Ajustes y Seguridad (agrupados en tarjeta iOS) ── */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-ink-soft px-1">
          Ajustes
        </h2>
        <div className="rounded-[14px] border border-rule bg-paper-2 overflow-hidden divide-y divide-rule shadow-sm">
          <Link
            href="/mi/ajustes"
            className="p-3.5 flex items-center justify-between text-xs font-medium text-ink hover:bg-paper active:bg-paper-3/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-paper-3 border border-rule flex items-center justify-center text-ink-soft group-hover:text-ink transition-colors">
                <Palette className="size-4" />
              </div>
              <div>
                <p className="font-semibold text-ink">Personalizar tema</p>
                <p className="text-[11px] text-ink-soft">Color de acento y aspecto</p>
              </div>
            </div>
            <ChevronRight className="size-4 text-ink-soft group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <VozGuiadaToggle variant="row" />

          <Link
            href="/cambiar-clave"
            className="p-3.5 flex items-center justify-between text-xs font-medium text-ink hover:bg-paper active:bg-paper-3/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-paper-3 border border-rule flex items-center justify-center text-ink-soft group-hover:text-ink transition-colors">
                <KeyRound className="size-4" />
              </div>
              <div>
                <p className="font-semibold text-ink">Cambiar contraseña</p>
                <p className="text-[11px] text-ink-soft">Seguridad y clave de acceso</p>
              </div>
            </div>
            <ChevronRight className="size-4 text-ink-soft group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <form action={logout}>
            <button
              type="submit"
              className="w-full p-3.5 flex items-center justify-between text-xs font-semibold text-danger hover:bg-danger/10 active:bg-danger/15 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-danger/10 border border-danger/20 flex items-center justify-center text-danger">
                  <LogOut className="size-4" />
                </div>
                <span>Cerrar sesión</span>
              </div>
              <ChevronRight className="size-4 text-danger/60" />
            </button>
          </form>
        </div>
      </div>

      {/* ── SECCIÓN 4: Datos de Contacto y Cuenta (estático, casi no se toca) ── */}
      <div className="card-cut border border-rule bg-paper-2 p-4 space-y-2.5">
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
    </main>
  );
}
