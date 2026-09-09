"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Spinner, pillClasses } from "@/components/ui";
import { KeyRound } from "lucide-react";
import { DescargarIngresosPdf } from "@/components/pdf/descargar-ingresos-pdf";

type Pago = {
  id: string;
  fecha_pago: string;
  monto: number;
  comprobante_ref: string | null;
  cliente_nombre: string;
  plan_nombre: string;
};

type PagosPorMes = {
  [mesAno: string]: {
    pagos: Pago[];
    total: number;
  };
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export function ListadoIngresos({
  gimnasioNombre,
  logoUrl,
  pinRequerido = true,
}: {
  gimnasioNombre: string;
  logoUrl: string | null;
  pinRequerido?: boolean;
}) {
  const [verificado, setVerificado] = useState(false);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cargando, setCargando] = useState(true);
  const [q, setQ] = useState("");
  const [mesFiltro, setMesFiltro] = useState<string>(""); // 'YYYY-MM' o ''

  // Verificar si el PIN fue ingresado (o entrar directo si no se requiere PIN)
  useEffect(() => {
    if (!pinRequerido) {
      setVerificado(true);
      cargarPagos();
      return;
    }
    const verificadoSession = sessionStorage.getItem("pin_ingresos_verificado");
    if (verificadoSession === "true") {
      setVerificado(true);
      cargarPagos();
    }
  }, [pinRequerido]);

  const cargarPagos = async () => {
    try {
      const res = await fetch("/api/panel/ingresos");
      if (res.ok) {
        const data = await res.json();
        setPagos(data.pagos || []);
      }
    } catch (error) {
      console.error("Error al cargar pagos:", error);
    } finally {
      setCargando(false);
    }
  };

  if (!verificado) {
    return null; // El modal maneja la verificación
  }

  if (cargando) {
    return (
      <p className="flex items-center gap-2 text-sm text-ink-soft">
        <Spinner />
        Cargando ingresos…
      </p>
    );
  }

  if (pagos.length === 0) {
    return (
      <div className="rounded-[6px] border border-rule bg-paper-2 p-6 text-center">
        <p className="text-sm text-ink-soft">
          No hay pagos registrados todavía.
        </p>
      </div>
    );
  }

  // Meses disponibles desde los pagos cargados (para el selector)
  const mesesDisponibles = useMemo(() => {
    const set = new Set<string>();
    pagos.forEach((p) => {
      const [y, m] = p.fecha_pago.split("-");
      set.add(`${y}-${m}`);
    });
    return [...set].sort((a, b) => b.localeCompare(a)); // desc
  }, [pagos]);

  const filtro = norm(q.trim());

  // 1) Filtrar por mes seleccionado
  const pagosFiltradosPorRango = mesFiltro
    ? pagos.filter((p) => p.fecha_pago.startsWith(mesFiltro))
    : pagos;

  // 2) Filtrar por nombre sobre el resultado anterior
  const pagosFiltrados = filtro
    ? pagosFiltradosPorRango.filter((p) => norm(p.cliente_nombre).includes(filtro))
    : pagosFiltradosPorRango;

  // Agrupar por mes/año
  const pagosPorMes: PagosPorMes = {};
  let totalGeneral = 0;

  pagosFiltrados.forEach((pago) => {
    const fecha = new Date(pago.fecha_pago);
    const mesAno = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
    
    if (!pagosPorMes[mesAno]) {
      pagosPorMes[mesAno] = { pagos: [], total: 0 };
    }
    
    pagosPorMes[mesAno].pagos.push(pago);
    pagosPorMes[mesAno].total += pago.monto;
    totalGeneral += pago.monto;
  });

  // Ordenar meses descendente
  const mesesOrdenados = Object.keys(pagosPorMes).sort((a, b) => b.localeCompare(a));

  const formatearMes = (mesAno: string) => {
    const [ano, mes] = mesAno.split("-");
    const fecha = new Date(Number(ano), Number(mes) - 1);
    return fecha.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-ink-soft">
            {filtro ? "Total filtrado" : "Total general"}
          </p>
          <p className="text-2xl font-display">${totalGeneral.toLocaleString("es-AR")}</p>
        </div>
        <Link
          href="/panel/ingresos/configurar-pin"
          className={pillClasses.neutra}
        >
          <KeyRound aria-hidden strokeWidth={2} className="size-4" />
          Cambiar PIN
        </Link>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <label className="flex items-center gap-2 flex-1">
          <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-ink-soft shrink-0">Período</span>
          <select
            value={mesFiltro}
            onChange={(e) => setMesFiltro(e.target.value)}
            className="h-11 flex-1 min-w-[160px] rounded-[10px] border border-rule bg-paper text-[16px] px-3 outline-none transition-[border-color] duration-150 focus:border-ink"
          >
            <option value="">Todos los meses</option>
            {mesesDisponibles.map((m) => (
              <option key={m} value={m}>{formatearMes(m)}</option>
            ))}
          </select>
        </label>
        <DescargarIngresosPdf
          pagos={pagos}
          pagosFiltrados={mesFiltro ? pagosFiltrados : []}
          gimnasioNombre={gimnasioNombre}
          logoUrl={logoUrl}
          rangoLabel={mesFiltro ? formatearMes(mesFiltro) : ''}
        />
      </div>

      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por nombre de socio…"
        className="w-full h-11 px-3 rounded-[5px] border border-rule bg-paper text-[16px] outline-none transition-[border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] focus:border-ink focus:shadow-[0_0_0_3px_rgb(22_24_29_/_0.08)]"
      />

      {pagosFiltrados.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Ningún pago de un socio con ese nombre.
        </p>
      ) : null}

      {mesesOrdenados.map((mesAno) => {
        const { pagos: pagosMes, total } = pagosPorMes[mesAno];
        
        return (
          <div key={mesAno} className="rounded-[6px] border border-rule bg-paper overflow-hidden">
            <div className="bg-paper-2 px-4 py-3 border-b border-rule">
              <div className="flex items-center justify-between">
                <h2 className="text-lg capitalize">
                  {formatearMes(mesAno)}
                </h2>
                <p className="text-lg font-display">${total.toLocaleString("es-AR")}</p>
              </div>
              <p className="text-xs text-ink-soft mt-0.5">
                {pagosMes.length} {pagosMes.length === 1 ? "pago" : "pagos"}
              </p>
            </div>

            <ul className="divide-y divide-rule">
              {pagosMes.map((pago) => {
                const ref = pago.comprobante_ref;
                const esUrl =
                  ref &&
                  (ref.startsWith("http://") || ref.startsWith("https://"));
                return (
                  <li key={pago.id} className="px-4 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{pago.cliente_nombre}</p>
                      <p className="text-xs text-ink-soft">
                        {pago.plan_nombre} · {new Date(pago.fecha_pago).toLocaleDateString("es-AR")}
                      </p>
                      {ref ? (
                        esUrl ? (
                          <a
                            href={ref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-ink-soft underline underline-offset-2 truncate hover:text-ink"
                          >
                            🔗 Ver comprobante
                          </a>
                        ) : (
                          <p className="text-xs text-ink-soft truncate">Ref: {ref}</p>
                        )
                      ) : null}
                    </div>
                    <p className="text-sm font-medium shrink-0">
                      ${pago.monto.toLocaleString("es-AR")}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
