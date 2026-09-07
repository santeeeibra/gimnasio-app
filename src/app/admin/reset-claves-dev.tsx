"use client";

import { useState, useEffect, useTransition } from "react";
import {
  KeyRound,
  ShieldCheck,
  User,
  Users,
  Copy,
  Check,
  RotateCcw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import {
  resetearClaveUsuarioAction,
  resetearClavesGimnasioAction,
  obtenerUsuariosGimnasioDev,
} from "./actions";
import {
  hapticoSeleccion,
  hapticoImpactoMedio,
  hapticoExito,
  hapticoError,
} from "@/lib/ui/hapticos";

type GymOption = {
  id: string;
  nombre: string;
  slug: string;
};

type SocioItem = {
  id: string;
  nombre: string | null;
  dni: string;
  estado_cuota?: string | null;
};

type DuenoItem = {
  id: string;
  nombre: string | null;
  dni: string;
  slug: string;
};

type ResultadoReset = {
  nombre?: string;
  dni?: string;
  email?: string;
  clave: string;
  slug?: string;
  rol?: string;
  mensaje: string;
  afectados?: number;
};

export function ResetClavesDev({
  gyms,
  gymInicialId,
}: {
  gyms: GymOption[];
  gymInicialId?: string;
}) {
  const [selectedGymId, setSelectedGymId] = useState<string>(
    gymInicialId || gyms[0]?.id || ""
  );
  const [modo, setModo] = useState<"dueno" | "socio" | "todos">("dueno");
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
  const [dueno, setDueno] = useState<DuenoItem | null>(null);
  const [socios, setSocios] = useState<SocioItem[]>([]);
  const [selectedSocioId, setSelectedSocioId] = useState<string>("");
  const [busquedaSocio, setBusquedaSocio] = useState<string>("");
  const [clavePersonalizada, setClavePersonalizada] = useState<string>("");
  const [usarClavePersonalizada, setUsarClavePersonalizada] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<ResultadoReset | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiadoKey, setCopiadoKey] = useState<string | null>(null);

  // Cargar usuarios cuando cambia el gym seleccionado
  useEffect(() => {
    if (!selectedGymId) return;

    let cancelado = false;
    setCargandoUsuarios(true);
    setErrorMsg(null);
    setResultado(null);

    obtenerUsuariosGimnasioDev(selectedGymId)
      .then((res) => {
        if (cancelado) return;
        if (res.ok) {
          setDueno(res.dueno);
          setSocios(res.socios);
          if (res.socios.length > 0) {
            setSelectedSocioId(res.socios[0].id);
          } else {
            setSelectedSocioId("");
          }
        }
      })
      .catch((err) => {
        if (!cancelado) {
          console.error("Error cargando usuarios del gimnasio:", err);
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoUsuarios(false);
      });

    return () => {
      cancelado = true;
    };
  }, [selectedGymId]);

  const gymActual = gyms.find((g) => g.id === selectedGymId);

  const sociosFiltrados = socios.filter((s) => {
    if (!busquedaSocio.trim()) return true;
    const q = busquedaSocio.toLowerCase();
    const nombre = (s.nombre ?? "").toLowerCase();
    const dni = s.dni.toLowerCase();
    return nombre.includes(q) || dni.includes(q);
  });

  const socioSeleccionado = socios.find((s) => s.id === selectedSocioId);

  const copiarTexto = async (texto: string, claveId: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      hapticoSeleccion();
      setCopiadoKey(claveId);
      setTimeout(() => {
        setCopiadoKey((prev) => (prev === claveId ? null : prev));
      }, 2500);
    } catch {
      // fallback
    }
  };

  const ejecutarReset = () => {
    setErrorMsg(null);
    setResultado(null);
    hapticoImpactoMedio();

    const claveParam = usarClavePersonalizada ? clavePersonalizada.trim() : undefined;

    startTransition(async () => {
      try {
        if (modo === "dueno") {
          if (!dueno) {
            setErrorMsg("No hay un dueño registrado en este gimnasio.");
            hapticoError();
            return;
          }

          const res = await resetearClavesGimnasioAction({
            gimnasioId: selectedGymId,
            objetivo: "dueno",
            nuevaClave: claveParam,
          });

          if (!res.ok) {
            setErrorMsg(res.msg);
            hapticoError();
            return;
          }

          hapticoExito();
          setResultado({
            nombre: dueno.nombre ?? undefined,
            dni: dueno.dni,
            email: `${dueno.dni}@${gymActual?.slug ?? "gym"}.gym.local`,
            clave: res.clave || `gym${dueno.dni.replace(/\D/g, "").slice(-4)}`,
            slug: gymActual?.slug,
            rol: "Dueño",
            mensaje: "¡Contraseña del dueño restablecida con éxito!",
          });
        } else if (modo === "socio") {
          if (!selectedSocioId) {
            setErrorMsg("Por favor seleccioná un socio.");
            hapticoError();
            return;
          }

          const res = await resetearClaveUsuarioAction({
            profileId: selectedSocioId,
            nuevaClave: claveParam,
          });

          if (!res.ok) {
            setErrorMsg(res.msg);
            hapticoError();
            return;
          }

          hapticoExito();
          setResultado({
            nombre: res.nombre,
            dni: res.dni,
            email: res.email,
            clave: res.clave || "",
            slug: res.slug,
            rol: "Socio",
            mensaje: res.msg,
          });
        } else if (modo === "todos") {
          const confirmar = window.confirm(
            `¿Estás seguro de restablecer las contraseñas de los ${socios.length} socios de ${gymActual?.nombre}? Cada socio volverá a su clave inicial (gym<últimos 4 del DNI>).`
          );
          if (!confirmar) return;

          const res = await resetearClavesGimnasioAction({
            gimnasioId: selectedGymId,
            objetivo: "todos_socios",
            nuevaClave: claveParam,
          });

          if (!res.ok) {
            setErrorMsg(res.msg);
            hapticoError();
            return;
          }

          hapticoExito();
          setResultado({
            clave: "(clave individual gymXXXX)",
            mensaje: res.msg,
            afectados: res.afectados,
            slug: gymActual?.slug,
          });
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Error inesperado al restablecer.");
        hapticoError();
      }
    });
  };

  return (
    <div className="card-cut rounded-[18px] border border-rule/80 bg-paper-2/95 p-5 shadow-sm backdrop-blur-md">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule/70 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-[12px] bg-volt text-volt-ink shadow-sm">
            <KeyRound className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-ink">
                Reseteador Rápido de Contraseñas
              </h2>
              <span className="rounded-full bg-volt/20 px-2 py-0.5 text-[10px] font-black uppercase text-volt-ink border border-volt/30">
                Dev & Soporte
              </span>
            </div>
            <p className="text-xs text-ink-soft">
              Restablecé contraseñas por gimnasio completo, a dueños o a socios particulares
            </p>
          </div>
        </div>

        {gymActual && (
          <Link
            href={`/admin/gimnasios/${gymActual.id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-rule/80 bg-paper px-3 py-1 text-xs font-medium text-ink transition-colors hover:bg-paper-2 hover:border-ink"
          >
            <span>Ver gym #{gymActual.slug}</span>
            <ExternalLink className="size-3 text-ink-soft" />
          </Link>
        )}
      </div>

      <div className="mt-5 space-y-5">
        {/* FILA 1: SELECTOR DE GIMNASIO */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
            1. Seleccioná el Gimnasio
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              value={selectedGymId}
              onChange={(e) => {
                hapticoSeleccion();
                setSelectedGymId(e.target.value);
              }}
              className="w-full rounded-[12px] border border-rule bg-paper px-3 py-2.5 text-sm font-medium text-ink shadow-sm transition-colors focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
            >
              {gyms.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre} ({g.slug})
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2 rounded-[12px] border border-rule/60 bg-paper/60 px-3.5 py-2 text-xs text-ink-soft">
              {cargandoUsuarios ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="size-3.5 animate-spin text-ink" />
                  <span>Cargando usuarios del gimnasio...</span>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <span>
                    Dueño: <strong className="text-ink">{dueno?.nombre || "No asignado"}</strong>
                  </span>
                  <span className="rounded-full bg-paper-2 px-2 py-0.5 font-mono text-[11px] font-bold text-ink">
                    {socios.length} socios
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FILA 2: OBJETIVO DEL RESET (TABS SEGMENTED) */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-ink-soft mb-1.5">
            2. ¿A quién querés resetearle la contraseña?
          </label>
          <div className="grid grid-cols-3 gap-2 rounded-[14px] bg-paper p-1.5 border border-rule">
            <button
              type="button"
              onClick={() => {
                hapticoSeleccion();
                setModo("dueno");
              }}
              className={`flex items-center justify-center gap-1.5 rounded-[10px] py-2 text-xs font-bold transition-all ${
                modo === "dueno"
                  ? "bg-ink text-paper shadow-sm"
                  : "text-ink-soft hover:text-ink hover:bg-paper-2/50"
              }`}
            >
              <ShieldCheck className="size-3.5" />
              <span>Dueño del Gym</span>
            </button>

            <button
              type="button"
              onClick={() => {
                hapticoSeleccion();
                setModo("socio");
              }}
              className={`flex items-center justify-center gap-1.5 rounded-[10px] py-2 text-xs font-bold transition-all ${
                modo === "socio"
                  ? "bg-ink text-paper shadow-sm"
                  : "text-ink-soft hover:text-ink hover:bg-paper-2/50"
              }`}
            >
              <User className="size-3.5" />
              <span>Socio Particular</span>
            </button>

            <button
              type="button"
              onClick={() => {
                hapticoSeleccion();
                setModo("todos");
              }}
              className={`flex items-center justify-center gap-1.5 rounded-[10px] py-2 text-xs font-bold transition-all ${
                modo === "todos"
                  ? "bg-ink text-paper shadow-sm"
                  : "text-ink-soft hover:text-ink hover:bg-paper-2/50"
              }`}
            >
              <Users className="size-3.5" />
              <span>Todos los Socios</span>
            </button>
          </div>
        </div>

        {/* DETALLES ESPECÍFICOS SEGÚN EL MODO */}
        {modo === "dueno" && (
          <div className="rounded-[14px] border border-rule/70 bg-paper/70 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink">Datos del Dueño:</span>
              <span className="text-[11px] font-mono text-ink-soft">slug: {gymActual?.slug}</span>
            </div>
            {dueno ? (
              <div className="grid gap-2 sm:grid-cols-3 text-xs">
                <div className="rounded-[10px] bg-paper-2 px-3 py-2">
                  <span className="text-ink-soft block text-[11px]">Nombre</span>
                  <span className="font-bold text-ink">{dueno.nombre || "Sin nombre"}</span>
                </div>
                <div className="rounded-[10px] bg-paper-2 px-3 py-2">
                  <span className="text-ink-soft block text-[11px]">DNI</span>
                  <span className="font-mono font-bold text-ink">{dueno.dni}</span>
                </div>
                <div className="rounded-[10px] bg-paper-2 px-3 py-2">
                  <span className="text-ink-soft block text-[11px]">Clave por defecto</span>
                  <code className="font-mono font-bold text-ok">
                    gym{dueno.dni.replace(/\D/g, "").slice(-4)}
                  </code>
                </div>
              </div>
            ) : (
              <p className="text-xs text-ink-soft">
                Este gimnasio no tiene un usuario con rol dueño asignado.
              </p>
            )}
          </div>
        )}

        {modo === "socio" && (
          <div className="rounded-[14px] border border-rule/70 bg-paper/70 p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-ink">
                Seleccionar Socio ({socios.length} registrados):
              </span>
              <input
                type="text"
                placeholder="Filtrar por nombre o DNI..."
                value={busquedaSocio}
                onChange={(e) => setBusquedaSocio(e.target.value)}
                className="rounded-[8px] border border-rule bg-paper px-2.5 py-1 text-xs text-ink focus:border-ink focus:outline-none"
              />
            </div>

            {socios.length === 0 ? (
              <p className="text-xs text-ink-soft py-2">
                No hay socios registrados en este gimnasio. Podés cargarlos desde la pantalla del
                gimnasio o usar &quot;Importar socios&quot;.
              </p>
            ) : (
              <div className="space-y-2">
                <select
                  value={selectedSocioId}
                  onChange={(e) => {
                    hapticoSeleccion();
                    setSelectedSocioId(e.target.value);
                  }}
                  className="w-full rounded-[10px] border border-rule bg-paper px-3 py-2 text-xs font-medium text-ink focus:border-ink focus:outline-none"
                >
                  {sociosFiltrados.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre || "(sin nombre)"} — DNI {s.dni}{" "}
                      {s.estado_cuota ? `[${s.estado_cuota}]` : ""}
                    </option>
                  ))}
                </select>

                {socioSeleccionado && (
                  <div className="grid gap-2 sm:grid-cols-3 text-xs pt-1">
                    <div className="rounded-[10px] bg-paper-2 px-3 py-2">
                      <span className="text-ink-soft block text-[11px]">Socio</span>
                      <span className="font-bold text-ink">
                        {socioSeleccionado.nombre || "(sin nombre)"}
                      </span>
                    </div>
                    <div className="rounded-[10px] bg-paper-2 px-3 py-2">
                      <span className="text-ink-soft block text-[11px]">DNI</span>
                      <span className="font-mono font-bold text-ink">{socioSeleccionado.dni}</span>
                    </div>
                    <div className="rounded-[10px] bg-paper-2 px-3 py-2">
                      <span className="text-ink-soft block text-[11px]">Clave por defecto</span>
                      <code className="font-mono font-bold text-ok">
                        gym{socioSeleccionado.dni.replace(/\D/g, "").slice(-4)}
                      </code>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {modo === "todos" && (
          <div className="rounded-[14px] border border-warn/40 bg-warn/10 p-3.5 text-xs text-ink space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-warn">
              <AlertCircle className="size-4 shrink-0" />
              <span>Acción masiva para todos los socios de {gymActual?.nombre}</span>
            </div>
            <p className="text-ink-soft leading-relaxed">
              Se restablecerá la contraseña de los <strong>{socios.length} socios</strong> a su clave
              inicial personalizada por DNI (<code>gym&lt;últimos 4 dígitos&gt;</code>). Al entrar,
              el sistema les solicitará definir una contraseña nueva.
            </p>
          </div>
        )}

        {/* OPCIÓN DE CLAVE PERSONALIZADA */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <label className="flex items-center gap-2 text-xs font-medium text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={usarClavePersonalizada}
              onChange={(e) => {
                hapticoSeleccion();
                setUsarClavePersonalizada(e.target.checked);
              }}
              className="rounded border-rule text-ink focus:ring-ink"
            />
            <span>Definir una contraseña fija en lugar del estándar (gymXXXX)</span>
          </label>

          {usarClavePersonalizada && (
            <input
              type="text"
              placeholder="Ej: gym1234 o nuevaClave2026"
              value={clavePersonalizada}
              onChange={(e) => setClavePersonalizada(e.target.value)}
              className="rounded-[8px] border border-rule bg-paper px-3 py-1 text-xs font-mono text-ink focus:border-ink focus:outline-none"
            />
          )}
        </div>

        {/* BOTÓN PRINCIPAL DE ACCIÓN */}
        <div>
          <button
            type="button"
            onClick={ejecutarReset}
            disabled={
              isPending ||
              cargandoUsuarios ||
              (modo === "dueno" && !dueno) ||
              (modo === "socio" && !selectedSocioId) ||
              (modo === "todos" && socios.length === 0)
            }
            className="w-full inline-flex items-center justify-center gap-2 rounded-[14px] bg-ink px-4 py-3 text-sm font-bold text-paper shadow-sm transition-all hover:brightness-125 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Restableciendo contraseña en Supabase Auth...</span>
              </>
            ) : (
              <>
                <RotateCcw className="size-4 text-volt" />
                <span>
                  {modo === "dueno"
                    ? `Resetear Contraseña del Dueño (${dueno?.nombre || "Dueño"})`
                    : modo === "socio"
                    ? `Resetear Contraseña de ${socioSeleccionado?.nombre || "Socio"}`
                    : `Resetear Contraseñas de los ${socios.length} Socios`}
                </span>
              </>
            )}
          </button>
        </div>

        {/* MENSAJE DE ERROR */}
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-[12px] border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-xs font-medium text-danger">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* RESULTADO EXITOSO */}
        {resultado && (
          <div className="rounded-[16px] border border-ok/40 bg-ok/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-ok" />
                <h3 className="text-xs font-bold text-ink uppercase tracking-wide">
                  {resultado.mensaje}
                </h3>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink underline"
              >
                <span>Probar en Login</span>
                <ArrowUpRight className="size-3" />
              </Link>
            </div>

            {resultado.clave && (
              <div className="rounded-[12px] border border-rule/60 bg-paper p-3 space-y-2 text-xs">
                {resultado.nombre && (
                  <div className="flex justify-between items-center py-0.5 border-b border-rule/40">
                    <span className="text-ink-soft">Usuario:</span>
                    <span className="font-bold text-ink">
                      {resultado.nombre} ({resultado.rol})
                    </span>
                  </div>
                )}
                {resultado.dni && (
                  <div className="flex justify-between items-center py-0.5 border-b border-rule/40">
                    <span className="text-ink-soft">DNI:</span>
                    <span className="font-mono font-bold text-ink">{resultado.dni}</span>
                  </div>
                )}
                {resultado.slug && (
                  <div className="flex justify-between items-center py-0.5 border-b border-rule/40">
                    <span className="text-ink-soft">Gimnasio (slug):</span>
                    <span className="font-mono font-bold text-ink">{resultado.slug}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-1">
                  <span className="text-ink-soft font-medium">Nueva Contraseña:</span>
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-volt/25 px-2 py-0.5 font-mono text-sm font-black text-volt-ink border border-volt/40">
                      {resultado.clave}
                    </code>
                    <button
                      type="button"
                      onClick={() => copiarTexto(resultado.clave, "clave-result")}
                      className="inline-flex items-center gap-1 rounded-[6px] border border-rule bg-paper-2 px-2 py-1 text-[11px] font-semibold text-ink hover:bg-paper active:scale-95"
                    >
                      {copiadoKey === "clave-result" ? (
                        <>
                          <Check className="size-3 text-ok" />
                          <span className="text-ok">Copiada</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3 text-ink-soft" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {resultado.dni && resultado.slug && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const texto = `Gimnasio: ${resultado.slug}\nDNI: ${resultado.dni}\nContraseña: ${resultado.clave}`;
                    copiarTexto(texto, "credenciales-completas");
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft hover:text-ink active:scale-95 transition-transform"
                >
                  {copiadoKey === "credenciales-completas" ? (
                    <>
                      <Check className="size-3 text-ok" />
                      <span className="text-ok">¡Credenciales completas copiadas!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      <span>Copiar datos de acceso completos (Gym, DNI, Clave)</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
