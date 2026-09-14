import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { logout } from "@/app/actions";
import { diasRestantes, estadoDesdeDias, ESTADO_LABEL } from "@/lib/cuota";
import { ActivarNotificaciones } from "./activar-notificaciones";
import { VerTutorialDeNuevo } from "@/components/tutorial/tutorial";
import { AnilloProgreso } from "@/components/anillo-progreso";
import { pillClasses } from "@/components/ui";
import { ChevronRight, CreditCard, Dumbbell, Inbox, MessageSquare, Palette, User } from "lucide-react";
import { RachaConstancia } from "@/components/mi/racha-constancia";
import { RachaSeccion } from "@/components/logros/racha-seccion";
import { ComunidadSeccion } from "@/components/logros/comunidad-seccion";
import { obtenerRachaCliente, obtenerFeedLogrosGimnasio, obtenerRankingAsistencia, obtenerDesafioMensual } from "@/lib/logros/actions";
import { parseTema } from "@/lib/tema";
import { DatosTransferencia } from "@/components/mi/datos-transferencia";
import { CacheAlVuelo } from "@/components/offline/cache-al-vuelo";
import { BotonInstalarApp } from "@/components/pwa/boton-instalar-app";
import { BotonCompartirApp } from "@/components/ui/boton-compartir-app";
import { BotonActualizar } from "@/components/ui/boton-actualizar";
import { PulpoRetencionCard } from "@/components/mi/pulpo-retencion-card";
import { BarraAforoAnimada } from "@/components/mi/barra-aforo-animada";
import { obtenerAforo } from "@/lib/aforo/actions";
import { Pulpo } from "@/components/mascota/pulpo";
import { CredencialQRModal } from "@/components/mi/credencial-qr-modal";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MiPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: gym }, { data }, { count: noLeidos }] = await Promise.all([
    supabase
      .from("gimnasios")
      .select("estado, pago_alias, pago_cbu, pago_titular, nombre, logo_url, tema, tipo_cuenta")
      .eq("id", profile.gimnasio_id)
      .single(),
    supabase
      .from("clientes")
      .select("id, fecha_vencimiento, plan:planes(nombre, duracion_dias)")
      .eq("profile_id", profile.id)
      .maybeSingle(),
    supabase
      .from("mensaje_destinatarios")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile.id)
      .eq("leido", false),
  ]);

  const estadoGimnasio = gym?.estado ?? "prueba";
  const soloLectura = estadoGimnasio === "solo_lectura";

  const c = data as any;

  // Racha de constancia: 15 barras × 2 días = últimos 30 días. Defensivo: si
  // `registros_entrada` no existe todavía o no hay visitas, no se renderiza.
  let racha: { dias: boolean[]; total: number } | null = null;
  if (c?.id) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const desde = new Date(hoy);
    desde.setDate(desde.getDate() - 29);
    const { data: entradas, error: errEntradas } = await supabase
      .from("registros_entrada")
      .select("creado_en")
      .eq("cliente_id", c.id)
      .gte("creado_en", desde.toISOString());
    if (!errEntradas && entradas && entradas.length > 0) {
      const marcas = (entradas as { creado_en: string }[]).map((e) => {
        const d = new Date(e.creado_en);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      });
      const N = 15;
      const dias = Array.from({ length: N }, (_, i) => {
        const fin = new Date(hoy);
        fin.setDate(fin.getDate() - (N - 1 - i) * 2);
        const ini = new Date(fin);
        ini.setDate(ini.getDate() - 1);
        return marcas.some((t) => t >= ini.getTime() && t <= fin.getTime());
      });
      racha = { dias, total: entradas.length };
    }
  }
  // Racha de constancia (feature "Compartir logros"): días consecutivos
  const [rachaLogro, feedLogros, rankingRes, desafioRes] = c?.id
    ? await Promise.all([
        obtenerRachaCliente(),
        obtenerFeedLogrosGimnasio(),
        obtenerRankingAsistencia(),
        obtenerDesafioMensual(),
      ])
    : [null, [], { ranking: [], miPosicion: null }, null];
  const temaGym = parseTema(gym?.tema);
  const coloresLogro = {
    paper: temaGym.paper,
    ink: temaGym.ink,
    volt: temaGym.volt,
    voltInk: temaGym.voltInk,
  };

  const esIndividual = gym?.tipo_cuenta === "individual" || profile.rol === "dueno";
  const aforo = !esIndividual && profile.gimnasio_id ? await obtenerAforo(profile.gimnasio_id) : null;
  const dias = esIndividual ? null : diasRestantes(c?.fecha_vencimiento ?? null);
  const estado = esIndividual ? "al_dia" : estadoDesdeDias(dias);
  const duracionTotal = c?.plan?.duracion_dias ?? 30; // fallback a 30 si no hay plan
  const diasParaAnillo = dias !== null && dias >= 0 ? dias : 0;

  return (
    <main className="stagger max-w-md mx-auto min-h-full p-6 pb-24 space-y-6">
      <CacheAlVuelo
        clave="cuota:mi"
        data={{
          nombre: profile.nombre,
          estado,
          dias,
          plan: c?.plan?.nombre ?? null,
          fechaVencimiento: c?.fecha_vencimiento ?? null,
        }}
      />
      {soloLectura && (
        <div className="rounded-lg border-2 border-danger bg-danger/10 p-4">
          <h2 className="mb-2 text-lg font-display text-danger">
            Período de prueba finalizado
          </h2>
          <p className="text-sm text-ink">
            El gimnasio está en modo solo lectura. Contactá a la administración para activar un plan.
          </p>
        </div>
      )}

      {/* ── TOPBAR MEJORADA CON JERARQUÍA NATIVA ── */}
      <div className="space-y-3">
        {/* Cabecera: Avatar Mascota Pulpo Volt + Saludo + Acciones Secundarias (Ghost) */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative size-10 shrink-0 rounded-[12px] bg-[#0b1311] border border-volt/30 flex items-center justify-center shadow-sm overflow-hidden">
              <Pulpo size={28} pose="festejo" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft/80 leading-none mb-0.5">
                {gym?.nombre ?? "SysGym"}
              </p>
              <h1 className="min-w-0 truncate text-xl font-bold font-display text-ink leading-tight">
                Hola, {profile.nombre.split(" ")[0]}
              </h1>
            </div>
          </div>

          {/* Menú secundario de botones de ícono ghost */}
          <div className="flex items-center gap-1 shrink-0 rounded-[12px] border border-rule/80 bg-paper-2/90 p-1 shadow-sm">
            <BotonActualizar variante="icono" className="!min-h-8 !min-w-8 !size-8 !rounded-[8px] !border-none !bg-transparent hover:!bg-paper hover:text-ink text-ink-soft" />
            <VerTutorialDeNuevo variante="icono" className="!min-h-8 !min-w-8 !size-8 !rounded-[8px] hover:!bg-paper text-ink-soft hover:text-ink" />
          </div>
        </div>

        {/* Acción Primaria Dominante: Mi QR de Ingreso */}
        <CredencialQRModal
          nombre={profile.nombre}
          dni={profile.dni}
          gymNombre={gym?.nombre}
          estadoCuota={estado === "vencido" ? "vencida" : "al_dia"}
          fullAncho
        />
      </div>

      {esIndividual ? (
        <div className="card-cut card-cut-lg futurista-fondo border border-rule bg-paper-2 p-5 border-l-2 border-l-ok">
          <p className="text-xs text-ink-soft mb-1">Tu cuenta</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-2xl leading-tight text-ok">
                Cuenta Personal
              </p>
              <p className="text-sm text-ink-soft mt-0.5">
                Entrenamiento individual activo
              </p>
            </div>
            <span className="flex size-3 rounded-full bg-ok animate-pulse" />
          </div>
        </div>
      ) : (
        <div
          className={`card-cut card-cut-lg futurista-fondo border border-rule bg-paper-2 p-5 border-l-2 ${
            estado === "vencido"
              ? "border-l-danger"
              : estado === "por_vencer"
                ? "border-l-warn"
                : "border-l-ok"
          }`}
        >
          <p className="text-xs text-ink-soft mb-4">Tu cuota</p>
          
          <div className="flex items-center gap-6">
            <AnilloProgreso
              valor={diasParaAnillo}
              max={duracionTotal}
              label="días"
              tono={
                estado === "vencido"
                  ? "peligro"
                  : estado === "por_vencer"
                    ? "aviso"
                    : "ok"
              }
            />
            
            <div className="min-w-0 flex-1">
              <p
                className={`font-display text-2xl leading-tight ${
                  estado === "vencido"
                    ? "text-danger"
                    : estado === "por_vencer"
                      ? "text-warn"
                      : "text-ok"
                }`}
              >
                {ESTADO_LABEL[estado]}
              </p>
              <p className="text-sm text-ink-soft mt-1">
                {c?.plan?.nombre ?? "Sin plan"}
                {c?.fecha_vencimiento
                  ? ` · vence ${c.fecha_vencimiento}${
                      dias !== null
                        ? dias < 0
                          ? ` (hace ${Math.abs(dias)} días)`
                          : dias === 0
                            ? " (vence hoy)"
                            : ` (en ${dias} días)`
                        : ""
                    }`
                  : ""}
              </p>
            </div>
          </div>
        </div>
      )}

      {aforo ? <BarraAforoAnimada aforo={aforo} /> : null}

      <PulpoRetencionCard />

      {racha ? (
        <RachaConstancia dias={racha.dias} total={racha.total} />
      ) : null}

      {rachaLogro ? (
        <RachaSeccion
          racha={rachaLogro}
          gimnasioNombre={gym?.nombre ?? ""}
          logoUrl={gym?.logo_url ?? null}
          colores={coloresLogro}
        />
      ) : null}

      <ComunidadSeccion
        feedItems={feedLogros}
        ranking={rankingRes.ranking}
        miPosicion={rankingRes.miPosicion}
        desafio={desafioRes}
      />

      {!esIndividual && estado !== "al_dia" ? (
        <div className="space-y-3">
          <Link
            href="/mi/pagos"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-accent font-bold text-sm text-accent-ink shadow-md shadow-accent/20 transition-transform active:scale-[0.98] hover:opacity-95"
          >
            <CreditCard className="size-4" />
            <span>Pagar cuota online con Mercado Pago</span>
          </Link>
          <DatosTransferencia
            alias={gym?.pago_alias ?? null}
            cbu={gym?.pago_cbu ?? null}
            titular={gym?.pago_titular ?? null}
          />
        </div>
      ) : null}

      <ul className="stagger-in card-cut overflow-hidden border border-rule bg-paper-2 divide-y divide-rule">
        <li>
          <Link
            href="/mi/perfil"
            className="group flex items-center gap-3 px-4 py-4 transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper active:bg-paper active:scale-[0.985]"
          >
            <User aria-hidden strokeWidth={2} className="size-[18px] shrink-0 text-ink-soft transition-colors duration-150 [transition-timing-function:var(--ease-out)] group-active:text-ink" />
            <span className="min-w-0 flex-1 text-sm font-medium">
              Mi perfil y peso corporal
            </span>
            <ChevronRight
              aria-hidden
              strokeWidth={2}
              className="size-4 shrink-0 text-ink-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] group-active:translate-x-[3px]"
            />
          </Link>
        </li>
        <li>
          <Link
            href="/mi/mensajes"
            className="group flex items-center gap-3 px-4 py-4 transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper active:bg-paper active:scale-[0.985]"
          >
            <MessageSquare aria-hidden strokeWidth={2} className="size-[18px] shrink-0 text-ink-soft transition-colors duration-150 [transition-timing-function:var(--ease-out)] group-active:text-ink" />
            <span className="min-w-0 flex-1 text-sm font-medium">
              Mensajes del gimnasio
            </span>
            {noLeidos ? (
              <span className="animate-pop-in shrink-0 text-xs bg-volt text-volt-ink rounded-full px-2 py-0.5 font-medium">
                {noLeidos} sin leer
              </span>
            ) : (
              <ChevronRight
                aria-hidden
                strokeWidth={2}
                className="size-4 shrink-0 text-ink-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] group-active:translate-x-[3px]"
              />
            )}
          </Link>
        </li>
        <li>
          <Link
            href="/mi/rutina"
            className="group flex items-center gap-3 px-4 py-4 transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper active:bg-paper active:scale-[0.985]"
          >
            <Dumbbell aria-hidden strokeWidth={2} className="size-[18px] shrink-0 text-ink-soft transition-colors duration-150 [transition-timing-function:var(--ease-out)] group-active:text-ink" />
            <span className="min-w-0 flex-1 text-sm font-medium">Tu rutina</span>
            <ChevronRight
              aria-hidden
              strokeWidth={2}
              className="size-4 shrink-0 text-ink-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] group-active:translate-x-[3px]"
            />
          </Link>
        </li>
        <li>
          <Link
            href="/mi/pagos"
            className="group flex items-center gap-3 px-4 py-4 transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper active:bg-paper active:scale-[0.985]"
          >
            <CreditCard aria-hidden strokeWidth={2} className="size-[18px] shrink-0 text-ink-soft transition-colors duration-150 [transition-timing-function:var(--ease-out)] group-active:text-ink" />
            <span className="min-w-0 flex-1 text-sm font-medium">Mis pagos</span>
            <ChevronRight
              aria-hidden
              strokeWidth={2}
              className="size-4 shrink-0 text-ink-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] group-active:translate-x-[3px]"
            />
          </Link>
        </li>
        <li>
          <Link
            href="/mi/ajustes"
            className="group flex items-center gap-3 px-4 py-4 transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper active:bg-paper active:scale-[0.985]"
          >
            <Palette aria-hidden strokeWidth={2} className="size-[18px] shrink-0 text-ink-soft transition-colors duration-150 [transition-timing-function:var(--ease-out)] group-active:text-ink" />
            <span className="min-w-0 flex-1 text-sm font-medium">Personalizar tema</span>
            <ChevronRight
              aria-hidden
              strokeWidth={2}
              className="size-4 shrink-0 text-ink-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] group-active:translate-x-[3px]"
            />
          </Link>
        </li>
        <li>
          <Link
            href="/mi/buzon"
            className="group flex items-center gap-3 px-4 py-4 transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper active:bg-paper active:scale-[0.985]"
          >
            <Inbox aria-hidden strokeWidth={2} className="size-[18px] shrink-0 text-ink-soft transition-colors duration-150 [transition-timing-function:var(--ease-out)] group-active:text-ink" />
            <span className="min-w-0 flex-1 text-sm font-medium">Buzón anónimo</span>
            <ChevronRight
              aria-hidden
              strokeWidth={2}
              className="size-4 shrink-0 text-ink-soft transition-transform duration-150 [transition-timing-function:var(--ease-out)] group-active:translate-x-[3px]"
            />
          </Link>
        </li>
      </ul>
 
      <div className="mt-4 space-y-3">
        <BotonCompartirApp variant="card" />
        <BotonInstalarApp variant="card" />
      </div>

      <ActivarNotificaciones />
    </main>
  );
}
