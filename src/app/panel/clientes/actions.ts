"use server";

import { revalidatePath } from "next/cache";
import { requireDueno, dniAEmail, claveInicial } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generarYGuardar } from "@/lib/rutina/generar";
import { cupoSocios } from "@/lib/plataforma/cupo";
import { registrarError } from "@/lib/admin/errores";
import { aplicarCuotaAlDia, calcularCubreHasta } from "@/lib/pagos/cobro-socio";
import {
  ENFASIS,
  MAX_ENFASIS,
  MOLESTIAS,
  NIVELES,
  OBJETIVOS,
  PREFERENCIAS_EQUIPO,
  SEXOS,
  type Enfasis,
  type Molestia,
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

export async function altaCliente(
  _prev: AltaState,
  formData: FormData,
): Promise<AltaState> {
  const dueno = await requireDueno();
  try {
    return await altaClienteInterno(dueno, formData);
  } catch (err) {
    // Log para el semáforo de /admin; el error se sigue propagando igual.
    await registrarError(dueno.gimnasio_id, "alta_cliente", err);
    throw err;
  }
}

async function altaClienteInterno(
  dueno: Awaited<ReturnType<typeof requireDueno>>,
  formData: FormData,
): Promise<AltaState> {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const dni = String(formData.get("dni") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim() || null;
  const email =
    String(formData.get("email") ?? "").trim().toLowerCase() || null;
  const fotoUrl = String(formData.get("foto_url") ?? "").trim() || null;
  const enPrueba = String(formData.get("modo") ?? "") === "prueba";
  const planId = enPrueba
    ? null
    : String(formData.get("plan_id") ?? "") || null;
  const sexoRaw = String(formData.get("sexo") ?? "");
  const sexo: Sexo | null =
    sexoRaw === "mujer" || sexoRaw === "hombre" ? sexoRaw : null;

  if (!nombre || !dni) return { error: "Nombre y DNI son obligatorios." };
  if (!/^\d{6,}$/.test(dni)) return { error: "El DNI debe ser numérico." };
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "El email no parece válido." };
  }

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
    await registrarError(dueno.gimnasio_id, "alta_cliente", profErr);
    return { error: "No se pudo crear el cliente." };
  }

  // El alta no registra pago: el socio queda con el plan asignado (si se
  // eligió), cuota vencida y sin fechas hasta que el dueño registre el primer
  // pago desde la ficha del socio. El acceso a la app queda habilitado igual.
  const insertData: Record<string, any> = {
    gimnasio_id: dueno.gimnasio_id,
    profile_id: created.user.id,
    plan_id: planId,
    sexo,
    email,
    foto_url: fotoUrl,
    fecha_inicio: null,
    fecha_vencimiento: null,
    estado_cuota: "vencido",
    acceso_habilitado: true,
    en_prueba: enPrueba,
    prueba_iniciada_en: enPrueba
      ? new Date().toISOString().slice(0, 10)
      : null,
  };

  const pesoInicial = Number(formData.get("peso_inicial") ?? 0);

  let clienteId: string | null = null;
  let { data: cliData, error: cliErr } = await admin
    .from("clientes")
    .insert(insertData)
    .select("id")
    .single();
  if (cliErr && cliErr.message?.includes("foto_url")) {
    delete insertData.foto_url;
    const res = await admin
      .from("clientes")
      .insert(insertData)
      .select("id")
      .single();
    cliErr = res.error;
    cliData = res.data;
  }
  clienteId = (cliData as { id: string } | null)?.id ?? null;

  if (cliErr) {
    await registrarError(dueno.gimnasio_id, "alta_cliente", cliErr);
  }

  // Registrar peso corporal inicial si fue provisto
  if (clienteId && pesoInicial > 0 && pesoInicial < 1000) {
    try {
      await admin.from("registro_peso").insert({
        gimnasio_id: dueno.gimnasio_id,
        cliente_id: clienteId,
        fecha: new Date().toISOString().slice(0, 10),
        peso: pesoInicial,
        nota: "Peso inicial al alta",
        creado_por: "dueno",
      });
    } catch {
      // no bloquea el alta
    }
  }

  revalidatePath("/panel/clientes");
  revalidatePath("/panel");

  return {
    ok: enPrueba
      ? `${nombre} quedó en 1 día de prueba.`
      : planId
        ? `${nombre} quedó dado de alta. Registrá el primer pago desde su ficha.`
        : `${nombre} quedó dado de alta.`,
    alta: {
      nombre,
      dni,
      clave,
      gimnasio: gym.nombre,
      slug: gym.slug,
      bloqueado: false,
    },
  };
}

export async function registrarPago(
  _prev: { error?: string; ok?: string },
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  const dueno = await requireDueno();
  try {
    return await registrarPagoInterno(dueno, formData);
  } catch (err) {
    await registrarError(dueno.gimnasio_id, "pago", err);
    throw err;
  }
}

async function registrarPagoInterno(
  dueno: Awaited<ReturnType<typeof requireDueno>>,
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  const clienteId = String(formData.get("cliente_id") ?? "");
  const monto = Number(formData.get("monto") ?? 0);
  const planId = String(formData.get("plan_id") ?? "") || null;
  const fechaManual =
    String(formData.get("fecha_vencimiento_manual") ?? "").trim() || null;
  const comprobanteRef =
    String(formData.get("comprobante_ref") ?? "").trim() || null;
  if (!clienteId || !planId) return { error: "Elegí el plan que pagó." };
  if (fechaManual && !/^\d{4}-\d{2}-\d{2}$/.test(fechaManual)) {
    return { error: "La fecha de vencimiento no es válida." };
  }

  const admin = createAdminClient();
  const { data: plan } = await admin
    .from("planes")
    .select("duracion_dias, precio")
    .eq("id", planId)
    .single();
  if (!plan) return { error: "Plan inválido." };

  // Si eligió fecha manual, se respeta tal cual. Si no: si todavía tiene
  // días, se suma sobre el vencimiento; si no, desde hoy. Misma lógica que
  // usa el webhook del cobro automático (src/lib/pagos/cobro-socio.ts).
  const cubreHasta = await calcularCubreHasta(
    admin,
    clienteId,
    plan.duracion_dias,
    fechaManual,
  );

  const { error: pagoErr } = await admin.from("pagos").insert({
    gimnasio_id: dueno.gimnasio_id,
    cliente_id: clienteId,
    plan_id: planId,
    monto: monto || plan.precio,
    cubre_hasta: cubreHasta,
    registrado_por: dueno.id,
    comprobante_ref: comprobanteRef,
  });
  if (pagoErr) {
    await registrarError(dueno.gimnasio_id, "pago", pagoErr);
  }

  const upd = await aplicarCuotaAlDia(admin, clienteId, planId, cubreHasta);
  if (!upd.ok) {
    await registrarError(dueno.gimnasio_id, "pago", upd.msg);
  }

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

// El dueño corrige los datos de un socio ya creado. El DNI es delicado: de él
// sale el email sintético de login (`dniAEmail`), así que si cambia hay que
// actualizar también el usuario de auth. Contraseña opcional: si viene, se
// setea y se fuerza el cambio en el próximo ingreso.
export async function editarCliente(
  _prev: { error?: string; ok?: string; clave?: string },
  formData: FormData,
): Promise<{ error?: string; ok?: string; clave?: string }> {
  const dueno = await requireDueno();
  const clienteId = String(formData.get("cliente_id") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const dni = String(formData.get("dni") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim() || null;
  const email =
    String(formData.get("email") ?? "").trim().toLowerCase() || null;
  const sexoRaw = String(formData.get("sexo") ?? "");
  const sexo: Sexo | null =
    sexoRaw === "mujer" || sexoRaw === "hombre" ? sexoRaw : null;
  const nuevaClave = String(formData.get("clave") ?? "").trim();

  if (!clienteId) return { error: "Falta el cliente." };
  if (!nombre || !dni) return { error: "Nombre y DNI son obligatorios." };
  if (!/^\d{6,}$/.test(dni)) return { error: "El DNI debe ser numérico." };
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "El email no parece válido." };
  }
  if (nuevaClave && nuevaClave.length < 4) {
    return { error: "La contraseña nueva necesita al menos 4 caracteres." };
  }

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

  const dniCambio = dni !== prof.dni;
  let slug: string | null = null;
  if (dniCambio) {
    const { data: gym } = await admin
      .from("gimnasios")
      .select("slug")
      .eq("id", dueno.gimnasio_id)
      .single();
    if (!gym) return { error: "No se encontró el gimnasio." };
    slug = gym.slug;

    const { data: choca } = await admin
      .from("profiles")
      .select("id")
      .eq("gimnasio_id", dueno.gimnasio_id)
      .eq("dni", dni)
      .maybeSingle();
    if (choca) {
      return { error: "Ya hay otro socio con ese DNI en este gimnasio." };
    }
  }

  // Perfil primero; si después falla el email de auth, revertimos el DNI.
  const { error: profErr } = await admin
    .from("profiles")
    .update({ nombre, telefono, dni })
    .eq("id", prof.id);
  if (profErr) {
    return { error: "No se pudieron guardar los datos del socio." };
  }

  if (dniCambio && slug) {
    const { error: emailErr } = await admin.auth.admin.updateUserById(prof.id, {
      email: dniAEmail(dni, slug),
    });
    if (emailErr) {
      await admin
        .from("profiles")
        .update({ dni: prof.dni })
        .eq("id", prof.id);
      return { error: "No se pudo actualizar el DNI de acceso." };
    }
  }

  await admin.from("clientes").update({ sexo, email }).eq("id", clienteId);

  let claveMostrar: string | undefined;
  if (nuevaClave) {
    const { error: pwErr } = await admin.auth.admin.updateUserById(prof.id, {
      password: nuevaClave,
    });
    if (pwErr) return { error: "No se pudo cambiar la contraseña." };
    await admin
      .from("profiles")
      .update({ debe_cambiar_clave: true })
      .eq("id", prof.id);
    claveMostrar = nuevaClave;
  }

  revalidatePath(`/panel/clientes/${clienteId}`);
  revalidatePath("/panel/clientes");
  return { ok: "Datos actualizados.", clave: claveMostrar };
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
  const zonasDolor = formData
    .getAll("zonasDolor")
    .map(String)
    .filter((v): v is Molestia => (MOLESTIAS as readonly string[]).includes(v));

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
    entrada: { objetivo, nivel, preferencia, dias, sexo, enfasis, zonasDolor, seed },
  });
  if (res.error) return { error: res.error };

  revalidatePath(`/panel/clientes/${clienteId}`);
  return { ok: "Rutina generada para el cliente." };
}

export async function guardarFotoSocio(
  clienteId: string,
  fotoUrl: string | null,
): Promise<{ error?: string }> {
  const dueno = await requireDueno();
  const supabase = await createClient();

  const { data: cli } = await supabase
    .from("clientes")
    .select("id, gimnasio_id")
    .eq("id", clienteId)
    .maybeSingle();

  if (!cli || cli.gimnasio_id !== dueno.gimnasio_id) {
    return { error: "Cliente no encontrado o no pertenece a tu gimnasio." };
  }

  const { error } = await supabase
    .from("clientes")
    .update({ foto_url: fotoUrl })
    .eq("id", clienteId)
    .eq("gimnasio_id", dueno.gimnasio_id);

  if (error) {
    return { error: "No se pudo actualizar la foto de perfil." };
  }

  revalidatePath(`/panel/clientes/${clienteId}`);
  revalidatePath("/panel/clientes");
  revalidatePath("/panel");

  return {};
}
