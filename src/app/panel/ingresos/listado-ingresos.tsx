"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Pago = {
  id: string;
  fecha_pago: string;
  monto: number;
  cliente_nombre: string;
  plan_nombre: string;
};

type PagosPorMes = {
  [mesAno: string]: {
    pagos: Pago[];
    total: number;
  };
};

export function ListadoIngresos() {
  const [verificado, setVerificado] = useState(false);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cargando, setCargando] = useState(true);

  // Verificar si el PIN fue ingresado
  useEffect(() => {
    const verificadoSession = sessionStorage.getItem("pin_ingresos_verificado");
    if (verificadoSession === "true") {
      setVerificado(true);
      cargarPagos();
    }
  }, []);

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
    return <p className="text-sm text-ink-soft">Cargando ingresos...</p>;
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

  // Agrupar por mes/año
  const pagosPorMes: PagosPorMes = {};
  let totalGeneral = 0;

  pagos.forEach((pago) => {
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
          <p className="text-sm text-ink-soft">Total general</p>
          <p className="text-3xl font-display">${totalGeneral.toLocaleString("es-AR")}</p>
        </div>
        <Link
          href="/panel/ingresos/configurar-pin"
          className="text-sm text-ink-soft underline underline-offset-2"
        >
          Cambiar PIN
        </Link>
      </div>

      {mesesOrdenados.map((mesAno) => {
        const { pagos: pagosMes, total } = pagosPorMes[mesAno];
        
        return (
          <div key={mesAno} className="rounded-[6px] border border-rule bg-paper overflow-hidden">
            <div className="bg-paper-2 px-4 py-3 border-b border-rule">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium capitalize">
                  {formatearMes(mesAno)}
                </h2>
                <p className="text-lg font-display">${total.toLocaleString("es-AR")}</p>
              </div>
              <p className="text-xs text-ink-soft mt-0.5">
                {pagosMes.length} {pagosMes.length === 1 ? "pago" : "pagos"}
              </p>
            </div>

            <ul className="divide-y divide-rule">
              {pagosMes.map((pago) => (
                <li key={pago.id} className="px-4 py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{pago.cliente_nombre}</p>
                    <p className="text-xs text-ink-soft">
                      {pago.plan_nombre} · {new Date(pago.fecha_pago).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                  <p className="text-sm font-medium shrink-0">
                    ${pago.monto.toLocaleString("es-AR")}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
