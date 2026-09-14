import Link from "next/link";
import { requireDueno } from "@/lib/auth";
import { linkClasses } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseTema } from "@/lib/tema";
import { cupoSocios } from "@/lib/plataforma/cupo";
import { diasRestantes } from "@/lib/cuota";
import { AjustesForm } from "./ajustes-form";
import { AvisoMorosidadForm } from "./aviso-morosidad-form";
import { ReposoCheckinForm } from "./reposo-checkin-form";
import { CheckinFondoUploader } from "./checkin-fondo-uploader";
import { DatosPagoForm } from "./datos-pago-form";
import { AfipForm } from "./afip-form";
import { EmailRecuperacionForm } from "./email-recuperacion-form";
import { CredencialesIndividualForm } from "./credenciales-individual-form";
import { ContactarSoporteForm } from "./contactar-soporte-form";
import { VerTutorialDeNuevo } from "@/components/tutorial/tutorial";
import { LinkAccesoCard } from "./link-acceso-card";
import { MercadoPagoAjustesCard } from "./mp-card";
import { estadoCobroAutomatico } from "@/lib/pagos/cobro-socio";
import { connectConfigurado } from "@/lib/pagos/mercadopago-connect";
import { BotonInstalarApp } from "@/components/pwa/boton-instalar-app";
import { verificarPlanGimnasio } from "@/lib/plataforma/plan-gate";
import { BloqueoEliteGate, BadgeElite } from "@/components/ui/bloqueo-elite-gate";

import { AjustesSeccionModal } from "./ajustes-seccion-modal";
import { StaffForm, type StaffItem } from "./staff-form";
import { Palette, Landmark, Bell, Smartphone, QrCode, KeyRound, HelpCircle, Receipt, Users, Sparkles } from "lucide-react";
import { AsistenteIaForm } from "./asistente-ia-form";
import { CapacidadAforoForm } from "./capacidad-aforo-form";
import { TECHO_LLAMADAS_IA_MES } from "@/lib/n8n/asistente-ia";

const ESTADO_LABEL: Record<string, string> = {
  prueba: "En prueba",
  activo: "Activo",
  solo_lectura: "Solo lectura",
};

export default async function AjustesPage({
  searchParams,
}: {
  searchParams?: Promise<{ mp?: string }>;
}) {
  const profile = await requireDueno();
  const supabase = await createClient();
  const db = createAdminClient();

  const [
    { data: gym },
    cupo,
    { data: planPlat },
    { data: miPerfil },
    cobroAuto,
    sp,
    planInfo,
    { data: staffData },
  ] = await Promise.all([
    supabase
      .from("gimnasios")
      .select(
        "id, slug, nombre, tema, logo_url, dias_aviso_morosidad, estado, plan_plataforma_vence_el, pago_alias, pago_cbu, pago_titular, tipo_cuenta, afip_habilitado, afip_cuit, afip_razon_social, afip_condicion_iva, afip_punto_venta, asistente_ia_activo, asistente_ia_llamadas_mes, plantilla_cumpleanos, capacidad_maxima",
      )
      .eq("id", profile.gimnasio_id)
      .maybeSingle(),
    cupoSocios(db, profile.gimnasio_id),
    db
      .from("gimnasios")
      .select("plan:planes_plataforma(nombre)")
      .eq("id", profile.gimnasio_id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("email_recuperacion, telefono")
      .eq("id", profile.id)
      .maybeSingle(),
    estadoCobroAutomatico(db, profile.gimnasio_id),
    (searchParams ?? Promise.resolve({})) as Promise<{ mp?: string }>,
    verificarPlanGimnasio(db, profile.gimnasio_id),
    db
      .from("profiles")
      .select("id, nombre, dni, telefono, activo, creado_at")
      .eq("gimnasio_id", profile.gimnasio_id)
      .eq("rol", "staff")
      .order("creado_at", { ascending: false }),
  ]);

  const empleados = (staffData ?? []) as StaffItem[];
  const staffActivosCount = empleados.filter((e) => e.activo).length;

  const estado = gym?.estado ?? "prueba";
  const planNombre =
    (planPlat?.plan as unknown as { nombre: string } | null)?.nombre ??
    (estado === "prueba" ? "Básico" : null);
  const venceDias = diasRestantes(gym?.plan_plataforma_vence_el ?? null);
  const vence = gym?.plan_plataforma_vence_el
    ? new Date(gym.plan_plataforma_vence_el).toLocaleDateString("es-AR")
    : null;

  return (
    <div className="stagger space-y-6">
      <div>
        <h1 className="text-2xl mb-1 font-bold">Ajustes del gimnasio</h1>
        <p className="text-sm text-ink-soft">
          Configuración general, marca, cobros y preferencias.
        </p>
      </div>

      {/* CARD TU PLAN Y ESTADO */}
      <div className="card-cut card-cut-lg border border-rule bg-paper-2 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-bold text-ink">Tu plan en SysGym</h2>
          <Link
            href="/panel/plan"
            className={`shrink-0 text-xs font-semibold ${linkClasses.inline}`}
          >
            Ver y pagar plan →
          </Link>
        </div>

        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="text-ink-soft">Estado:</dt>
            <dd className={`font-semibold ${estado === "solo_lectura" ? "text-danger" : "text-ink"}`}>
              {ESTADO_LABEL[estado] ?? estado}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-soft">Plan:</dt>
            <dd className="font-semibold text-ink">{planNombre ?? "Básico"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-soft">Socios:</dt>
            <dd className={`font-semibold ${cupo.ok ? "text-ink" : "text-danger"}`}>
              {cupo.max == null
                ? `${cupo.usados}`
                : `${cupo.usados} / ${cupo.max}`}
            </dd>
          </div>
          {vence ? (
            <div className="flex gap-2">
              <dt className="text-ink-soft">Vence:</dt>
              <dd className={venceDias !== null && venceDias <= 7 ? "text-warn font-semibold" : undefined}>
                {vence}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      {/* ACCESOS RÁPIDOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <BotonInstalarApp variant="card" />
        <VerTutorialDeNuevo />
      </div>

      {gym?.slug ? <LinkAccesoCard slug={gym.slug} /> : null}

      {/* SECCIONES EN GRILLA CON MODALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* TEMA Y MARCA */}
        {gym ? (
          <AjustesSeccionModal
            titulo="Tema y marca"
            subtitulo="Personalizá los colores, logo y estilo visual de tu gimnasio."
            icon={<Palette className="size-4" />}
            resumen={
              <p className="text-[11px] text-ink-soft font-mono">
                Estilo actual: {parseTema(gym.tema).estiloVisual ?? "Minimal"}
              </p>
            }
          >
            <AjustesForm
              gimnasioId={gym.id}
              tema={parseTema(gym.tema)}
              logoUrl={gym.logo_url ?? null}
            />
          </AjustesSeccionModal>
        ) : null}

        {/* DATOS DE TRANSFERENCIA */}
        {gym ? (
          <AjustesSeccionModal
            titulo="Datos para transferir"
            subtitulo="Alias, CBU y Titular visibles en la app del socio para pagos directos."
            icon={<Landmark className="size-4" />}
            resumen={
              <p className="text-[11px] text-ink-soft font-mono">
                {gym.pago_alias ? `Alias: ${gym.pago_alias}` : "Sin datos de transferencia"}
              </p>
            }
          >
            <DatosPagoForm
              gimnasioId={gym.id}
              alias={gym.pago_alias ?? null}
              cbu={gym.pago_cbu ?? null}
              titular={gym.pago_titular ?? null}
            />
          </AjustesSeccionModal>
        ) : null}

        {/* EMPLEADOS / STAFF DE RECEPCIÓN */}
        {gym ? (
          <AjustesSeccionModal
            titulo="Empleados"
            subtitulo="Cuentas de recepción y staff con acceso operativo al gimnasio."
            icon={<Users className="size-4" />}
            resumen={
              <p className="text-[11px] text-ink-soft font-mono">
                {empleados.length === 0
                  ? "Sin empleados"
                  : `${staffActivosCount} activo${staffActivosCount === 1 ? "" : "s"} / ${empleados.length} total`}
              </p>
            }
          >
            <StaffForm empleados={empleados} gimnasioSlug={gym.slug} />
          </AjustesSeccionModal>
        ) : null}

        {/* FACTURACIÓN ELECTRÓNICA AFIP */}
        {gym ? (
          <AjustesSeccionModal
            titulo="Facturación AFIP"
            subtitulo="Opcional: emití factura electrónica automáticamente por cada cobro."
            icon={<Receipt className="size-4" />}
            resumen={
              <p className="text-[11px] text-ink-soft font-mono">
                {gym.afip_habilitado ? "Habilitada" : "Deshabilitada"}
              </p>
            }
          >
            <AfipForm
              gimnasioId={gym.id}
              habilitado={gym.afip_habilitado ?? false}
              cuit={gym.afip_cuit ?? null}
              razonSocial={gym.afip_razon_social ?? null}
              condicionIva={gym.afip_condicion_iva ?? null}
              puntoVenta={gym.afip_punto_venta ?? null}
            />
          </AjustesSeccionModal>
        ) : null}

        {/* AVISOS DE MOROSIDAD */}
        {gym ? (
          <AjustesSeccionModal
            titulo="Aviso de vencimiento"
            subtitulo="Recordatorios automáticos por Push/WhatsApp antes de que venza la cuota."
            badge={<BadgeElite />}
            icon={<Bell className="size-4" />}
            resumen={
              <p className="text-[11px] text-ink-soft font-mono">
                Aviso: {gym.dias_aviso_morosidad ?? 5} días antes
              </p>
            }
          >
            <BloqueoEliteGate
              bloqueado={!planInfo.permiteAvisosMorosidad}
              titulo="Avisos Automáticos de Morosidad"
              descripcion="Notificá a tus socios por WhatsApp y Push antes de que venza su cuota para reducir la morosidad y cobrar a tiempo."
              beneficios={[
                "Push y WhatsApp automatizados",
                "Días de anticipación configurables",
                "Reducción directa de la cartera morosa",
              ]}
            >
              <AvisoMorosidadForm
                gimnasioId={gym.id}
                diasAviso={gym.dias_aviso_morosidad ?? 5}
              />
            </BloqueoEliteGate>
          </AjustesSeccionModal>
        ) : null}

        {/* PANTALLA DE REPOSO CHECK-IN */}
        {gym ? (
          <AjustesSeccionModal
            titulo="Reposo del Check-in"
            subtitulo="Fondo ambiental con reloj digital para la tablet de recepción."
            badge={<BadgeElite />}
            icon={<Smartphone className="size-4" />}
          >
            <BloqueoEliteGate
              bloqueado={!planInfo.permiteReposoCheckin}
              titulo="Pantalla de Reposo de Terminal"
              descripcion="Transformá la tablet de recepción en un reloj de marca elegante con el logo de tu gimnasio cuando no está en uso."
              beneficios={[
                "Diseño ambiental continuo",
                "Reloj digital de gran formato",
                "Despertar instantáneo al tocar",
              ]}
            >
              <ReposoCheckinForm
                gimnasioId={gym.id}
                reposo={parseTema(gym.tema).reposoCheckin}
              />
            </BloqueoEliteGate>
          </AjustesSeccionModal>
        ) : null}

        {/* FONDO DE LA PANTALLA DE CHECK-IN */}
        {gym ? (
          <AjustesSeccionModal
            titulo="Fondo del Check-in"
            subtitulo="Imagen de fondo detrás del DNI en la tablet de mostrador."
            badge={<BadgeElite />}
            icon={<Smartphone className="size-4" />}
          >
            <BloqueoEliteGate
              bloqueado={!planInfo.permiteCheckin}
              titulo="Fondo Personalizado de Terminal"
              descripcion="Vestí la pantalla de check-in con una imagen propia o precargada por SysGym, además del logo de tu gimnasio."
              beneficios={[
                "Galería de fondos precargados",
                "Subida de imagen propia",
                "Legibilidad garantizada sobre el DNI",
              ]}
            >
              <CheckinFondoUploader
                gimnasioId={gym.id}
                fondo={parseTema(gym.tema).checkinFondo}
              />
            </BloqueoEliteGate>
          </AjustesSeccionModal>
        ) : null}

        {/* ASISTENTE IA (n8n) */}
        {gym ? (
          <AjustesSeccionModal
            titulo="Asistente IA"
            subtitulo="Avisos de riesgo de abandono, cumpleaños y resumen mensual redactados solos."
            badge={<BadgeElite />}
            icon={<Sparkles className="size-4" />}
            resumen={
              <p className="text-[11px] text-ink-soft font-mono">
                {gym.asistente_ia_llamadas_mes ?? 0}/{TECHO_LLAMADAS_IA_MES} llamadas este mes
              </p>
            }
          >
            <BloqueoEliteGate
              bloqueado={!planInfo.permiteAsistenteIa}
              titulo="Asistente con Inteligencia Artificial"
              descripcion="Detecta socios en riesgo de abandono, saluda cumpleaños y te manda un resumen mensual, todo redactado por IA sin que escribas nada."
              beneficios={[
                "Detección automática de riesgo de abandono",
                "Saludos de cumpleaños sin que te acuerdes",
                "Resumen ejecutivo del mes al dueño",
              ]}
            >
              <AsistenteIaForm
                gimnasioId={gym.id}
                activo={gym.asistente_ia_activo ?? false}
                llamadasUsadas={gym.asistente_ia_llamadas_mes ?? 0}
                techoMensual={TECHO_LLAMADAS_IA_MES}
                plantillaCumpleanos={gym.plantilla_cumpleanos ?? ""}
              />
            </BloqueoEliteGate>
          </AjustesSeccionModal>
        ) : null}

        {/* CAPACIDAD MÁXIMA DE AFORO */}
        {gym ? (
          <AjustesSeccionModal
            titulo="Aforo del gimnasio"
            subtitulo="Capacidad máxima de socios en sala, usada por el medidor de aforo en vivo de /mi."
            icon={<Users className="size-4" />}
            resumen={
              <p className="text-[11px] text-ink-soft font-mono">
                {gym.capacidad_maxima ?? 50} personas
              </p>
            }
          >
            <CapacidadAforoForm
              gimnasioId={gym.id}
              capacidadMaxima={gym.capacidad_maxima ?? 50}
            />
          </AjustesSeccionModal>
        ) : null}

        {/* EMAIL DE RECUPERACIÓN */}
        <AjustesSeccionModal
          titulo="Email de recuperación"
          subtitulo="Correo seguro para recuperar la contraseña en caso de olvido."
          icon={<KeyRound className="size-4" />}
          resumen={
            <p className="text-[11px] text-ink-soft font-mono">
              {miPerfil?.email_recuperacion ?? "Sin email registrado"}
            </p>
          }
        >
          <EmailRecuperacionForm
            email={miPerfil?.email_recuperacion ?? null}
          />
        </AjustesSeccionModal>

        {/* ACCESO DIRECTO (solo cuentas individuales de Google) */}
        {gym?.tipo_cuenta === "individual" ? (
          <AjustesSeccionModal
            titulo="Acceso directo"
            subtitulo="Loguéate con nombre, email o teléfono + contraseña, sin pasar por Google."
            icon={<KeyRound className="size-4" />}
            resumen={
              <p className="text-[11px] text-ink-soft font-mono">
                {miPerfil?.telefono ?? "Sin teléfono registrado"}
              </p>
            }
          >
            <CredencialesIndividualForm telefono={miPerfil?.telefono ?? null} />
          </AjustesSeccionModal>
        ) : null}

        {/* CONTACTAR SOPORTE */}
        <AjustesSeccionModal
          titulo="Contactar soporte"
          subtitulo="Canal directo con el equipo técnico de SysGym."
          icon={<HelpCircle className="size-4" />}
        >
          <ContactarSoporteForm />
        </AjustesSeccionModal>
      </div>

      {/* MERCADO PAGO INTEGRACIÓN */}
      <div className="pt-2">
        <MercadoPagoAjustesCard
          elite={cobroAuto.elite}
          vinculado={cobroAuto.vinculado}
          userId={cobroAuto.userId}
          vinculadoAt={cobroAuto.vinculadoAt}
          configurado={connectConfigurado()}
          aviso={sp?.mp ?? null}
        />
      </div>
    </div>
  );
}
