"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Select, linkClasses } from "@/components/ui";
import { hapticoSeleccion } from "@/lib/ui/hapticos";
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Dumbbell,
  Flame,
  Sparkles,
  Layers,
  Activity,
  X,
  SlidersHorizontal,
} from "lucide-react";
import {
  ENFASIS,
  ENFASIS_LABEL,
  MAX_ENFASIS,
  MOLESTIAS,
  MOLESTIA_LABEL,
  NIVELES,
  NIVEL_LABEL,
  NIVEL_DETALLE,
  OBJETIVOS,
  OBJETIVO_LABEL,
  OBJETIVO_AYUDA,
  ORDENES,
  ORDEN_LABEL,
  PREFERENCIA_EQUIPO_LABEL,
  RANGOS,
  RANGO_LABEL,
  RIR_OPCIONES,
  RIR_LABEL,
  SEXOS,
  SEXO_LABEL,
  SPLITS,
  SPLIT_LABEL,
  SPLIT_DIAS_OK,
  TECNICAS,
  TECNICA_LABEL,
  VOLUMENES,
  VOLUMEN_LABEL,
  type Enfasis,
  type Molestia,
  type Nivel,
  type Objetivo,
  type PreferenciaEquipo,
  type Sexo,
} from "@/lib/rutina/tipos";
import { TEORIA, type ClaveTeoria } from "@/lib/rutina/teoria";

type S = { error?: string; ok?: string };

const PREFS: PreferenciaEquipo[] = ["gimnasio", "mancuernas", "peso_corporal"];

// Etiqueta corta para el <select> de esfuerzo. La explicación larga
// ("dejá 2–3 repeticiones en reserva") vive en el "¿por qué?" de abajo.
const RIR_CORTO: Record<string, string> = {
  "2-3": "Suave",
  "1-2": "Exigente",
  "0-1": "Al límite",
};

function Porque({ clave }: { clave: ClaveTeoria }) {
  const t = TEORIA[clave];
  return (
    <details className="mt-1.5 text-xs text-ink-soft">
      <summary
        className={`w-fit cursor-pointer select-none [&::-webkit-details-marker]:hidden ${linkClasses.inline}`}
      >
        ¿por qué?
      </summary>
      <p className="mt-1 leading-snug">{t.resumen}</p>
      <p className="mt-1 leading-snug text-ink-soft/70">Fuente: {t.fuente}</p>
    </details>
  );
}

const GUIA_ITEMS = [
  {
    num: 1,
    titulo: "Por qué no te ponemos 30 series por día",
    texto: "El mito de «más es mejor» te frena. La ciencia deportiva (Dr. Brad Schoenfeld) demostró que después de 6 a 8 series exigentes por músculo en una sesión, el cuerpo ya no crea más masa muscular y solo acumula cansancio inútil (volumen basura). Menos series con más energía te darán el doble de resultados en menos tiempo.",
  },
  {
    num: 2,
    titulo: "Por qué cada músculo se entrena 2 veces por semana",
    texto: "Repartir el esfuerzo en 2 días activa el crecimiento muscular dos veces en la semana en lugar de una sola. Llegás a cada ejercicio fresco y con fuerza, levantando más peso de forma segura.",
  },
  {
    num: 3,
    titulo: "Por qué los ejercicios pesados van al principio",
    texto: "Los ejercicios con barra, mancuerna o máquinas compuestas reclutan las fibras más potentes. Si los hiciéramos al final cansado, tu técnica se rompería. Dejamos los ejercicios de brazos o accesorios para el cierre.",
  },
  {
    num: 4,
    titulo: "Por qué no vas al fallo total en cada serie (RIR 1–2)",
    texto: "Llegar a no poder mover la barra agota el sistema nervioso y multiplica el riesgo de lesión sin darte más músculo. Dejar 1 o 2 repeticiones en reserva (RIR 1–2) estimula el 100% del crecimiento y te permite volver a entrenar con energía al día siguiente.",
  },
  {
    num: 5,
    titulo: "Si te duele algo, cuidamos tus articulaciones",
    texto: "Si marcás dolor en rodilla, hombro o cintura baja, el motor no te deja sin entrenar: reemplaza los movimientos agresivos por variantes biomecánicas seguras (respaldos, poleas, ángulos ergonómicos) recomendadas por preparadores de élite (Charles Glass, Joan Pradells).",
  },
];

function GuiaPrincipiante() {
  const [abierta, setAbierta] = useState(false);
  const [itemAbierto, setItemAbierto] = useState<number | null>(null);

  return (
    <div className="sm:col-span-2 mb-1">
      <button
        type="button"
        onClick={() => {
          hapticoSeleccion();
          setAbierta(!abierta);
        }}
        className="flex w-full items-center justify-between gap-3 rounded-[12px] border border-accent/30 bg-accent/5 p-3 text-left transition-all duration-150 active:scale-[0.99] hover:bg-accent/10 shadow-sm"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="grid size-7 shrink-0 place-items-center rounded-[8px] bg-accent/20 text-accent text-sm">
            💡
          </span>
          <div>
            <p className="text-xs font-semibold text-ink">
              ¿Cómo armamos tu rutina? (Guía para no expertos)
            </p>
            <p className="text-[11px] text-ink-soft">
              Entendé las razones de series, descansos y frecuencia sin jerga
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs font-medium text-accent shrink-0">
          <span>{abierta ? "Cerrar guía" : "Ver explicación"}</span>
          {abierta ? (
            <ChevronUp aria-hidden className="size-3.5" />
          ) : (
            <ChevronDown aria-hidden className="size-3.5" />
          )}
        </div>
      </button>

      {abierta && (
        <div className="mt-2.5 rounded-[14px] border border-rule bg-paper-2 p-2 text-xs text-ink-soft space-y-1.5 animate-fade-in shadow-sm">
          {GUIA_ITEMS.map((item) => {
            const isOpen = itemAbierto === item.num;
            return (
              <div
                key={item.num}
                className="rounded-[10px] border border-rule/60 bg-paper/60 transition-colors overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => {
                    hapticoSeleccion();
                    setItemAbierto(isOpen ? null : item.num);
                  }}
                  className="flex w-full items-center justify-between gap-2.5 p-2.5 text-left active:bg-accent/5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-accent/15 text-[11px] font-bold text-accent">
                      {item.num}
                    </span>
                    <p className="font-semibold text-ink text-xs truncate">
                      {item.titulo}
                    </p>
                  </div>
                  <ChevronDown
                    aria-hidden
                    className={`size-4 text-ink-soft shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-accent" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-3 pb-3 pt-1 text-xs text-ink-soft leading-relaxed border-t border-rule/30 animate-fade-in">
                    {item.texto}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const NIVEL_UI_CONFIG: Record<
  Nivel,
  {
    badge: string;
    subtitulo: string;
    icon: typeof ShieldCheck;
    colorClasses: {
      activeBorder: string;
      activeBg: string;
      activeGlow: string;
      iconColor: string;
      iconBg: string;
      dotColor: string;
      badgeActive: string;
    };
  }
> = {
  principiante: {
    badge: "Base segura",
    subtitulo: "< 6 meses",
    icon: ShieldCheck,
    colorClasses: {
      activeBorder: "border-emerald-500/70 ring-1 ring-emerald-500/40",
      activeBg: "bg-gradient-to-b from-emerald-500/10 via-paper to-paper",
      activeGlow: "shadow-[0_0_20px_rgba(16,231,160,0.18)]",
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/15 border-emerald-500/30",
      dotColor: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]",
      badgeActive: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    },
  },
  intermedio: {
    badge: "Sobrecarga",
    subtitulo: "6m – 2 años",
    icon: Dumbbell,
    colorClasses: {
      activeBorder: "border-volt/70 ring-1 ring-volt/40",
      activeBg: "bg-gradient-to-b from-volt/10 via-paper to-paper",
      activeGlow: "shadow-[0_0_20px_rgba(205,233,74,0.22)]",
      iconColor: "text-volt",
      iconBg: "bg-volt/15 border-volt/30",
      dotColor: "bg-volt shadow-[0_0_8px_var(--color-volt)]",
      badgeActive: "bg-volt/20 text-volt border-volt/30",
    },
  },
  avanzado: {
    badge: "Alto impacto",
    subtitulo: "+2 años",
    icon: Flame,
    colorClasses: {
      activeBorder: "border-amber-400/70 ring-1 ring-amber-400/40",
      activeBg: "bg-gradient-to-b from-amber-500/10 via-paper to-paper",
      activeGlow: "shadow-[0_0_20px_rgba(251,191,36,0.22)]",
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/15 border-amber-500/30",
      dotColor: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]",
      badgeActive: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    },
  },
};

function SectorAyudaNivel({
  nivelSeleccionado,
  onSelectNivel,
}: {
  nivelSeleccionado: Nivel;
  onSelectNivel: (n: Nivel) => void;
}) {
  const [expandido, setExpandido] = useState(false);
  const info = NIVEL_DETALLE[nivelSeleccionado];
  const activeConfig = NIVEL_UI_CONFIG[nivelSeleccionado];
  const ActiveIcon = activeConfig.icon;

  return (
    <div className="sm:col-span-2 relative overflow-hidden rounded-[20px] border border-white/10 bg-paper-2/90 p-4 shadow-xl backdrop-blur-xl transition-all duration-200 ring-1 ring-white/5">
      {/* Resplandor superior sutil estilo Liquid Glass */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Header del sector */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-volt/30 bg-volt/10 text-volt shadow-[0_0_12px_rgba(205,233,74,0.18)]">
            <Layers className="size-4.5" />
          </div>
          <div>
            <h3 className="font-display text-[13px] font-bold tracking-tight text-ink">
              Guía de Nivel Biomecánico
            </h3>
            <p className="text-[11px] text-ink-soft">
              Filtra ejercicios según control motor y seguridad articular
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            hapticoSeleccion();
            setExpandido(!expandido);
          }}
          className="group inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-rule/70 bg-paper/60 px-3 py-1 text-[11px] font-semibold text-ink-soft hover:text-ink hover:border-volt/40 hover:bg-paper transition-all duration-150 active:scale-95 shadow-xs shrink-0"
        >
          <span>{expandido ? "Menos info" : "Ver criterios"}</span>
          <ChevronDown
            aria-hidden
            className={`size-3.5 text-ink-soft transition-transform duration-200 group-hover:text-ink ${
              expandido ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* Selector interactivo de nivel en 3 tarjetas táctiles ergonómicas (≥44pt) */}
      <div className="mt-3.5 grid grid-cols-3 gap-2">
        {NIVELES.map((n) => {
          const activo = nivelSeleccionado === n;
          const conf = NIVEL_UI_CONFIG[n];
          const Icon = conf.icon;

          return (
            <button
              key={n}
              type="button"
              onClick={() => {
                hapticoSeleccion();
                onSelectNivel(n);
              }}
              className={`relative flex min-h-[82px] flex-col justify-between p-3 rounded-[14px] text-left transition-all duration-200 active:scale-[0.96] border cursor-pointer ${
                activo
                  ? `${conf.colorClasses.activeBorder} ${conf.colorClasses.activeBg} ${conf.colorClasses.activeGlow} text-ink`
                  : "border-rule/60 bg-paper/50 text-ink-soft hover:border-rule hover:bg-paper/80 hover:text-ink"
              }`}
            >
              {/* Fila superior: Ícono y punto de estado */}
              <div className="flex w-full items-center justify-between">
                <div
                  className={`flex size-6.5 items-center justify-center rounded-[8px] border transition-colors ${
                    activo
                      ? `${conf.colorClasses.iconBg} ${conf.colorClasses.iconColor}`
                      : "border-rule/70 bg-paper-2 text-ink-soft/70"
                  }`}
                >
                  <Icon className="size-3.5 stroke-[2.2]" />
                </div>
                {activo ? (
                  <span className={`size-2 rounded-full ${conf.colorClasses.dotColor}`} />
                ) : null}
              </div>

              {/* Fila inferior: Título del nivel y badge de experiencia */}
              <div className="mt-2">
                <span className="block font-display text-xs font-bold leading-tight">
                  {NIVEL_LABEL[n]}
                </span>
                <span className="mt-0.5 block font-mono text-[10px] tabular-nums text-ink-soft">
                  {conf.subtitulo}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detalle activo con estética Apple HIG Liquid Glass */}
      <div
        className={`relative mt-3.5 rounded-[16px] border ${activeConfig.colorClasses.activeBorder} bg-paper/90 p-3.5 text-xs backdrop-blur-md shadow-xs transition-all duration-200 animate-fade-in`}
      >
        {/* Cabecera del detalle */}
        <div className="flex items-start gap-2.5">
          <div
            className={`flex size-8 shrink-0 items-center justify-center rounded-[10px] border ${activeConfig.colorClasses.iconBg} ${activeConfig.colorClasses.iconColor}`}
          >
            <ActiveIcon className="size-4 stroke-[2.2]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-display text-xs font-bold text-ink">
                {NIVEL_LABEL[nivelSeleccionado]}
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${activeConfig.colorClasses.badgeActive}`}
              >
                {activeConfig.badge}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] font-medium text-ink leading-snug">
              {info.resumen}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
              {info.criterioSeleccion}
            </p>
          </div>
        </div>

        {/* Badge de seguridad articular */}
        <div className="mt-3 flex items-center gap-2 rounded-[10px] border border-rule/60 bg-paper-2/90 px-2.5 py-1.5 text-[11px]">
          <Activity className={`size-3.5 shrink-0 ${activeConfig.colorClasses.iconColor}`} />
          <span className="text-ink-soft leading-tight">
            <strong className="font-semibold text-ink">Seguridad:</strong> {info.seguridad}
          </span>
        </div>

        {/* Ejercicios priorizados en pills refinados */}
        <div className="mt-3 pt-3 border-t border-rule/50">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-soft">
              <Sparkles className="size-3 text-volt" />
              Ejercicios que el motor prioriza para este nivel:
            </span>
            <span className="font-mono text-[9px] text-ink-soft/70">
              {info.ejemplos.length} variantes
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {info.ejemplos.map((ej) => (
              <span
                key={ej}
                className="inline-flex items-center gap-1.5 rounded-full border border-rule/80 bg-paper-2/90 px-2.5 py-1 text-[11px] font-medium text-ink shadow-2xs hover:border-volt/40 transition-colors"
              >
                <span className={`size-1.5 rounded-full ${activeConfig.colorClasses.dotColor}`} />
                {ej}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Drawer expandido con los 3 criterios del motor */}
      {expandido ? (
        <div className="mt-3.5 pt-3 border-t border-rule/60 text-xs space-y-2 animate-fade-in">
          <p className="font-display text-xs font-bold text-ink flex items-center gap-1.5">
            <HelpCircle className="size-3.5 text-volt" />
            ¿Cómo categoriza el sistema los ejercicios según tu nivel?
          </p>
          <div className="grid gap-2">
            {NIVELES.map((n) => {
              const c = NIVEL_UI_CONFIG[n];
              const I = c.icon;
              const d = NIVEL_DETALLE[n];
              return (
                <div
                  key={n}
                  className="rounded-[12px] border border-rule/50 bg-paper/60 p-2.5 text-[11px] flex gap-2.5 items-start"
                >
                  <div
                    className={`flex size-6 shrink-0 items-center justify-center rounded-[6px] border ${c.colorClasses.iconBg} ${c.colorClasses.iconColor} mt-0.5`}
                  >
                    <I className="size-3 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className="font-semibold text-ink">{NIVEL_LABEL[n]}:</span>{" "}
                    <span className="text-ink-soft">{d.criterioSeleccion}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export type AvanzadoDefaults = {
  split?: string;
  rango?: string;
  volumen?: string;
  rir?: string;
  orden?: string;
  tecnicaAislamientos?: string;
  evitar?: Molestia[];
};

export function GenerarRutinaForm({
  action,
  clienteId,
  tieneRutina = false,
  defaults,
  clienteSexo,
  mostrarAvanzado = false,
  avanzadoDefaults,
}: {
  action: (prev: S, fd: FormData) => Promise<S>;
  clienteId?: string;
  tieneRutina?: boolean;
  defaults?: {
    objetivo?: Objetivo;
    nivel?: Nivel;
    dias?: number;
    preferencia?: PreferenciaEquipo;
    sexo?: Sexo;
    enfasis?: Enfasis[];
    zonasDolor?: Molestia[];
  };
  clienteSexo?: Sexo | null;
  mostrarAvanzado?: boolean;
  avanzadoDefaults?: AvanzadoDefaults;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<S, FormData>(action, {});
  const [enfasis, setEnfasis] = useState<Enfasis[]>(
    defaults?.enfasis ??
      ((defaults?.sexo ?? clienteSexo) === "mujer" ? ["gluteos"] : []),
  );
  const [zonasDolor, setZonasDolor] = useState<Molestia[]>(
    defaults?.zonasDolor ?? [],
  );
  const [modalOpcionesOpen, setModalOpcionesOpen] = useState(false);
  const [preferenciaEquipo, setPreferenciaEquipo] = useState<string>(
    defaults?.preferencia ?? PREFS[0],
  );
  const [dias, setDias] = useState(String(defaults?.dias ?? 3));
  const [objetivo, setObjetivo] = useState<Objetivo>(
    defaults?.objetivo ?? "hipertrofia",
  );
  const [nivel, setNivel] = useState<Nivel>(
    defaults?.nivel ?? "principiante",
  );
  const [split, setSplit] = useState<string>(
    avanzadoDefaults?.split ?? "auto",
  );
  const avanzadoActivo = mostrarAvanzado;
  const splitDiasOk =
    split === "auto" ||
    (SPLIT_DIAS_OK[split as keyof typeof SPLIT_DIAS_OK] ?? []).includes(
      Number(dias),
    );
  const [prefillNota, setPrefillNota] = useState<string | null>(null);

  // "Generar automático con lo que tengo" (builder manual): precarga días y
  // zonas inferidas sin pisar el resto del cuestionario. El submit sigue igual.
  useEffect(() => {
    function aplicar(e: Event) {
      const d = (e as CustomEvent<{ dias: number; enfasis: Enfasis[] }>).detail;
      if (!d) return;
      if (d.dias >= 2 && d.dias <= 6) setDias(String(d.dias));
      setEnfasis(d.enfasis.slice(0, MAX_ENFASIS));
      setPrefillNota(
        `Tomamos ${d.dias} ${d.dias === 1 ? "día" : "días"}` +
          (d.enfasis.length
            ? ` y ${d.enfasis.map((x) => ENFASIS_LABEL[x]).join(", ")}`
            : "") +
          " de tu armado manual. Revisá el resto y generá.",
      );
    }
    window.addEventListener("rutina:prefill", aplicar);
    return () => window.removeEventListener("rutina:prefill", aplicar);
  }, []);

  // El revalidatePath del server action no purga la Router Cache del cliente:
  // tras regenerar con éxito, forzamos un refresh para no mostrar la rutina vieja.
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  function toggleEnfasis(e: Enfasis) {
    setEnfasis((prev) =>
      prev.includes(e)
        ? prev.filter((x) => x !== e)
        : prev.length >= MAX_ENFASIS
          ? prev
          : [...prev, e],
    );
  }

  function toggleDolor(m: Molestia) {
    setZonasDolor((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );
  }

  return (
    <form action={formAction} className="stagger grid gap-4 sm:grid-cols-2">
      {clienteId ? <input type="hidden" name="cliente_id" value={clienteId} /> : null}

      <GuiaPrincipiante />

      <div>
        <Select
          label="Objetivo"
          name="objetivo"
          value={objetivo}
          onChange={(e) => setObjetivo(e.target.value as Objetivo)}
        >
          {OBJETIVOS.map((o) => (
            <option key={o} value={o}>
              {OBJETIVO_LABEL[o]}
            </option>
          ))}
        </Select>
        <p className="mt-1.5 text-xs leading-snug text-ink-soft">
          {OBJETIVO_AYUDA[objetivo]}
        </p>
      </div>

      <Select
        label="Días por semana"
        name="dias"
        value={dias}
        onChange={(e) => setDias(e.target.value)}
      >
        {[2, 3, 4, 5, 6].map((d) => (
          <option key={d} value={d}>
            {d} días
          </option>
        ))}
      </Select>

      <Select
        label="Nivel"
        name="nivel"
        value={nivel}
        onChange={(e) => setNivel(e.target.value as Nivel)}
      >
        {NIVELES.map((n) => (
          <option key={n} value={n}>
            {NIVEL_LABEL[n]}
          </option>
        ))}
      </Select>

      <Select
        label="Sexo"
        name="sexo"
        defaultValue={defaults?.sexo ?? clienteSexo ?? "sin_especificar"}
      >
        {SEXOS.map((s) => (
          <option key={s} value={s}>
            {SEXO_LABEL[s]}
          </option>
        ))}
      </Select>

      <SectorAyudaNivel
        nivelSeleccionado={nivel}
        onSelectNivel={(n) => setNivel(n)}
      />

      {/* INPUTS OCULTOS PARA EL SUBMIT DE NAVEGADOR */}
      <input type="hidden" name="preferencia" value={preferenciaEquipo} />

      <div className="sm:col-span-2">
        <button
          type="button"
          onClick={() => {
            hapticoSeleccion();
            setModalOpcionesOpen(true);
          }}
          className="w-full flex items-center justify-between p-3.5 rounded-[12px] border border-rule bg-paper-2 hover:bg-paper-3 active:scale-[0.99] transition-all text-xs text-ink font-medium"
        >
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="size-4 text-accent" />
            <span>Opciones opcionales: Enfoque, molestias y equipamiento</span>
          </div>
          <div className="flex items-center gap-2">
            {enfasis.length + zonasDolor.length > 0 ? (
              <span className="px-2 py-0.5 rounded-full bg-accent text-accent-contrast font-bold text-[10px]">
                {enfasis.length + zonasDolor.length} activos
              </span>
            ) : (
              <span className="text-ink-soft text-[11px]">Personalizar</span>
            )}
          </div>
        </button>
      </div>

      {/* MODAL SUPERPUESTO DE OPCIONES */}
      {modalOpcionesOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Opciones opcionales"
          onClick={() => setModalOpcionesOpen(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[color:var(--scrim)] p-3 sm:p-4 backdrop-blur-sm animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-[22px] border border-rule bg-paper p-5 sm:p-6 shadow-2xl flex flex-col gap-5 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-3 border-b border-rule pb-3">
              <div>
                <h2 className="text-lg font-bold text-ink leading-tight">
                  Preferencias opcionales
                </h2>
                <p className="text-xs text-ink-soft mt-0.5">
                  Ajustá la zona a enfocar, molestias articulares y equipo disponible.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpcionesOpen(false)}
                className="size-9 shrink-0 inline-flex items-center justify-center rounded-[10px] border border-rule bg-paper-2 text-ink-soft hover:text-ink hover:bg-paper active:scale-90 transition-all"
              >
                <X className="size-4" />
              </button>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-[13px] font-semibold text-ink mb-1.5">
                Zona a enfocar{" "}
                <span className="font-normal text-ink-soft/70 text-xs">
                  (hasta {MAX_ENFASIS})
                </span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {ENFASIS.map((e) => {
                  const on = enfasis.includes(e);
                  return (
                    <label key={e} className="cursor-pointer touch-manipulation">
                      <input
                        type="checkbox"
                        name="enfasis"
                        value={e}
                        checked={on}
                        onChange={() => toggleEnfasis(e)}
                        className="peer sr-only"
                      />
                      <span className="inline-flex h-10 items-center rounded-[8px] border border-rule px-3 text-xs font-medium transition-colors peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-contrast">
                        {ENFASIS_LABEL[e]}
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-ink-soft">
                Se agregan series extra para esa zona muscular.
              </p>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-[13px] font-semibold text-ink mb-1.5">
                Evitar dolor en{" "}
                <span className="font-normal text-ink-soft/70 text-xs">
                  (molestias articulares)
                </span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {MOLESTIAS.map((m) => {
                  const on = zonasDolor.includes(m);
                  return (
                    <label key={m} className="cursor-pointer touch-manipulation">
                      <input
                        type="checkbox"
                        name="zonasDolor"
                        value={m}
                        checked={on}
                        onChange={() => toggleDolor(m)}
                        className="peer sr-only"
                      />
                      <span className="inline-flex h-10 items-center rounded-[8px] border border-rule px-3 text-xs font-medium transition-colors peer-checked:border-danger peer-checked:bg-[color:var(--danger-weak)] peer-checked:text-ink">
                        {MOLESTIA_LABEL[m]}
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-ink-soft">
                Sacamos del plan los ejercicios que cargan esa articulación.
              </p>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-[13px] font-semibold text-ink mb-1.5">
                Equipamiento disponible
              </legend>
              <div className="flex flex-wrap gap-2">
                {PREFS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPreferenciaEquipo(p)}
                    className={`inline-flex h-10 items-center rounded-[8px] border px-3 text-xs font-medium transition-all ${
                      preferenciaEquipo === p
                        ? "border-ink bg-ink text-paper"
                        : "border-rule bg-paper-2 text-ink hover:bg-paper-3"
                    }`}
                  >
                    {PREFERENCIA_EQUIPO_LABEL[p]}
                  </button>
                ))}
              </div>
            </fieldset>

            <button
              type="button"
              onClick={() => setModalOpcionesOpen(false)}
              className="w-full h-11 rounded-[12px] bg-accent text-accent-contrast text-sm font-semibold hover:opacity-95 transition-opacity mt-2"
            >
              Listo
            </button>
          </div>
        </div>
      ) : null}

      {mostrarAvanzado ? (
        <fieldset className="sm:col-span-2 rounded-[6px] border border-rule bg-paper-2 p-4">
          <legend className="px-1.5 text-[13px] font-medium text-ink-soft">
            Ajustes avanzados
          </legend>

          {!avanzadoActivo ? (
            <p className="text-xs leading-snug text-ink-soft">
              Elegí nivel <strong>Avanzado</strong> para desbloquear estos
              ajustes. Con otro nivel se genera el plan estándar.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Select
                  label="Estructura (split)"
                  name="split"
                  value={split}
                  onChange={(e) => setSplit(e.target.value)}
                >
                  {SPLITS.map((s) => (
                    <option key={s} value={s}>
                      {SPLIT_LABEL[s]}
                    </option>
                  ))}
                </Select>
                {!splitDiasOk ? (
                  <p className="mt-1.5 text-xs leading-snug text-ink-soft">
                    Esa estructura rinde mejor con{" "}
                    {(
                      SPLIT_DIAS_OK[split as keyof typeof SPLIT_DIAS_OK] ?? []
                    ).join(" o ")}{" "}
                    días. Con {dias} la armamos igual, repartiendo los días para
                    completar la semana.
                  </p>
                ) : null}
                <Porque clave="frecuencia" />
              </div>

              <div>
                <Select
                  label="Repeticiones"
                  name="rango"
                  defaultValue={avanzadoDefaults?.rango ?? "estandar"}
                >
                  {RANGOS.map((r) => (
                    <option key={r} value={r}>
                      {RANGO_LABEL[r]}
                    </option>
                  ))}
                </Select>
                <Porque clave="dup" />
              </div>

              <div>
                <Select
                  label="Volumen semanal"
                  name="volumen"
                  defaultValue={avanzadoDefaults?.volumen ?? "estandar"}
                >
                  {VOLUMENES.map((v) => (
                    <option key={v} value={v}>
                      {VOLUMEN_LABEL[v]}
                    </option>
                  ))}
                </Select>
                <Porque clave="volumen" />
              </div>

              <div>
                <Select
                  label="Esfuerzo"
                  name="rir"
                  defaultValue={avanzadoDefaults?.rir ?? "2-3"}
                >
                  {RIR_OPCIONES.map((r) => (
                    <option key={r} value={r}>
                      {RIR_CORTO[r] ?? RIR_LABEL[r]}
                    </option>
                  ))}
                </Select>
                <Porque clave="rir" />
              </div>

              <div>
                <Select
                  label="Orden de ejercicios"
                  name="orden"
                  defaultValue={
                    avanzadoDefaults?.orden ?? "compuestos_primero"
                  }
                >
                  {ORDENES.map((o) => (
                    <option key={o} value={o}>
                      {ORDEN_LABEL[o]}
                    </option>
                  ))}
                </Select>
                <Porque clave="orden" />
              </div>

              <div className="sm:col-span-2">
                <Select
                  label="Técnica de intensidad en aislamientos"
                  name="tecnicaAislamientos"
                  defaultValue={
                    avanzadoDefaults?.tecnicaAislamientos ?? "ninguna"
                  }
                >
                  {TECNICAS.map((t) => (
                    <option key={t} value={t}>
                      {TECNICA_LABEL[t]}
                    </option>
                  ))}
                </Select>
                <Porque clave="tecnicas" />
              </div>

              <fieldset className="sm:col-span-2">
                <legend className="mb-1.5 text-[13px] font-medium text-ink-soft">
                  Molestias a evitar{" "}
                  <span className="font-normal text-ink-soft/70">
                    (opcional)
                  </span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {MOLESTIAS.map((m) => (
                    <label
                      key={m}
                      className="cursor-pointer touch-manipulation"
                    >
                      <input
                        type="checkbox"
                        name="evitar"
                        value={m}
                        defaultChecked={avanzadoDefaults?.evitar?.includes(m)}
                        className="peer sr-only"
                      />
                      <span className="inline-flex h-10 items-center rounded-[5px] border border-rule px-3 text-sm transition-colors duration-150 [transition-timing-function:var(--ease-out)] peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:shadow-[0_0_0_3px_rgb(22_24_29_/_0.12)]">
                        {MOLESTIA_LABEL[m]}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="mt-1.5 text-xs leading-snug text-ink-soft">
                  Se sustituyen los ejercicios que suelen molestar esa zona.
                </p>
                <Porque clave="molestia" />
              </fieldset>
            </div>
          )}
        </fieldset>
      ) : null}

      {prefillNota ? (
        <p className="sm:col-span-2 text-xs leading-snug text-ink-soft animate-fade-in">
          {prefillNota}
        </p>
      ) : null}

      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          loading={pending}
          variant={tieneRutina ? "volt" : "primary"}
        >
          {pending
            ? "Generando…"
            : tieneRutina
              ? "Regenerar rutina"
              : "Generar rutina"}
        </Button>
        {tieneRutina ? (
          <span className="text-xs text-ink-soft">
            Regenerar reemplaza los ejercicios actuales.
          </span>
        ) : null}
        {state.error ? (
          <p className="text-sm text-danger animate-error">{state.error}</p>
        ) : null}
        {state.ok ? <p className="text-sm text-ok">{state.ok}</p> : null}
      </div>
    </form>
  );
}
