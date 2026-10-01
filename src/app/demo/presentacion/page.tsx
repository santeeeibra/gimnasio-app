import type { Metadata } from "next";
import Link from "next/link";
import { Dumbbell, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Conocé SysGym · Demo de dueño y socio",
  description: "Gestión de gimnasios: clientes, cuotas, caja y planes. Para socios: rutinas, entrenamiento y registro del peso. Demo pública con datos ficticios.",
  robots: { index: false, follow: true },
};

const DUENO = [
  ["Resumen", "Consultar socios activos, asistencia, cobros y vencimientos desde el panel del gimnasio."],
  ["Clientes", "Gestionar fichas de socios, planes, estado de cuota, pagos y rutinas asignadas."],
  ["Caja y turnos", "Organizar movimientos de caja y consultar ingresos según el medio de pago."],
  ["Planes", "Definir planes y cuotas para los socios del gimnasio."],
  ["Mensajes", "Preparar avisos para los socios del gimnasio."],
];
const SOCIO = [
  ["Inicio", "Consultar días restantes de la cuota, avisos del gimnasio y constancia de entrenamiento."],
  ["Rutina", "Ver ejercicios, series y repeticiones; registrar cargas y seguir el progreso del día con descansos."],
  ["Peso", "Registrar peso corporal y consultar el historial para seguir su evolución."],
];

export default function PresentacionDemo() {
  return <main className="space-y-6 px-5 pt-6">
    <section>
      <p className="text-xs font-semibold uppercase tracking-wider text-volt">Demostración pública temporal</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Conocé SysGym</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">La gestión del gimnasio y el entrenamiento de sus socios, en una misma app. Dos vistas: una para administrar y otra para entrenar.</p>
      <p className="mt-3 text-xs leading-relaxed text-ink-soft">Las demostraciones usan datos ficticios y no requieren iniciar sesión. La vista de dueño es una muestra simplificada; la de socio permite probar Inicio, Rutina y Peso. Algunas funciones de la app completa requieren una cuenta.</p>
    </section>
    {[
      { titulo: "Panel de dueño", href: "/demo/dueno", accion: "Explorar como dueño", Icono: Users, items: DUENO },
      { titulo: "Panel de socio", href: "/demo", accion: "Explorar como socio", Icono: Dumbbell, items: SOCIO },
    ].map(({ titulo, href, accion, Icono, items }) => <section key={titulo} className="rounded-[18px] border border-rule bg-paper-2 p-5 shadow-sm">
      <Icono className="size-7 text-volt" aria-hidden /><h2 className="mt-3 font-display text-xl font-semibold">{titulo}</h2>
      <ul className="mt-3 divide-y divide-rule">{items.map(([nombre, texto]) => <li key={nombre} className="py-3"><h3 className="text-sm font-semibold">{nombre}</h3><p className="mt-1 text-xs leading-relaxed text-ink-soft">{texto}</p></li>)}</ul>
      <Link href={href} className="mt-3 flex min-h-12 items-center justify-center rounded-[12px] bg-volt px-4 text-sm font-semibold text-volt-ink">{accion}</Link>
    </section>)}
    <p className="text-xs leading-relaxed text-ink-soft">Esta página describe las funciones para que también puedan leerlas herramientas de análisis de sitios. No contiene datos ni credenciales de gimnasios reales.</p>
  </main>;
}
