"use client";

import { useState } from "react";
import { Coins, LayoutDashboard, MessageSquare, Tags, Users } from "lucide-react";
import { hapticoSeleccion } from "@/lib/ui/hapticos";

const SOCIOS = [
  { nombre: "Ana Demo", plan: "Pase libre", estado: "Al día", dias: 23 },
  { nombre: "Lucas Demo", plan: "3 veces por semana", estado: "Por vencer", dias: 3 },
  { nombre: "Martín Demo", plan: "Pase libre", estado: "Vencida", dias: -2 },
  { nombre: "Sofía Demo", plan: "Pase libre", estado: "Al día", dias: 18 },
];
const MOVIMIENTOS = [
  { concepto: "Cuota · Ana Demo", medio: "Transferencia", monto: "$35.000" },
  { concepto: "Cuota · Sofía Demo", medio: "Efectivo", monto: "$35.000" },
  { concepto: "Cuota · Lucas Demo", medio: "Mercado Pago", monto: "$28.000" },
];
const SECCIONES = [
  { id: "resumen", label: "Resumen", Icono: LayoutDashboard },
  { id: "clientes", label: "Clientes", Icono: Users },
  { id: "caja", label: "Caja", Icono: Coins },
  { id: "planes", label: "Planes", Icono: Tags },
  { id: "mensajes", label: "Mensajes", Icono: MessageSquare },
] as const;
type Seccion = typeof SECCIONES[number]["id"];
const card = "rounded-[16px] border border-rule bg-paper-2 p-4 shadow-sm";

export default function DemoDueno() {
  const [seccion, setSeccion] = useState<Seccion>("resumen");
  const [busqueda, setBusqueda] = useState("");
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [aviso, setAviso] = useState("El gimnasio abre de 7 a 22 h. ¡Te esperamos!");
  const [feedback, setFeedback] = useState(false);
  const socio = SOCIOS.find((item) => item.nombre === seleccionado);

  function ir(id: Seccion) { hapticoSeleccion(); setSeccion(id); setSeleccionado(null); }

  return (
    <main className="space-y-5 px-5 pt-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-volt">Vista de dueño · Demo temporal</p>
        <h1 className="mt-2 font-display text-2xl font-semibold">Gimnasio Demo</h1>
        <p className="mt-1 text-xs leading-relaxed text-ink-soft">Una muestra de las funciones del panel con datos ficticios. Las acciones de esta demo no modifican cuentas reales.</p>
      </div>

      {seccion === "resumen" && <>
        <h2 className="font-display text-lg font-semibold">Tu gimnasio, de un vistazo</h2>
        <div className="grid grid-cols-2 gap-3">
          {[["Socios activos", "124"], ["En sala ahora", "18"], ["Cobrado este mes", "$3.850.000"], ["Cuotas por vencer", "9"]].map(([label, valor]) => (
            <div key={label} className={card}><p className="text-xs text-ink-soft">{label}</p><p className="mt-2 text-xl font-bold tabular-nums">{valor}</p></div>
          ))}
        </div>
        <div className={card}>
          <h3 className="font-semibold">Para atender hoy</h3>
          <p className="mt-2 text-sm text-ink-soft">3 cuotas vencidas · 9 próximos vencimientos</p>
          <button onClick={() => ir("clientes")} className="mt-3 min-h-11 rounded-[12px] bg-volt px-4 text-sm font-semibold text-volt-ink transition-transform active:scale-95">Ver clientes</button>
        </div>
        <div className={card}><h3 className="font-semibold">Últimos cobros</h3><Movimientos /></div>
      </>}

      {seccion === "clientes" && <>
        <h2 className="font-display text-lg font-semibold">Clientes y cuotas</h2>
        <label className="block text-xs text-ink-soft">Buscar por nombre
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar cliente…" className="mt-2 min-h-11 w-full rounded-[12px] border border-rule bg-paper-2 px-3 text-sm text-ink" />
        </label>
        <div className="space-y-2">
          {SOCIOS.filter((s) => s.nombre.toLowerCase().includes(busqueda.toLowerCase())).map((s) => (
            <button key={s.nombre} onClick={() => { hapticoSeleccion(); setSeleccionado(s.nombre); }} className={`${card} flex min-h-16 w-full items-center justify-between gap-2 text-left transition-transform active:scale-[0.98]`}>
              <span><span className="block text-sm font-semibold">{s.nombre}</span><span className="text-xs text-ink-soft">{s.plan}</span></span>
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${s.dias < 0 ? "bg-danger/10 text-danger" : s.dias < 7 ? "bg-warn/10 text-warn" : "bg-volt/10 text-volt"}`}>{s.estado}</span>
            </button>
          ))}
          {!SOCIOS.some((s) => s.nombre.toLowerCase().includes(busqueda.toLowerCase())) && <p className="text-sm text-ink-soft">No hay clientes con ese nombre.</p>}
        </div>
        {socio && <section className={card} aria-label="Ficha del cliente">
          <h3 className="font-semibold">{socio.nombre}</h3><p className="mt-2 text-sm text-ink-soft">Plan: {socio.plan} · {socio.dias > 0 ? `${socio.dias} días restantes` : "Cuota vencida"}</p>
          <p className="mt-3 text-sm">Rutina asignada: fuerza, 3 días por semana.</p>
          <p className="mt-2 text-xs text-ink-soft">En la app real, desde esta ficha gestionás pagos y rutinas. Esta muestra es de consulta.</p>
        </section>}
      </>}

      {seccion === "caja" && <>
        <h2 className="font-display text-lg font-semibold">Caja y turnos</h2>
        <div className={card}><p className="text-xs text-ink-soft">Ingresos de ejemplo · Hoy</p><p className="mt-2 text-3xl font-bold tabular-nums text-volt">$98.000</p><p className="mt-2 text-xs text-ink-soft">Efectivo $35.000 · Transferencia $35.000 · Mercado Pago $28.000</p></div>
        <div className={card}><h3 className="font-semibold">Movimientos del día</h3><Movimientos /></div>
        <div className={card}><h3 className="font-semibold">Turno mañana</h3><p className="mt-2 text-sm text-ink-soft">07:00–14:00 · Caja abierta · Responsable: Recepción Demo</p></div>
      </>}

      {seccion === "planes" && <>
        <h2 className="font-display text-lg font-semibold">Planes de socios</h2>
        {[["Pase libre", "$35.000", "Acceso todos los días · 30 días"], ["3 veces por semana", "$28.000", "3 visitas semanales · 30 días"], ["Estudiantes", "$25.000", "Tarifa de ejemplo · 30 días"]].map(([nombre, precio, detalle]) => (
          <div className={card} key={nombre}><h3 className="font-semibold">{nombre}</h3><p className="mt-2 text-2xl font-bold tabular-nums text-volt">{precio}</p><p className="mt-2 text-xs text-ink-soft">{detalle}</p></div>
        ))}
        <p className="text-xs text-ink-soft">Estos importes son ejemplos de cuotas del gimnasio, no precios de SysGym.</p>
      </>}

      {seccion === "mensajes" && <>
        <h2 className="font-display text-lg font-semibold">Avisos a tus socios</h2>
        <div className={card}>
          <label className="block text-sm font-semibold">Mensaje de ejemplo<textarea value={aviso} onChange={(e) => { setAviso(e.target.value); setFeedback(false); }} maxLength={500} rows={4} className="mt-3 w-full rounded-[12px] border border-rule bg-paper p-3 text-sm font-normal text-ink" /></label>
          <button disabled={!aviso.trim()} onClick={() => { hapticoSeleccion(); setFeedback(true); }} className="mt-3 min-h-11 rounded-[12px] bg-volt px-4 text-sm font-semibold text-volt-ink disabled:opacity-50 transition-transform active:scale-95">Probar aviso</button>
          {feedback && <p role="status" className="mt-3 text-sm text-volt">Vista previa lista. No se envió ninguna notificación.</p>}
        </div>
        <div className={card}><h3 className="font-semibold">Vista previa para el socio</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm text-ink-soft">{aviso}</p></div>
      </>}

      <nav aria-label="Secciones del dueño" className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md justify-center gap-1 border-t border-rule bg-paper/95 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] backdrop-blur-xl">
        {SECCIONES.map(({ id, label, Icono }) => <button key={id} onClick={() => ir(id)} aria-current={seccion === id ? "page" : undefined} className={`flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[12px] text-[11px] transition-transform active:scale-95 ${seccion === id ? "bg-ink text-paper" : "text-ink-soft"}`}><Icono className="size-5" aria-hidden /><span>{label}</span></button>)}
      </nav>
    </main>
  );
}

function Movimientos() {
  return <ul className="mt-3 divide-y divide-rule">{MOVIMIENTOS.map((m) => <li key={m.concepto} className="flex items-center justify-between gap-2 py-3"><span><span className="block text-sm font-medium">{m.concepto}</span><span className="text-xs text-ink-soft">{m.medio}</span></span><span className="text-sm font-semibold tabular-nums">{m.monto}</span></li>)}</ul>;
}
