"use server";

// Acciones de "Modo Demo": arman FormData con datos random y llaman a las
// server actions reales (misma validación, mismo camino de datos que un
// usuario de verdad). Solo pensadas para mostrar flujos en vivo — se cortan
// solas si NEXT_PUBLIC_DEMO_MODE no está prendido.

import { requireStaffODueno, requireDueno, requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { altaCliente, registrarPago, generarRutinaCliente } from "@/app/panel/clientes/actions";
import { marcarIngreso } from "@/app/checkin/actions";
import { enviarMensaje } from "@/app/panel/mensajes/actions";
import { crearPlan } from "@/app/panel/planes/actions";
import { generarMiRutina } from "@/app/mi/rutina/actions";
import { guardarProgresoCliente } from "@/lib/progreso/actions";
import { OBJETIVOS, NIVELES, PREFERENCIAS_EQUIPO } from "@/lib/rutina/tipos";
import { nombreRandom, dniRandom, telefonoRandom, mensajeRandom, pick } from "@/lib/demo/generador";

type Resultado = { error?: string; ok?: string };

function demoHabilitado(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "1";
}

const BLOQUEADO: Resultado = { error: "Modo demo no habilitado (NEXT_PUBLIC_DEMO_MODE)." };

// ── Panel dueño ──────────────────────────────────────────────────────────

export async function demoAltaCliente(): Promise<Resultado> {
  if (!demoHabilitado()) return BLOQUEADO;
  const dueno = await requireStaffODueno();
  const supabase = await createClient();

  const { data: planes } = await supabase
    .from("planes")
    .select("id")
    .eq("gimnasio_id", dueno.gimnasio_id)
    .eq("activo", true);
  if (!planes || planes.length === 0) return { error: "El gimnasio no tiene planes activos." };

  const { nombre, sexo } = nombreRandom();
  const fd = new FormData();
  fd.set("nombre", nombre);
  fd.set("dni", dniRandom());
  fd.set("telefono", telefonoRandom());
  fd.set("modo", "activo");
  fd.set("plan_id", pick(planes).id);
  fd.set("sexo", sexo);

  return altaCliente({}, fd);
}

async function clienteAlAzar(gimnasioId: string) {
  const supabase = await createClient();
  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, plan_id, profile:profiles(nombre, dni)")
    .eq("gimnasio_id", gimnasioId);
  if (!clientes || clientes.length === 0) return null;
  return pick(clientes);
}

export async function demoRegistrarPago(): Promise<Resultado> {
  if (!demoHabilitado()) return BLOQUEADO;
  const dueno = await requireStaffODueno();
  const cliente = await clienteAlAzar(dueno.gimnasio_id);
  if (!cliente || !cliente.plan_id) return { error: "No hay clientes con plan para cobrarles." };

  const fd = new FormData();
  fd.set("cliente_id", cliente.id);
  fd.set("plan_id", cliente.plan_id);

  return registrarPago({}, fd);
}

export async function demoCheckin(): Promise<Resultado> {
  if (!demoHabilitado()) return BLOQUEADO;
  const dueno = await requireStaffODueno();
  const cliente = await clienteAlAzar(dueno.gimnasio_id);
  const dni = (cliente?.profile as unknown as { dni?: string } | null)?.dni;
  if (!dni) return { error: "No hay clientes para simular el ingreso." };

  const fd = new FormData();
  fd.set("dni", dni);
  const res = await marcarIngreso({}, fd);
  if (res.error) return { error: res.error };
  if (res.estado === "no_encontrado") return { error: "No se encontró el DNI simulado." };
  return { ok: `Ingreso marcado: ${res.nombre ?? dni}` };
}

export async function demoEnviarAviso(): Promise<Resultado> {
  if (!demoHabilitado()) return BLOQUEADO;
  await requireDueno();
  const fd = new FormData();
  fd.set("cuerpo", mensajeRandom());
  fd.set("modo", "todos");
  return enviarMensaje({}, fd);
}

export async function demoCrearPlan(): Promise<Resultado> {
  if (!demoHabilitado()) return BLOQUEADO;
  await requireDueno();
  const fd = new FormData();
  fd.set("nombre", `Plan ${pick(["Full", "Básico", "Estudiantes", "Mañana"])} (demo)`);
  fd.set("precio", String(15000 + Math.floor(Math.random() * 25000)));
  fd.set("duracion_dias", "30");
  const res = await crearPlan({}, fd);
  if (res.error) return { error: res.error };
  return { ok: "Plan creado." };
}

export async function demoCrearPlanConDescuento(): Promise<Resultado> {
  if (!demoHabilitado()) return BLOQUEADO;
  await requireDueno();
  const porcentaje = pick([10, 15, 20]);
  const fd = new FormData();
  fd.set("nombre", `Plan Anual (demo -${porcentaje}%)`);
  fd.set("precio", String(15000 + Math.floor(Math.random() * 25000)));
  fd.set("duracion_dias", "30");
  fd.set(
    "descuentos",
    JSON.stringify([
      { id: `demo_${Date.now()}`, nombre: "Pago anticipado", porcentaje },
    ]),
  );
  const res = await crearPlan({}, fd);
  if (res.error) return { error: res.error };
  return { ok: `Plan con ${porcentaje}% de descuento creado.` };
}

export async function demoGenerarRutinaCliente(): Promise<Resultado> {
  if (!demoHabilitado()) return BLOQUEADO;
  const dueno = await requireStaffODueno();
  const cliente = await clienteAlAzar(dueno.gimnasio_id);
  if (!cliente) return { error: "No hay clientes para generarles rutina." };

  const fd = new FormData();
  fd.set("cliente_id", cliente.id);
  fd.set("objetivo", pick(OBJETIVOS));
  fd.set("nivel", pick(NIVELES));
  fd.set("preferencia", pick(Object.keys(PREFERENCIAS_EQUIPO)));
  fd.set("dias", String(3 + Math.floor(Math.random() * 3))); // 3 a 5

  return generarRutinaCliente({}, fd);
}

// ── Panel cliente (/mi) ─────────────────────────────────────────────────

export async function demoGenerarMiRutina(): Promise<Resultado> {
  if (!demoHabilitado()) return BLOQUEADO;
  await requireProfile();
  const fd = new FormData();
  fd.set("objetivo", pick(OBJETIVOS));
  fd.set("nivel", pick(NIVELES));
  fd.set("preferencia", pick(Object.keys(PREFERENCIAS_EQUIPO)));
  fd.set("dias", String(3 + Math.floor(Math.random() * 3)));

  return generarMiRutina({}, fd);
}

export async function demoRegistrarProgreso(): Promise<Resultado> {
  if (!demoHabilitado()) return BLOQUEADO;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: cliente } = await supabase
    .from("clientes")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();
  if (!cliente) return { error: "No se encontró tu ficha de cliente." };

  const { data: rutina } = await supabase
    .from("rutinas")
    .select("id")
    .eq("cliente_id", cliente.id)
    .maybeSingle();
  if (!rutina) return { error: "Generá tu rutina primero." };

  const { data: items } = await supabase
    .from("rutina_items")
    .select("ejercicio_id")
    .eq("rutina_id", rutina.id);
  if (!items || items.length === 0) return { error: "Tu rutina no tiene ejercicios cargados." };

  const ejercicio = pick(items);
  const fd = new FormData();
  fd.set("ejercicio_id", ejercicio.ejercicio_id);
  fd.set("peso", String(Math.round((20 + Math.random() * 60) * 2) / 2));
  fd.set("reps", String(6 + Math.floor(Math.random() * 7)));

  const res = await guardarProgresoCliente({}, fd);
  if (res.error) return { error: res.error };
  return { ok: res.record?.esRecord ? "¡Progreso guardado, nuevo récord!" : "Progreso guardado." };
}
