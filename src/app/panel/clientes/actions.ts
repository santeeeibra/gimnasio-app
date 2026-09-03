"use server";

import { revalidatePath } from "next/cache";
import { requireDueno, dniAEmail, claveInicial } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generarYGuardar } from "@/lib/rutina/generar";
import { cupoSocios } from "@/lib/plataforma/cupo";
import {
  ENFASIS,
  MAX_ENFASIS,
  NIVELES,
  OBJETIVOS,
  PREFERENCIAS_EQUIPO,
  SEXOS,
  type Enfasis,
  type Nivel,
  type Objetivo,
  type PreferenciaEquipo,
  type Sexo,
} from "@/lib/rutina/tipos";

export type AltaState = {
  error?: string;
  ok?: string;
  /** Datos para que el dueño le pase el acceso al socio nuevo. */
  alta?: {
    nombre: string;
    dni: string;
    clave: string;
    gimnasio: string;
    slug: string;
    /** true = quedó pendiente de pago, no puede entrar todavía. */
    bloqueado: boolean;
  };
};

function sumarDias(fecha: Date, dias: number): string {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

export async function altaCliente(
  _prev: AltaState,
  formData: FormData,
): Promise<AltaState> {
  const dueno = await requireDueno();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const dni = String(formData.get("dni") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim() || null;
  const enPrueba = String(formData.get("modo") ?? "") === "prueba";
  const planId = enPrueba
    ? null
    : String(formData.get("plan_id") ?? "") || null;
  // Checkbox "Pago recibido": marcado por defecto en el form. Sin marcar → el
  // socio queda bloqueado hasta que el dueño registre el pago.
  const pagoRecibido =
    !enPrueba && String(formData.get("pago_recibido") ?? "") === "on";
  const sexoRaw = String(formData.get("sexo") ?? "");
  const sexo: Sexo | null =
    sexoRaw === "mujer" || sexoRaw === "hombre" ? sexoRaw : null;

  if (!nombre || !dni) return { error: "Nombre y DNI son obligatorios." };
  if (!/^\d{6,}$/.test(dni)) return { error: "El DNI debe ser numérico." };

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: gym } = await supabase
    .from("gimnasios")
    .select("slug, nombre")
    .eq("id", dueno.gimnasio_id)
    .single();
  if (!gym) return { error: "No se encontró el gimnasio." };

  const cupo = await cupoSocios(admin, dueno.gimnasio_id);
  if (!cupo.ok) {
    return {
      error: `Llegaste al límite de socios de tu plan${
        cupo.plan ? ` (${cupo.plan})` : ""
      }: ${cupo.max}. Contactá a soporte para ampliarlo.`,
    };
  }

  const clave = claveInicial(dni);
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email: dniAEmail(dni, gym.slug),
    password: clave,
    email_confirm: true,
  });
  if (authErr || !created.user) {
    return { error: "Ya existe un cliente con ese DNI en este gimnasio." };
  }

  const { error: profErr } = await admin.from("profiles").insert({
    id: created.user.id,
    gimnasio_id: dueno.gimnasio_id,
    rol: "cliente",
    dni,
    nombre,
    telefono,
    debe_cambiar_clave: true,
  });
  if (profErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "No se pudo crear el cliente." };
  }

  // Solo se cargan fechas si el dueño confirmó que ya pagó. Alta sin pago →
  // sin fechas, cuota vencida y acceso bloqueado hasta registrar el pago.
  let fechaInicio: string | null = null;
  let fechaVenc: string | null = null;
  let precioPlan = 0;
  if (pagoRecibido && planId) {
    const { data: plan } = await admin
      .from("planes")
      .select("duracion_dias, precio")
      .eq("id", planId)
      .single();
    if (plan) {
      const hoy = new Date();
      fechaInicio = hoy.toISOString().slice(0, 10);
      fechaVenc = sumarDias(hoy, plan.duracion_dias);
      precioPlan = Number(plan.precio) || 0;
    }
  }

  const accesoHabilitado = enPrueba || pagoRecibido;

  const { data: clienteRow } = await admin
    .from("clientes")
    .insert({
      gimnasio_id: dueno.gimnasio_id,
      profile_id: created.user.id,
      plan_id: planId,
      sexo,
      fecha_inicio: fechaInicio,
      fecha_vencimiento: fechaVenc,
      estado_cuota: fechaVenc ? "al_dia" : "vencido",
      acceso_habilitado: accesoHabilitado,
      en_prueba: enPrueba,
      prueba_iniciada_en: enPrueba
        ? new Date().toISOString().slice(0, 10)
        : null,
    })
    .select("id")
    .single();

  // Si ya pagó, dejamos la primera cuota registrada para que aparezca en el
  // historial y en "Mis pagos" del socio.
  if (pagoRecibido && planId && fechaVenc && clienteRow) {
    await admin.from("pagos").insert({
      gimnasio_id: dueno.gimnasio_id,
      cliente_id: clienteRow.id,
      plan_id: planId,
      monto: precioPlan,
      cubre_hasta: fechaVenc,
      registrado_por: dueno.id,
    });
  }

  revalidatePath("/panel/clientes");
  revalidatePath("/panel");

  const bloqueado = !accesoHabilitado;
  return {
    ok: enPrueba
      ? `${nombre} quedó en 1 día de prueba.`
      : bloqueado
        ? `${nombre} quedó dado de alta, pendiente de pago.`
        : `${nombre} quedó dado de alta.`,
    alta: {
      nombre,
      dni,
      clave,
      gimnasio: gym.nombre,
      slug: gym.slug,
      bloqueado,
    },
  };
}

export async function registrarPago(
  _prev: { error?: string; ok?: string },
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  const dueno = await requireDueno();
  const clienteId = String(formData.get("cliente_id") ?? "");
  const monto = Number(formData.get("monto") ?? 0);
  const planId = String(formData.get("plan_id") ?? "") || null;
  if (!clienteId || !planId) return { error: "Elegí el plan que pagó." };

  const admin = createAdminClient();
  const { data: plan } = await admin
    .from("planes")
    .select("duracion_dias, precio")
    .eq("id", planId)
    .single();
  if (!plan) return { error: "Plan inválido." };

  const { data: cli } = await admin
    .from("clientes")
    .select("fecha_vencimiento")
    .eq("id", clienteId)
    .single();

  // Si todavía tiene días, se suma sobre el vencimiento; si no, desde hoy.
  const base =
    cli?.fecha_vencimiento && new Date(cli.fecha_vencimiento) > new Date()
      ? new Date(cli.fecha_vencimiento)
      : new Date();
  const cubreHasta = sumarDias(base, plan.duracion_dias);

  await admin.from("pagos").insert({
    gimnasio_id: dueno.gimnasio_id,
    cliente_id: clienteId,
    plan_id: planId,
    monto: monto || plan.precio,
    cubre_hasta: cubreHasta,
    registrado_por: dueno.id,
  });

  await admin
    .from("clientes")
    .update({
      plan_id: planId,
      fecha_vencimiento: cubreHasta,
      estado_cuota: "al_dia",
      acceso_habilitado: true,
      en_prueba: false,
      ultimo_aviso_morosidad_enviado_en: null,
    })
    .eq("id", clienteId);

  revalidatePath(`/panel/clientes/${clienteId}`);
  revalidatePath("/panel/clientes");
  revalidatePath("/panel");
  return { ok: `Pago registrado. Cuota al día hasta ${cubreHasta}.` };
}

// El dueño vuelve la contraseña del socio a la inicial (gym + últimos 4 del
// DNI) y lo obliga a cambiarla en el próximo ingreso. Sirve para reenviar el
// acceso a un socio que la perdió.
export async function regenerarClave(
  _prev: { error?: string; ok?: string; clave?: string },
  formData: FormData,
): Promise<{ error?: string; ok?: string; clave?: string }> {
  const dueno = await requireDueno();
  const clienteId = String(formData.get("cliente_id") ?? "");
  if (!clienteId) return { error: "Falta el cliente." };

  const admin = createAdminClient();
  const { data: cli } = await admin
    .from("clientes")
    .select("gimnasio_id, profile:profiles(id, dni)")
    .eq("id", clienteId)
    .maybeSingle();
  const prof = (cli as any)?.profile as { id: string; dni: string } | null;
  if (!cli || cli.gimnasio_id !== dueno.gimnasio_id || !prof) {
    return { error: "Cliente no encontrado." };
  }

  const clave = claveInicial(prof.dni);
  const { error: authErr } = await admin.auth.admin.updateUserById(prof.id, {
    password: clave,
  });
  if (authErr) return { error: "No se pudo regenerar la contraseña." };

  await admin
    .from("profiles")
    .update({ debe_cambiar_clave: true })
    .eq("id", prof.id);

  revalidatePath(`/panel/clientes/${clienteId}`);
  return { ok: "Contraseña restablecida.", clave };
}

export async function generarRutinaCliente(
  _prev: { error?: string; ok?: string },
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  const dueno = await requireDueno();
  const clienteId = String(formData.get("cliente_id") ?? "");
  const objetivo = String(formData.get("objetivo") ?? "") as Objetivo;
  const nivel = String(formData.get("nivel") ?? "") as Nivel;
  const preferencia = String(formData.get("preferencia") ?? "") as PreferenciaEquipo;
  const dias = Number(formData.get("dias") ?? 0);
  const sexoRaw = String(formData.get("sexo") ?? "");
  const sexo = ((SEXOS as readonly string[]).includes(sexoRaw)
    ? sexoRaw
    : "sin_especificar") as Sexo;
  const enfasis = formData
    .getAll("enfasis")
    .map(String)
    .filter((v): v is Enfasis => (ENFASIS as readonly string[]).includes(v))
    .slice(0, MAX_ENFASIS);

  if (!clienteId) return { error: "Falta el cliente." };
  if (!OBJETIVOS.includes(objetivo)) return { error: "Elegí un objetivo." };
  if (!NIVELES.includes(nivel)) return { error: "Elegí el nivel." };
  if (!(preferencia in PREFERENCIAS_EQUIPO)) return { error: "Elegí el equipamiento." };
  if (!Number.isInteger(dias) || dias < 2 || dias > 6) {
    return { error: "Los días por semana van de 2 a 6." };
  }

  const supabase = await createClient();
  const { data: cli } = await supabase
    .from("clientes")
    .select("id")
    .eq("id", clienteId)
    .eq("gimnasio_id", dueno.gimnasio_id)
    .maybeSingle();
  if (!cli) return { error: "Cliente no encontrado." };

  const seed = Math.floor(Math.random() * 1_000_000_000);
  const res = await generarYGuardar(supabase, {
    gimnasioId: dueno.gimnasio_id,
    clienteId,
    entrada: { objetivo, nivel, preferencia, dias, sexo, enfasis, seed },
  });
  if (res.error) return { error: res.error };

  revalidatePath(`/panel/clientes/${clienteId}`);
  return { ok: "Rutina generada para el cliente." };
}
