"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import {
  Sparkles,
  RefreshCw,
  HelpCircle,
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertCircle,
  Loader2,
  Dumbbell,
  Send,
  PartyPopper,
  Flame,
  Trophy,
} from "lucide-react";
import {
  hapticoImpactoSuave,
  iniciarAudioHaptico,
  hapticoExito,
  hapticoError,
  hapticoSeleccion,
} from "@/lib/ui/hapticos";
import {
  buscarReemplazoMaquinaOcupada,
  obtenerTipsTecnica,
  reportarEjercicioFaltante,
  obtenerResumenSesionHoy,
} from "@/app/mi/rutina/asistente-actions";
import { obtenerClasificacionEjercicio } from "@/lib/rutina/clasificacion-muscular";

interface Alternativa {
  id: string;
  nombre: string;
  equipo: string;
  imagen_url: string | null;
  grupo_muscular?: string | null;
}

// Detección de molestia articular por lenguaje natural: regex local,
// 0ms de latencia, sin llamadas a IA. Mapea la palabra clave al grupo
// anatómico a evitar en las alternativas sugeridas.
const MOLESTIA_REGEX: { patron: RegExp; etiqueta: string; evitarGrupo: string[] }[] = [
  { patron: /hombro/i, etiqueta: "hombro", evitarGrupo: ["hombros"] },
  { patron: /rodill/i, etiqueta: "rodilla", evitarGrupo: ["piernas"] },
  { patron: /codo/i, etiqueta: "codo", evitarGrupo: ["biceps", "triceps"] },
  { patron: /espalda|lumbar/i, etiqueta: "espalda baja", evitarGrupo: ["espalda"] },
  { patron: /muñeca|muneca/i, etiqueta: "muñeca", evitarGrupo: ["biceps", "triceps", "hombros"] },
  { patron: /cadera/i, etiqueta: "cadera", evitarGrupo: ["piernas"] },
];

function detectarMolestia(texto: string) {
  return MOLESTIA_REGEX.find((m) => m.patron.test(texto)) ?? null;
}

interface Props {
  ejercicioId?: string;
  ejercicioNombre?: string;
  /** Contenido del disparador. Debe ser NO interactivo (un icono):
   *  se renderiza dentro del <button> del asistente. */
  trigger?: React.ReactNode;
  onSeleccionarAlternativa?: (nuevo: any) => void;
}

type Vista = "menu" | "maquina" | "tecnica" | "resumen";

type ResumenSesion = { kgTotales: number; prs: number; rachaDias: number };

export function PulpoAsistenteChat({
  ejercicioId,
  ejercicioNombre,
  trigger,
  onSeleccionarAlternativa,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState<Vista>("menu");
  const [cargando, setCargando] = useState(false);
  const [alternativas, setAlternativas] = useState<Alternativa[]>([]);
  const [tecnicaData, setTecnicaData] = useState<{
    nombre: string;
    descripcion: string | null;
    imagen_url: string | null;
    tips_ia: string | null;
  } | null>(null);
  const [faltaContenidoTecnica, setFaltaContenidoTecnica] = useState(false);
  const [reporteEnviado, setReporteEnviado] = useState(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [textoLibre, setTextoLibre] = useState("");
  const [molestiaDetectada, setMolestiaDetectada] = useState<string | null>(null);
  const [resumen, setResumen] = useState<ResumenSesion | null>(null);

  const abrir = () => {
    iniciarAudioHaptico();
    hapticoImpactoSuave();
    setVista("menu");
    setMensajeError(null);
    setReporteEnviado(false);
    setAbierto(true);
  };

  const cerrar = () => {
    hapticoImpactoSuave();
    setAbierto(false);
    setTimeout(() => {
      setVista("menu");
      setMensajeError(null);
    }, 250);
  };

  const volverAlMenu = () => {
    hapticoSeleccion();
    setVista("menu");
    setMensajeError(null);
    setMolestiaDetectada(null);
  };

  const handleMaquinaOcupada = async (evitarGrupo?: string[]) => {
    if (!ejercicioId) {
      setMensajeError("No se identificó el ejercicio actual.");
      setVista("maquina");
      return;
    }
    hapticoImpactoSuave();
    setVista("maquina");
    setCargando(true);
    setMensajeError(null);

    const res = await buscarReemplazoMaquinaOcupada(ejercicioId);
    setCargando(false);

    if (!res.ok) {
      hapticoError();
      setMensajeError(res.error || "No se pudieron buscar alternativas.");
      return;
    }

    if (res.alternativas.length === 0) {
      hapticoError();
      setAlternativas([]);
      setMensajeError(
        "No encontramos ejercicios alternativos cargados en la base de datos para este patrón. Ya notificamos al panel de desarrollo para agregarlos con su GIF."
      );
      return;
    }

    let lista = res.alternativas as Alternativa[];
    if (evitarGrupo?.length) {
      const filtrada = lista.filter(
        (a) => !evitarGrupo.includes(obtenerClasificacionEjercicio(a).grupo),
      );
      // Si el filtro deja la lista vacía, mostramos igual las originales
      // (mejor una alternativa imperfecta que ninguna).
      lista = filtrada.length > 0 ? filtrada : lista;
    }

    hapticoExito();
    setAlternativas(lista);
  };

  // Detección de molestia por lenguaje natural: regex local sobre el texto
  // libre, sin IA. Si matchea, dispara la sustitución evitando esa zona.
  const handleTextoLibre = () => {
    const texto = textoLibre.trim();
    if (!texto) return;
    const match = detectarMolestia(texto);
    hapticoImpactoSuave();
    setTextoLibre("");
    if (match) {
      setMolestiaDetectada(match.etiqueta);
      handleMaquinaOcupada(match.evitarGrupo);
    } else {
      setMolestiaDetectada(null);
      setVista("maquina");
      setMensajeError(
        "No reconocimos una articulación en el mensaje. Probá con: hombro, rodilla, codo, espalda, muñeca o cadera.",
      );
    }
  };

  const handleResumen = async () => {
    hapticoImpactoSuave();
    setVista("resumen");
    setCargando(true);
    setMensajeError(null);
    const res = await obtenerResumenSesionHoy();
    setCargando(false);
    if (!res.ok) {
      hapticoError();
      setMensajeError(res.error || "No se pudo calcular el resumen.");
      return;
    }
    hapticoExito();
    setResumen({ kgTotales: res.kgTotales, prs: res.prs, rachaDias: res.rachaDias });
  };

  const handleTecnica = async () => {
    if (!ejercicioId) {
      setMensajeError("No se identificó el ejercicio actual.");
      setVista("tecnica");
      return;
    }
    hapticoImpactoSuave();
    setVista("tecnica");
    setCargando(true);
    setMensajeError(null);

    const res = await obtenerTipsTecnica(ejercicioId);
    setCargando(false);

    if (!res.ok) {
      hapticoError();
      setMensajeError(
        res.error || "Este ejercicio no está registrado en la base de datos."
      );
      return;
    }

    hapticoExito();
    setTecnicaData(res.ejercicio);
    setFaltaContenidoTecnica(Boolean(res.faltaContenido));
  };

  const handleSeleccionar = (alt: Alternativa) => {
    hapticoExito();
    if (onSeleccionarAlternativa) {
      onSeleccionarAlternativa(alt);
    }
    cerrar();
  };

  const handleReportarFaltante = async () => {
    hapticoImpactoSuave();
    setReporteEnviado(true);
    await reportarEjercicioFaltante({
      ejercicioId,
      ejercicioNombre,
      motivo: "El usuario solicitó cargar el ejercicio y su GIF en el catálogo.",
    });
    hapticoExito();
  };

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        aria-label="Asistente de ejercicio"
        className="grid size-8 shrink-0 place-items-center rounded-[8px] text-accent hover:text-accent/80 bg-accent/10 transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-90 active:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        {trigger ?? <Sparkles className="size-4" />}
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <>
            {/* Backdrop estilo iOS */}
            {abierto && (
              <div
                className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200"
                onClick={cerrar}
                aria-hidden
              />
            )}

            {/* Action Sheet Bottom Sheet */}
            <div
              className={`fixed inset-x-0 bottom-0 z-50 transform transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                abierto ? "translate-y-0" : "translate-y-full pointer-events-none"
              }`}
              role={abierto ? "dialog" : undefined}
              aria-modal={abierto ? "true" : undefined}
              aria-hidden={abierto ? undefined : "true"}
            >
        <div className="mx-auto max-w-md bg-paper border-t border-rule rounded-t-[24px] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
          {/* Grab Handle */}
          <div className="w-9 h-1 rounded-full bg-rule-light mx-auto mt-2.5 mb-1" />

          {/* Header del Sheet */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-rule/70">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-7 rounded-[8px] bg-accent/10 text-accent grid place-items-center shrink-0">
                <Sparkles className="size-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-ink truncate leading-tight">
                  {vista === "menu"
                    ? "Asistente de Ejercicio"
                    : vista === "maquina"
                    ? "Máquina Ocupada"
                    : vista === "resumen"
                    ? "Resumen de Sesión"
                    : "Técnica & Consejos"}
                </h3>
                <p className="text-[11px] text-ink-muted truncate">
                  {ejercicioNombre ? ejercicioNombre : "Guía rápida & variantes"}
                </p>
              </div>
            </div>

            <button
              onClick={cerrar}
              aria-label="Cerrar"
              className="size-7 rounded-full bg-rule/50 text-ink-muted hover:text-ink grid place-items-center active:scale-95 transition-transform"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Contenido del Sheet */}
          <div className="p-4 overflow-y-auto space-y-3 pb-8">
            {/* VISTA 1: MENÚ PRINCIPAL */}
            {vista === "menu" && (
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => handleMaquinaOcupada()}
                  className="w-full text-left bg-canvas border border-rule hover:border-rule-strong rounded-[14px] p-3.5 flex items-center justify-between gap-3 active:scale-[0.99] transition-[transform,border-color]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-9 rounded-[10px] bg-amber-500/10 text-amber-500 grid place-items-center shrink-0">
                      <RefreshCw className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">
                        Máquina o equipo ocupado
                      </p>
                      <p className="text-xs text-ink-muted">
                        3 alternativas con el mismo patrón muscular
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-ink-muted shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={handleTecnica}
                  className="w-full text-left bg-canvas border border-rule hover:border-rule-strong rounded-[14px] p-3.5 flex items-center justify-between gap-3 active:scale-[0.99] transition-[transform,border-color]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-9 rounded-[10px] bg-accent/10 text-accent grid place-items-center shrink-0">
                      <HelpCircle className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">
                        ¿Cómo se hace? Técnica & GIF
                      </p>
                      <p className="text-xs text-ink-muted">
                        Postura adecuada y ejecución correcta
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-ink-muted shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={handleResumen}
                  className="w-full text-left bg-canvas border border-rule hover:border-rule-strong rounded-[14px] p-3.5 flex items-center justify-between gap-3 active:scale-[0.99] transition-[transform,border-color]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-9 rounded-[10px] bg-emerald-500/10 text-emerald-500 grid place-items-center shrink-0">
                      <PartyPopper className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">
                        Resumen de hoy
                      </p>
                      <p className="text-xs text-ink-muted">
                        Kg movidos, PRs y racha actual
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-ink-muted shrink-0" />
                </button>

                {/* Texto libre: detección de molestia por lenguaje natural */}
                <div className="bg-canvas border border-rule rounded-[14px] p-3 space-y-2">
                  <p className="text-xs font-medium text-ink">
                    ¿Te molesta algo? Contale al Pulpo
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={textoLibre}
                      onChange={(e) => setTextoLibre(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleTextoLibre()}
                      placeholder="Ej: me duele el hombro"
                      className="flex-1 min-w-0 h-9 rounded-[10px] border border-rule bg-paper px-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
                    />
                    <button
                      type="button"
                      onClick={handleTextoLibre}
                      disabled={!textoLibre.trim()}
                      aria-label="Enviar"
                      className="size-9 shrink-0 grid place-items-center rounded-[10px] bg-accent text-accent-fg disabled:opacity-40 active:scale-95 transition-transform"
                    >
                      <Send className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Reporte rápido opcional */}
                <div className="pt-2 text-center">
                  {reporteEnviado ? (
                    <div className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full">
                      <Check className="size-3.5" />
                      <span>Reporte enviado al panel dev para sumar el GIF</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleReportarFaltante}
                      className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink underline underline-offset-2 py-1"
                    >
                      <Send className="size-3" />
                      <span>¿Falta el ejercicio o el GIF? Avisar al panel dev</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* VISTA 2: ALTERNATIVAS (MÁQUINA OCUPADA) */}
            {vista === "maquina" && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={volverAlMenu}
                  className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink active:scale-95 transition-transform"
                >
                  <ChevronLeft className="size-3.5" />
                  <span>Volver a opciones</span>
                </button>

                {cargando ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2 text-ink-muted">
                    <Loader2 className="size-6 animate-spin text-accent" />
                    <p className="text-xs font-medium">
                      Buscando variantes con otro equipo...
                    </p>
                  </div>
                ) : mensajeError ? (
                  <div className="bg-canvas border border-rule rounded-[14px] p-4 text-center space-y-3">
                    <AlertCircle className="size-6 text-amber-500 mx-auto" />
                    <p className="text-xs text-ink-muted leading-relaxed">
                      {mensajeError}
                    </p>
                    <button
                      type="button"
                      onClick={volverAlMenu}
                      className="px-4 py-2 rounded-[10px] bg-rule/50 text-xs font-medium text-ink active:scale-95 transition-transform"
                    >
                      Volver
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {molestiaDetectada ? (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 rounded-[10px] px-2.5 py-1.5">
                        Detectamos molestia en {molestiaDetectada}: priorizamos variantes que no la fuerzan.
                      </p>
                    ) : (
                      <p className="text-xs text-ink-muted font-medium">
                        Variantes directas que podés usar ya mismo:
                      </p>
                    )}
                    {alternativas.map((alt) => {
                      const clasif = obtenerClasificacionEjercicio(alt);
                      return (
                        <div
                          key={alt.id}
                          className="bg-canvas border border-rule rounded-[14px] p-3 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {alt.imagen_url ? (
                              <img
                                src={alt.imagen_url}
                                alt={alt.nombre}
                                className="size-11 rounded-[8px] object-cover bg-rule/30 shrink-0 border border-rule/50"
                              />
                            ) : (
                              <div className="size-11 rounded-[8px] bg-rule/30 text-ink-muted grid place-items-center shrink-0">
                                <Dumbbell className="size-5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-ink truncate">
                                {alt.nombre}
                              </p>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1">
                                <span className="inline-block text-[11px] px-1.5 py-0.5 rounded-full bg-rule text-ink-muted font-medium capitalize">
                                  {alt.equipo}
                                </span>
                                <span className="inline-block text-[10.5px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                                  {clasif.label}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSeleccionar(alt)}
                            className="px-3.5 py-1.5 rounded-[10px] bg-accent text-accent-fg text-xs font-semibold shrink-0 active:scale-95 transition-transform shadow-sm"
                          >
                            Elegir
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* VISTA 3: TÉCNICA Y GIF */}
            {vista === "tecnica" && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={volverAlMenu}
                  className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink active:scale-95 transition-transform"
                >
                  <ChevronLeft className="size-3.5" />
                  <span>Volver a opciones</span>
                </button>

                {cargando ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2 text-ink-muted">
                    <Loader2 className="size-6 animate-spin text-accent" />
                    <p className="text-xs font-medium">
                      Cargando guía técnica...
                    </p>
                  </div>
                ) : mensajeError ? (
                  <div className="bg-canvas border border-rule rounded-[14px] p-4 text-center space-y-3">
                    <AlertCircle className="size-6 text-amber-500 mx-auto" />
                    <p className="text-xs text-ink-muted leading-relaxed">
                      {mensajeError}
                    </p>
                    <p className="text-[11px] text-ink-muted/80 bg-rule/30 p-2 rounded-[8px]">
                      Aviso enviado automáticamente al panel dev para cargar la ficha con GIF.
                    </p>
                    <button
                      type="button"
                      onClick={volverAlMenu}
                      className="px-4 py-2 rounded-[10px] bg-rule/50 text-xs font-medium text-ink active:scale-95 transition-transform"
                    >
                      Volver
                    </button>
                  </div>
                ) : tecnicaData ? (
                  <div className="space-y-3">
                    {tecnicaData.imagen_url ? (
                      <div className="rounded-[14px] overflow-hidden border border-rule bg-canvas flex items-center justify-center max-h-52">
                        <img
                          src={tecnicaData.imagen_url}
                          alt={tecnicaData.nombre}
                          className="w-full max-h-52 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="bg-canvas border border-rule rounded-[14px] p-3 text-center space-y-1">
                        <p className="text-xs font-medium text-amber-500">
                          GIF en preparación
                        </p>
                        <p className="text-[11px] text-ink-muted">
                          Ya enviamos un reporte al panel dev para incorporar la animación gráfica de este ejercicio.
                        </p>
                      </div>
                    )}

                    <div className="bg-canvas border border-rule rounded-[14px] p-3.5 space-y-2">
                      <p className="text-xs font-bold text-ink uppercase tracking-wider">
                        Puntos Clave de Ejecución
                      </p>
                      <p className="text-xs text-ink leading-relaxed whitespace-pre-line">
                        {tecnicaData.tips_ia ||
                          tecnicaData.descripcion ||
                          "• Mantené la columna en posición neutra durante todo el movimiento.\n• Controlá la fase excéntrica (bajada) en 2 segundos.\n• Exhalá con el esfuerzo máximo y evitá tirones bruscos."}
                      </p>
                    </div>

                    {faltaContenidoTecnica && (
                      <p className="text-[11px] text-ink-muted text-center italic">
                        Nota: Se registró una solicitud automática en el panel de desarrollo para completar la ficha oficial con GIF.
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={cerrar}
                      className="w-full py-2.5 rounded-[12px] bg-rule/50 hover:bg-rule text-ink font-semibold text-xs active:scale-95 transition-transform"
                    >
                      Entendido
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            {/* VISTA 4: RESUMEN DE SESIÓN */}
            {vista === "resumen" && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={volverAlMenu}
                  className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink active:scale-95 transition-transform"
                >
                  <ChevronLeft className="size-3.5" />
                  <span>Volver a opciones</span>
                </button>

                {cargando ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2 text-ink-muted">
                    <Loader2 className="size-6 animate-spin text-accent" />
                    <p className="text-xs font-medium">Calculando resumen de hoy...</p>
                  </div>
                ) : mensajeError ? (
                  <div className="bg-canvas border border-rule rounded-[14px] p-4 text-center space-y-3">
                    <AlertCircle className="size-6 text-amber-500 mx-auto" />
                    <p className="text-xs text-ink-muted leading-relaxed">{mensajeError}</p>
                  </div>
                ) : resumen ? (
                  <div className="rounded-[16px] border border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 to-transparent p-4 text-center space-y-3">
                    <div className="size-12 mx-auto rounded-full bg-emerald-500/15 text-emerald-500 grid place-items-center">
                      <PartyPopper className="size-6" />
                    </div>
                    <p className="text-sm font-bold text-ink">¡Buen entreno de hoy! 🐙</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-canvas border border-rule rounded-[12px] p-2.5">
                        <Dumbbell className="size-4 text-accent mx-auto mb-1" />
                        <p className="text-base font-bold text-ink leading-none">{resumen.kgTotales}</p>
                        <p className="text-[10px] text-ink-muted mt-1">kg movidos</p>
                      </div>
                      <div className="bg-canvas border border-rule rounded-[12px] p-2.5">
                        <Trophy className="size-4 text-amber-500 mx-auto mb-1" />
                        <p className="text-base font-bold text-ink leading-none">{resumen.prs}</p>
                        <p className="text-[10px] text-ink-muted mt-1">
                          {resumen.prs === 1 ? "PR nuevo" : "PRs nuevos"}
                        </p>
                      </div>
                      <div className="bg-canvas border border-rule rounded-[12px] p-2.5">
                        <Flame className="size-4 text-orange-500 mx-auto mb-1" />
                        <p className="text-base font-bold text-ink leading-none">{resumen.rachaDias}</p>
                        <p className="text-[10px] text-ink-muted mt-1">días de racha</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
          </>,
          document.body
        )}
    </>
  );
}

