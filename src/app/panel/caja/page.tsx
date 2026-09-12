import { requireStaffODueno } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { verificarPlanGimnasio } from "@/lib/plataforma/plan-gate";
import { BloqueoEliteGate } from "@/components/ui/bloqueo-elite-gate";
import { ModalAbrirCaja } from "./modal-abrir-caja";
import { CajaAbiertaView, type SesionCajaAbierta } from "./caja-abierta-view";
import { HistorialTurnos, type SesionCajaCerrada } from "./historial-turnos";
import { Coins, History, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Caja Diaria y Turnos | SysGym",
};

export default async function CajaPage() {
  const profile = await requireStaffODueno();
  const admin = createAdminClient();

  // 1. Validar Plan Elite
  const planInfo = await verificarPlanGimnasio(admin, profile.gimnasio_id);
  const esElite = planInfo.permiteControlCaja;

  // 2. Buscar sesión abierta
  const { data: sesionAbiertaRaw } = await admin
    .from("caja_sesiones")
    .select(`
      id,
      turno_nombre,
      abierta_en,
      abierta_por,
      monto_inicial_efectivo,
      notas_apertura,
      perfil_abrio:profiles!caja_sesiones_abierta_por_fkey(nombre)
    `)
    .eq("gimnasio_id", profile.gimnasio_id)
    .eq("estado", "abierta")
    .maybeSingle();

  let sesionAbierta: SesionCajaAbierta | null = null;

  if (sesionAbiertaRaw) {
    // Buscar movimientos del turno abierto
    const { data: movsRaw } = await admin
      .from("caja_movimientos")
      .select(`
        id,
        tipo,
        categoria,
        concepto,
        monto,
        medio_pago,
        comprobante_ref,
        creado_en,
        perfil_creo:profiles!caja_movimientos_creado_por_fkey(nombre)
      `)
      .eq("sesion_id", sesionAbiertaRaw.id)
      .order("creado_en", { ascending: false });

    sesionAbierta = {
      id: sesionAbiertaRaw.id,
      turno_nombre: sesionAbiertaRaw.turno_nombre,
      abierta_en: sesionAbiertaRaw.abierta_en,
      abierta_por_nombre: (sesionAbiertaRaw.perfil_abrio as any)?.nombre || "Staff",
      monto_inicial_efectivo: Number(sesionAbiertaRaw.monto_inicial_efectivo) || 0,
      notas_apertura: sesionAbiertaRaw.notas_apertura,
      movimientos: (movsRaw || []).map((m: any) => ({
        id: m.id,
        tipo: m.tipo,
        categoria: m.categoria,
        concepto: m.concepto,
        monto: Number(m.monto) || 0,
        medio_pago: m.medio_pago,
        comprobante_ref: m.comprobante_ref,
        creado_en: m.creado_en,
        usuario_nombre: m.perfil_creo?.nombre || undefined,
      })),
    };
  }

  // 3. Buscar historial de sesiones cerradas recientes
  const { data: sesionesCerradasRaw } = await admin
    .from("caja_sesiones")
    .select(`
      id,
      turno_nombre,
      abierta_en,
      cerrada_en,
      monto_inicial_efectivo,
      monto_final_declarado,
      monto_final_esperado_efectivo,
      diferencia_efectivo,
      notas_apertura,
      notas_cierre,
      perfil_abrio:profiles!caja_sesiones_abierta_por_fkey(nombre),
      perfil_cerro:profiles!caja_sesiones_cerrada_por_fkey(nombre)
    `)
    .eq("gimnasio_id", profile.gimnasio_id)
    .eq("estado", "cerrada")
    .order("abierta_en", { ascending: false })
    .limit(15);

  const historialSesiones: SesionCajaCerrada[] = (sesionesCerradasRaw || []).map((s: any) => ({
    id: s.id,
    turno_nombre: s.turno_nombre,
    abierta_en: s.abierta_en,
    cerrada_en: s.cerrada_en,
    abierta_por_nombre: s.perfil_abrio?.nombre || "Staff",
    cerrada_por_nombre: s.perfil_cerro?.nombre || "Staff",
    monto_inicial_efectivo: Number(s.monto_inicial_efectivo) || 0,
    monto_final_declarado: s.monto_final_declarado !== null ? Number(s.monto_final_declarado) : null,
    monto_final_esperado_efectivo: s.monto_final_esperado_efectivo !== null ? Number(s.monto_final_esperado_efectivo) : null,
    diferencia_efectivo: s.diferencia_efectivo !== null ? Number(s.diferencia_efectivo) : null,
    notas_apertura: s.notas_apertura,
    notas_cierre: s.notas_cierre,
  }));

  const esDueno = profile.rol === "dueno";

  const contenidoPrincipal = (
    <div className="space-y-8 pb-12">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-ink">Caja Diaria y Turnos</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#10e7a0]/15 text-[#10e7a0] border border-[#10e7a0]/30">
              ✦ PLAN ELITE
            </span>
          </div>
          <p className="text-xs sm:text-sm text-ink-soft mt-1">
            Control de efectivo por turno de recepción, gastos de caja y arqueo ciego anti-fugas.
          </p>
        </div>

        {!sesionAbierta && (
          <div>
            <ModalAbrirCaja />
          </div>
        )}
      </div>

      {/* Vista de Caja Abierta o Estado en Espera */}
      {sesionAbierta ? (
        <CajaAbiertaView sesion={sesionAbierta} esDueno={esDueno} />
      ) : (
        <div className="rounded-[24px] border-2 border-dashed border-rule bg-paper-2/60 p-8 sm:p-12 text-center space-y-4">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#10e7a0]/15 text-[#10e7a0]">
            <Coins className="size-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-bold text-ink">No hay ningún turno abierto</h3>
            <p className="text-xs text-ink-soft">
              Abrí un nuevo turno de recepción indicando el fondo de cambio inicial para comenzar a asentar cobros y gastos en efectivo.
            </p>
          </div>
          <div className="pt-2">
            <ModalAbrirCaja />
          </div>
        </div>
      )}

      {/* Historial de Turnos Cerrados */}
      <div className="space-y-4 pt-4 border-t border-rule">
        <div className="flex items-center gap-2">
          <History className="size-5 text-ink-soft" />
          <h3 className="text-lg font-bold text-ink">Historial de Turnos y Auditoría</h3>
        </div>
        <HistorialTurnos sesiones={historialSesiones} />
      </div>
    </div>
  );

  return (
    <BloqueoEliteGate
      bloqueado={!esElite}
      titulo="Control de Caja Diaria y Arqueo Ciego"
      descripcion="Eliminá fugas de dinero en recepción con apertura y cierre por turnos, control de gastos diarios y arqueos ciegos auditados en tiempo real."
      badge="✦ EXCLUSIVO PLAN ELITE"
      beneficios={[
        "Apertura y cierre de turnos con fondo de cambio",
        "Arqueo ciego: el empleado declara efectivo sin ver el cálculo del sistema",
        "Control de gastos de caja chica (limpieza, insumos, adelantos)",
        "Vinculación automática de cobros de cuotas en efectivo",
        "Auditoría histórica con detección instantánea de sobrantes y faltantes",
      ]}
    >
      {contenidoPrincipal}
    </BloqueoEliteGate>
  );
}
