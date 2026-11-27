import Link from "next/link";
import { ArrowUpRight, ChevronRight, Dumbbell, Scale, Share2, TrendingDown, TrendingUp, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SkinMotif } from "@/components/skin-motif";
import { RachaConstancia } from "@/components/mi/racha-constancia";
import { BotonInstalarApp } from "@/components/pwa/boton-instalar-app";
import { BotonCompartirApp } from "@/components/ui/boton-compartir-app";
import { BotonActualizar } from "@/components/ui/boton-actualizar";

// Inicio de la cuenta personal (sin gimnasio). Reutiliza el diseño del inicio
// del socio (/mi) pero sin lo que solo existe dentro de un gimnasio: QR de
// ingreso, cuota, pagos, aforo, mensajes, buzón y comunidad. La constancia se
// arma con los días en que registró series (registro_progreso), no con
// ingresos por molinete.

const fila =
  "group flex items-center gap-3 px-4 py-4 transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-paper active:bg-paper active:scale-[0.985]";

function dia(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatoKg(n: number) {
  return n.toLocaleString("es-AR", { maximumFractionDigits: 1 });
}

export async function InicioIndividual({ profileId, nombre }: { profileId: string; nombre: string }) {
  const supabase = await createClient();

  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, foto_url")
    .eq("profile_id", profileId)
    .maybeSingle();

  const hoy = dia(new Date());
  const desde = new Date(hoy);
  desde.setDate(desde.getDate() - 29);

  const [{ data: rutina }, { data: series }, { data: pesos }] = cliente?.id
    ? await Promise.all([
        supabase
          .from("rutinas")
          .select("objetivo, dias_por_semana")
          .eq("cliente_id", cliente.id)
          .maybeSingle(),
        supabase
          .from("registro_progreso")
          .select("fecha")
          .eq("cliente_id", cliente.id)
          .gte("fecha", desde.toISOString().slice(0, 10)),
        supabase
          .from("registro_peso")
          .select("fecha, peso")
          .eq("cliente_id", cliente.id)
          .order("fecha", { ascending: false })
          .limit(2),
      ])
    : [{ data: null }, { data: null }, { data: null }];

  // Días distintos entrenados en los últimos 30 días.
  const fechas = new Set((series ?? []).map((s: { fecha: string }) => String(s.fecha).slice(0, 10)));
  const marcas = [...fechas].map((f) => new Date(`${f}T00:00:00`).getTime());
  const N = 15;
  const barras = Array.from({ length: N }, (_, i) => {
    const fin = new Date(hoy);
    fin.setDate(fin.getDate() - (N - 1 - i) * 2);
    const ini = new Date(fin);
    ini.setDate(ini.getDate() - 1);
    return marcas.some((t) => t >= ini.getTime() && t <= fin.getTime());
  });
  const inicioSemana = new Date(hoy);
  inicioSemana.setDate(inicioSemana.getDate() - 6);
  const estaSemana = marcas.filter((t) => t >= inicioSemana.getTime()).length;
  const entrenoHoy = marcas.includes(hoy.getTime());

  const ultimoPeso = pesos?.[0] ? Number(pesos[0].peso) : null;
  const pesoAnterior = pesos?.[1] ? Number(pesos[1].peso) : null;

  return (
    <InicioIndividualVista
      nombre={nombre}
      fotoUrl={cliente?.foto_url ?? null}
      rutina={rutina ? { objetivo: rutina.objetivo ?? null, diasPorSemana: rutina.dias_por_semana ?? null } : null}
      barras={barras}
      diasEntrenados30={fechas.size}
      estaSemana={estaSemana}
      entrenoHoy={entrenoHoy}
      ultimoPeso={ultimoPeso}
      pesoAnterior={pesoAnterior}
    />
  );
}

export type VistaIndividual = {
  nombre: string;
  fotoUrl: string | null;
  rutina: { objetivo: string | null; diasPorSemana: number | null } | null;
  barras: boolean[];
  diasEntrenados30: number;
  estaSemana: number;
  entrenoHoy: boolean;
  ultimoPeso: number | null;
  pesoAnterior: number | null;
};

export function InicioIndividualVista({
  nombre, fotoUrl, rutina, barras, diasEntrenados30, estaSemana, entrenoHoy, ultimoPeso, pesoAnterior,
}: VistaIndividual) {
  const primerNombre = nombre.trim().split(/\s+/)[0] || nombre;
  const meta = rutina?.diasPorSemana ?? null;
  const variacion = ultimoPeso !== null && pesoAnterior !== null ? ultimoPeso - pesoAnterior : null;

  return (
    <main className="member-home stagger max-w-md mx-auto min-h-full p-6 pb-24 space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              href="/mi/perfil"
              className="relative size-10 shrink-0 rounded-[12px] bg-[#0b1311] border border-volt/30 flex items-center justify-center shadow-sm overflow-hidden"
              title="Ir a mi perfil"
            >
              {fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fotoUrl} alt={`Foto de ${nombre}`} className="size-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/icon-192.png" alt="SysGym" className="size-full object-cover" />
              )}
            </Link>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft/80 leading-none mb-0.5">
                Cuenta personal
              </p>
              <h1 className="min-w-0 truncate text-xl font-bold font-display text-ink leading-tight">
                Hola, {primerNombre}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 rounded-[12px] border border-rule/80 bg-paper-2/90 p-1 shadow-sm">
            <BotonActualizar variante="icono" className="!min-h-8 !min-w-8 !size-8 !rounded-[8px] !border-none !bg-transparent hover:!bg-paper hover:text-ink text-ink-soft" />
          </div>
        </div>

        {/* Acción principal: entrenar */}
        <Link
          href="/mi/rutina"
          className="member-entry flex h-14 w-full items-center justify-center gap-2 rounded-[12px] bg-accent font-bold text-accent-ink shadow-md shadow-accent/20 transition-transform active:scale-[0.98] hover:opacity-95"
        >
          <Dumbbell aria-hidden className="size-5" />
          <span>{!rutina ? "Crear mi rutina" : entrenoHoy ? "Seguir entrenando" : "Entrenar hoy"}</span>
        </Link>
      </div>

      {/* Semana */}
      <div className="skin-account skin-metric card-cut card-cut-lg futurista-fondo border border-rule bg-paper-2 p-5 border-l-2 border-l-ok">
        <SkinMotif />
        <p className="text-xs text-ink-soft mb-1">Esta semana</p>
        <p className="font-display text-3xl leading-tight text-ok">
          {estaSemana}
          {meta ? <span className="text-lg text-ink-soft"> / {meta}</span> : null}
          <span className="ml-1 text-base text-ink-soft">{estaSemana === 1 ? "día" : "días"}</span>
        </p>
        <p className="text-sm text-ink-soft mt-0.5">
          {!rutina
            ? "Armá tu rutina para empezar a sumar."
            : meta && estaSemana >= meta
              ? "Cumpliste tu objetivo semanal."
              : rutina.objetivo
                ? `Objetivo: ${rutina.objetivo}`
                : "Entrenamientos registrados en los últimos 7 días."}
        </p>
      </div>

      {diasEntrenados30 > 0 ? <RachaConstancia dias={barras} total={diasEntrenados30} unidad={["día entrenado", "días entrenados"]} /> : null}

      {/* Peso */}
      <Link
        href="/mi/peso"
        className="card-cut flex items-center gap-4 border border-rule bg-paper-2 p-5 text-ink transition-transform duration-150 active:scale-[0.98]"
      >
        <Scale aria-hidden className="size-7 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-ink-soft">Mi peso</p>
          {ultimoPeso !== null ? (
            <p className="font-display text-2xl leading-tight">
              {formatoKg(ultimoPeso)} kg
              {variacion !== null && variacion !== 0 ? (
                <span className="ml-2 inline-flex items-center gap-1 text-sm text-ink-soft">
                  {variacion > 0 ? <TrendingUp aria-hidden className="size-4" /> : <TrendingDown aria-hidden className="size-4" />}
                  {variacion > 0 ? "+" : ""}
                  {formatoKg(variacion)}
                </span>
              ) : null}
            </p>
          ) : (
            <p className="text-sm font-medium">Registrá tu primer peso</p>
          )}
        </div>
        <ArrowUpRight aria-hidden className="size-5 shrink-0" />
      </Link>

      <ul className="member-shortcuts stagger-in card-cut overflow-hidden border border-rule bg-paper-2 divide-y divide-rule">
        <li>
          <Link href="/mi/perfil" className={fila}>
            <User aria-hidden strokeWidth={2} className="size-[18px] shrink-0 text-ink-soft" />
            <span className="min-w-0 flex-1 text-sm font-medium">Mi perfil</span>
            <ChevronRight aria-hidden strokeWidth={2} className="size-4 shrink-0 text-ink-soft" />
          </Link>
        </li>
        <li>
          <Link href="/mi/rutina" className={fila}>
            <Dumbbell aria-hidden strokeWidth={2} className="size-[18px] shrink-0 text-ink-soft" />
            <span className="min-w-0 flex-1 text-sm font-medium">Mi rutina</span>
            <ChevronRight aria-hidden strokeWidth={2} className="size-4 shrink-0 text-ink-soft" />
          </Link>
        </li>
        <li>
          <Link href="/panel/plantillas" className={fila}>
            <Share2 aria-hidden strokeWidth={2} className="size-[18px] shrink-0 text-ink-soft" />
            <span className="min-w-0 flex-1 text-sm font-medium">Compartir rutina</span>
            <ChevronRight aria-hidden strokeWidth={2} className="size-4 shrink-0 text-ink-soft" />
          </Link>
        </li>
      </ul>

      <div className="mt-4 space-y-3">
        <BotonCompartirApp variant="card" className="member-share" />
        <BotonInstalarApp variant="card" />
      </div>
    </main>
  );
}
