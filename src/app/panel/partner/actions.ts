"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { registrarAccionAdmin } from "@/lib/admin/audit";
import { sugerirReferralCode, esReferralCodeValido } from "@/lib/partners/codigos";

const COOLDOWN_ALIAS_MS = 48 * 60 * 60 * 1000;
import {
  type Partner,
  type ResumenPartner,
  type PartnerCommission,
  type PartnerPayout,
  type MilestoneNumero,
  type PartnerTier,
  RETIRO_MINIMO_ARS,
} from "@/types/partner";

/**
 * Obtiene o inicializa la cuenta de Partner para el usuario logueado.
 * Si aún no está enrolado como Partner, genera automáticamente su registro
 * con un referral_code único y limpio.
 */
export async function obtenerODescargarPartnerAction(): Promise<{
  ok: boolean;
  resumen?: ResumenPartner;
  comisiones?: PartnerCommission[];
  payouts?: PartnerPayout[];
  error?: string;
}> {
  try {
    const dueno = await requireProfile();
    const admin = createAdminClient();

    // 1. Buscar partner existente
    let { data: partner } = await admin
      .from("partners")
      .select("*")
      .eq("user_id", dueno.id)
      .maybeSingle();

    // 2. Si no existe, crearlo automáticamente
    if (!partner) {
      let code = sugerirReferralCode(dueno.nombre);
      if (!esReferralCodeValido(code)) {
        code = `partner-${dueno.id.slice(0, 6)}`;
      }

      // Verificar colisión de código
      const { data: existente } = await admin
        .from("partners")
        .select("id")
        .eq("referral_code", code)
        .maybeSingle();

      if (existente) {
        code = `${code}-${Math.floor(100 + Math.random() * 900)}`;
      }

      const { data: nuevo, error: createErr } = await admin
        .from("partners")
        .insert({
          user_id: dueno.id,
          nombre: dueno.nombre,
          referral_code: code,
          estado: "activo",
        })
        .select("*")
        .single();

      if (createErr || !nuevo) {
        return { ok: false, error: "No se pudo registrar como Partner oficial." };
      }
      partner = nuevo;
    }

    const partnerId = partner.id;

    // 3. Consultar métricas y balance
    const [
      { data: gymReferidos },
      { data: commissionsData },
      { data: milestoneAwardsData },
      { data: payoutsData },
      { data: notifsData },
    ] = await Promise.all([
      admin
        .from("gimnasios")
        .select("id, nombre, estado, creado_at, plan_plataforma_vence_el, plan:planes_plataforma(nombre)")
        .eq("referred_by_partner_id", partnerId)
        .order("creado_at", { ascending: false }),
      admin
        .from("partner_commissions")
        .select("*")
        .eq("partner_id", partnerId)
        .order("creado_at", { ascending: false }),
      admin
        .from("partner_milestone_awards")
        .select("*")
        .eq("partner_id", partnerId),
      admin
        .from("partner_payouts")
        .select("*")
        .eq("partner_id", partnerId)
        .order("solicitado_at", { ascending: false }),
      admin
        .from("partner_notifications")
        .select("*")
        .eq("partner_id", partnerId)
        .order("creado_at", { ascending: false })
        .limit(20),
    ]);

    const notificaciones = (notifsData ?? []) as ResumenPartner["notificaciones"];

    const gimnasios = gymReferidos ?? [];
    const commissions = (commissionsData ?? []) as PartnerCommission[];
    const milestones = milestoneAwardsData ?? [];
    const payouts = (payoutsData ?? []) as PartnerPayout[];

    // Evaluar detalle de cada gimnasio referido y si califica como pago activo
    const gimnasiosDetalle = await Promise.all(
      gimnasios.map(async (g) => {
        const [{ data: esPago }, { count }] = await Promise.all([
          admin.rpc("gimnasio_es_pago_activo", { p_gimnasio_id: g.id }),
          admin
            .from("clientes")
            .select("id", { count: "exact", head: true })
            .eq("gimnasio_id", g.id)
            .eq("acceso_habilitado", true),
        ]);

        const planNombre =
          (g as { plan?: { nombre?: string } | null })?.plan?.nombre ?? "Plan Inicial";

        return {
          id: g.id,
          nombre: g.nombre,
          creado_at: (g as { creado_at?: string }).creado_at ?? new Date().toISOString(),
          alumnosActivos: count ?? 0,
          esPagoActivo: esPago === true,
          planNombre: esPago === true ? planNombre : "Plan Inicial Gratuito",
        };
      }),
    );
    const gimnasiosPagoActivos = gimnasiosDetalle.filter((g) => g.esPagoActivo).length;

    // Rangos configurables (comisión + bono por hito), editable sin deploy.
    // Sin fallback hardcodeado: si esto falla o viene vacío, el dashboard
    // no debe mostrar números inventados — mejor un error explícito.
    const { data: tiersData, error: tiersErr } = await admin
      .from("partner_tiers")
      .select("id, name, min_active_gyms, commission_pct, milestone_bonus_amount")
      .order("min_active_gyms", { ascending: true });
    if (tiersErr || !tiersData || tiersData.length === 0) {
      return { ok: false, error: "No se pudieron cargar los rangos de comisión. Probá recargar la página." };
    }
    const tiers = tiersData as PartnerTier[];

    // Balance oficial mediante la función SQL partner_balance()
    const { data: balanceData } = await admin.rpc("partner_balance", {
      p_partner_id: partnerId,
    });
    const balanceDisponible = Math.max(0, Number(balanceData ?? 0));

    // Comisiones de los últimos 30 días
    const hace30d = new Date();
    hace30d.setDate(hace30d.getDate() - 30);
    const comisionesUltimos30d = commissions
      .filter((c) => new Date(c.creado_at) >= hace30d)
      .reduce((acc, c) => acc + Number(c.monto_comision_ars), 0);

    // Hitos completados y próximo hito
    const hitosAlcanzados = milestones.map((m) => m.milestone as MilestoneNumero);
    let proximoHito: { milestone: MilestoneNumero; faltan: number } | null = null;
    if (!hitosAlcanzados.includes(5)) {
      proximoHito = {
        milestone: 5,
        faltan: Math.max(0, 5 - gimnasiosPagoActivos),
      };
    } else if (!hitosAlcanzados.includes(10)) {
      proximoHito = {
        milestone: 10,
        faltan: Math.max(0, 10 - gimnasiosPagoActivos),
      };
    } else if (!hitosAlcanzados.includes(15)) {
      proximoHito = {
        milestone: 15,
        faltan: Math.max(0, 15 - gimnasiosPagoActivos),
      };
    }

    const resumen: ResumenPartner = {
      partner: partner as Partner,
      balanceDisponible,
      gimnasiosReferidos: gimnasios.length,
      gimnasiosPagoActivos,
      comisionesUltimos30d,
      hitosAlcanzados,
      proximoHito,
      gimnasiosDetalle,
      notificaciones,
      tiers,
    };

    return {
      ok: true,
      resumen,
      comisiones: commissions,
      payouts,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al cargar partner";
    return { ok: false, error: msg };
  }
}

/**
 * Actualiza los datos de cobro del Partner (CBU/CVU o Alias de Mercado Pago).
 */
export async function actualizarDatosCobroAction(
  _prev: { ok?: boolean; error?: string; msg?: string },
  formData: FormData,
): Promise<{ ok?: boolean; error?: string; msg?: string }> {
  try {
    const dueno = await requireProfile();
    const admin = createAdminClient();

    const cbu_cvu = String(formData.get("cbu_cvu") ?? "").trim() || null;
    const alias_mp = String(formData.get("alias_mp") ?? "").trim() || null;
    const password = String(formData.get("password") ?? "");

    if (!cbu_cvu && !alias_mp) {
      return {
        error: "Tenés que ingresar al menos un CBU/CVU o un Alias de Mercado Pago.",
      };
    }

    if (cbu_cvu && !/^\d{22}$/.test(cbu_cvu)) {
      return { error: "El CBU o CVU debe contener exactamente 22 dígitos numéricos." };
    }

    // Reautenticación: cambiar el destino de cobro es el vector clásico de
    // "robo de sesión → redirijo el próximo retiro a mi cuenta" — se exige
    // la contraseña de la cuenta antes de tocar cbu_cvu/alias_mp (mismo
    // patrón que resetearPinConContrasena de Ingresos).
    if (!password) {
      return { error: "Ingresá tu contraseña para confirmar el cambio de datos de cobro." };
    }

    const { data: authUser } = await admin.auth.admin.getUserById(dueno.id);
    const email = authUser?.user?.email;
    if (!email) {
      return { error: "No se pudo verificar tu cuenta. Reintentá más tarde." };
    }

    const supabaseAnon = await createClient();
    const { error: authError } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });
    if (authError) {
      return { error: "Contraseña incorrecta." };
    }

    const { error: updErr } = await admin
      .from("partners")
      .update({
        cbu_cvu,
        alias_mp,
        datos_cobro_actualizados_at: new Date().toISOString(),
      })
      .eq("user_id", dueno.id);

    if (updErr) {
      return { error: "No se pudieron guardar los datos de cobro." };
    }

    await registrarAccionAdmin(dueno.id, "partner_cambiar_datos_cobro", null, {
      partner_user_id: dueno.id,
    });

    revalidatePath("/panel/partner");
    return {
      ok: true,
      msg: "Datos de cobro actualizados. Por seguridad, no vas a poder retirar hasta dentro de 48hs.",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error inesperado";
    return { error: msg };
  }
}

/**
 * Solicita un retiro de comisiones y bonos acumulados.
 * Requiere un mínimo de $10.000 ARS y datos de cobro configurados.
 */
export async function solicitarRetiroAction(
  _prev: { ok?: boolean; error?: string; msg?: string },
  formData: FormData,
): Promise<{ ok?: boolean; error?: string; msg?: string }> {
  try {
    const dueno = await requireProfile();
    const admin = createAdminClient();

    const montoRaw = Number(formData.get("monto_ars") ?? 0);
    if (isNaN(montoRaw) || montoRaw < RETIRO_MINIMO_ARS) {
      return {
        error: `El monto mínimo de retiro es de $${RETIRO_MINIMO_ARS.toLocaleString("es-AR")} ARS.`,
      };
    }

    // Obtener partner y datos de cobro
    const { data: partner } = await admin
      .from("partners")
      .select("*")
      .eq("user_id", dueno.id)
      .single();

    if (!partner) {
      return { error: "No tenés una cuenta de Partner activa." };
    }

    if (!partner.cbu_cvu && !partner.alias_mp) {
      return {
        error:
          "Configurá primero tu CBU/CVU o Alias de Mercado Pago antes de solicitar el retiro.",
      };
    }

    // Cooldown de 48h desde el último cambio de datos de cobro: evita que
    // una sesión comprometida cambie el alias y pida el retiro al toque.
    if (partner.datos_cobro_actualizados_at) {
      const desde = Date.now() - new Date(partner.datos_cobro_actualizados_at).getTime();
      if (desde < COOLDOWN_ALIAS_MS) {
        const faltanHs = Math.ceil((COOLDOWN_ALIAS_MS - desde) / (60 * 60 * 1000));
        return {
          error: `Cambiaste tus datos de cobro hace poco. Por seguridad, esperá ${faltanHs}hs más antes de pedir un retiro.`,
        };
      }
    }

    // Verificar si ya tiene un retiro pendiente
    const { data: pendiente } = await admin
      .from("partner_payouts")
      .select("id")
      .eq("partner_id", partner.id)
      .eq("estado", "pendiente")
      .maybeSingle();

    if (pendiente) {
      return {
        error:
          "Ya tenés una solicitud de retiro pendiente en proceso. Esperá a que se complete antes de pedir otra.",
      };
    }

    // Verificar balance disponible con la función oficial SQL partner_balance()
    const { data: balanceData } = await admin.rpc("partner_balance", {
      p_partner_id: partner.id,
    });
    const balanceDisponible = Math.max(0, Number(balanceData ?? 0));

    if (montoRaw > balanceDisponible) {
      return {
        error: `El saldo disponible ($${balanceDisponible.toLocaleString("es-AR")} ARS) es insuficiente para este retiro.`,
      };
    }

    // Registrar solicitud de payout
    const destinoSnapshot = {
      cbu_cvu: partner.cbu_cvu,
      alias_mp: partner.alias_mp,
    };

    const nota = String(formData.get("nota") ?? "").trim() || null;

    const { error: insErr } = await admin.from("partner_payouts").insert({
      partner_id: partner.id,
      monto_ars: montoRaw,
      estado: "pendiente",
      destino_snapshot: destinoSnapshot,
      nota,
    });

    if (insErr) {
      return { error: "No se pudo procesar la solicitud de retiro. Intentá nuevamente." };
    }

    await registrarAccionAdmin(dueno.id, "partner_solicitar_retiro", null, {
      partner_id: partner.id,
      monto_ars: montoRaw,
    });

    revalidatePath("/panel/partner");
    return {
      ok: true,
      msg: `¡Solicitud enviada! Enviaremos $${montoRaw.toLocaleString("es-AR")} ARS a tu cuenta registrada.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error inesperado";
    return { error: msg };
  }
}

export async function marcarNotificacionPartnerLeidaAction(notificacionId: string) {
  try {
    const user = await requireProfile();
    const admin = createAdminClient();
    const { data: partner } = await admin
      .from("partners")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!partner) return { ok: false };

    await admin
      .from("partner_notifications")
      .update({ leido: true })
      .eq("id", notificacionId)
      .eq("partner_id", partner.id);

    revalidatePath("/panel/partner");
    return { ok: true };
  } catch (err) {
    return { ok: false };
  }
}
