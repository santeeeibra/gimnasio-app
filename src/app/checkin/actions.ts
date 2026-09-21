"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaffODueno, dniAEmail } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { enviarPush } from "@/lib/push/enviar";
import { registrarError } from "@/lib/admin/errores";
import { verificarPlanGimnasio } from "@/lib/plataforma/plan-gate";
import { puedeImpersonar } from "@/lib/impersonation";
import { decidirAcceso } from "@/lib/acceso/decision";

export type CheckinState = {
  estado?: "ok" | "prueba_vencida" | "cuota_vencida" | "no_encontrado";
  nombre?: string;
  error?: string;
};

export type CheckinLoteItem = {
  /** Id local del ítem en el IndexedDB `checkins_queue` del kiosko. */
  clientRef: string;
  dni: string;
};

export type CheckinLoteResultado = CheckinState & { clientRef: string };

/**
 * Marca el ingreso de un cliente a partir de su DNI.
 * Corre dentro de la sesión autenticada del dueño o staff (modo kiosko), usa el
 * cliente RLS de Supabase: sólo ve/inserta registros de su gimnasio.
 */
export async function marcarIngreso(
  _prev: CheckinState,
  formData: FormData,
): Promise<CheckinState> {
  const dueno = await requireStaffODueno();
  const dni = String(formData.get("dni") ?? "").replace(/\D/g, "").trim();
  const clientRef = String(formData.get("client_ref") ?? "").trim() || null;

  if (!dni) return { error: "Escribí un DNI." };

  try {
    return await marcarIngresoInterno(dueno, dni, clientRef);
  } catch (err) {
    // Log para el semáforo de /admin; el flujo sigue igual (se propaga).
    await registrarError(dueno.gimnasio_id, "checkin", err);
    throw err;
  }
}

/**
 * Sincroniza en lote los check-ins guardados offline en el IndexedDB
 * `checkins_queue` del kiosko. Cada ítem trae su `clientRef` (el id que le
 * puso el navegador al encolarlo): ese id es la clave de dedup real — a
 * diferencia del check-in único (que no tiene forma de generar uno), acá la
 * cola puede reintentar el mismo ítem varias veces (reconexión + doble
 * sincronización) y el índice único en `registros_entrada(cliente_id,
 * client_ref)` hace que reinsertarlo sea un no-op en vez de una fila
 * repetida. Se procesan en paralelo porque cada ítem es independiente.
 */
export async function marcarIngresosLote(
  items: CheckinLoteItem[],
): Promise<CheckinLoteResultado[]> {
  const dueno = await requireStaffODueno();

  return Promise.all(
    items.map(async ({ clientRef, dni }) => {
      const dniLimpio = dni.replace(/\D/g, "").trim();
      if (!dniLimpio) return { clientRef, error: "DNI vacío." };
      try {
        const resultado = await marcarIngresoInterno(dueno, dniLimpio, clientRef);
        return { ...resultado, clientRef };
      } catch (err) {
        await registrarError(dueno.gimnasio_id, "checkin", err);
        return { clientRef, error: "No se pudo sincronizar." };
      }
    }),
  );
}

async function marcarIngresoInterno(
  dueno: Awaited<ReturnType<typeof requireStaffODueno>>,
  dni: string,
  clientRef: string | null = null,
): Promise<CheckinState> {
  const supabase = await createClient();

  const infoPlan = await verificarPlanGimnasio(supabase, dueno.gimnasio_id);
  if (!infoPlan.permiteCheckin) {
    return { error: "El modo Check-in requiere Plan Elite activo." };
  }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("id, nombre")
    .eq("gimnasio_id", dueno.gimnasio_id)
    .eq("rol", "cliente")
    .eq("dni", dni)
    .maybeSingle();

  if (!perfil) return { estado: "no_encontrado" };

  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, en_prueba, prueba_iniciada_en, estado_cuota")
    .eq("profile_id", perfil.id)
    .maybeSingle();

  if (!cliente) return { estado: "no_encontrado" };

  const { count: previos } = await supabase
    .from("registros_entrada")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", cliente.id);

  const esPrimerIngreso = (previos ?? 0) === 0;

  // Decisión pura (misma regla que va a usar el torniquete): un acceso
  // bloqueado (cuota vencida, prueba vencida o DNI inexistente) nunca debe
  // generar un registro de asistencia.
  const decision = decidirAcceso({
    socioEncontrado: true,
    enPrueba: cliente.en_prueba,
    pruebaVencida: cliente.en_prueba && !esPrimerIngreso,
    estadoCuota: cliente.estado_cuota,
  });

  if (decision.registrarAsistencia) {
    if (clientRef) {
      // Viene de la cola offline: el `clientRef` es el id que el navegador le
      // puso al encolarlo, así que reintentar el mismo ítem (reconexión, doble
      // sincronización) es un no-op gracias al índice único
      // registros_entrada(cliente_id, client_ref) — no una fila duplicada.
      await supabase
        .from("registros_entrada")
        .upsert(
          { gimnasio_id: dueno.gimnasio_id, cliente_id: cliente.id, client_ref: clientRef },
          { onConflict: "cliente_id,client_ref", ignoreDuplicates: true },
        );
    } else {
      // Check-in en vivo, sin clientRef: un doble tap/escaneo repetido en la
      // misma sesión no tiene id de dedup propio, así que nos apoyamos en la
      // ventana de tiempo como antes.
      const { data: ultimoIngreso } = await supabase
        .from("registros_entrada")
        .select("creado_en")
        .eq("cliente_id", cliente.id)
        .order("creado_en", { ascending: false })
        .limit(1)
        .maybeSingle();

      const yaMarcoRecien =
        !!ultimoIngreso &&
        Date.now() - new Date(ultimoIngreso.creado_en).getTime() < 2 * 60 * 1000;

      if (!yaMarcoRecien) {
        await supabase.from("registros_entrada").insert({
          gimnasio_id: dueno.gimnasio_id,
          cliente_id: cliente.id,
        });
      }
    }

    revalidatePath("/panel/asistencia");
    revalidatePath("/panel");

    if (cliente.en_prueba && esPrimerIngreso && !cliente.prueba_iniciada_en) {
      await supabase
        .from("clientes")
        .update({ prueba_iniciada_en: new Date().toISOString().slice(0, 10) })
        .eq("id", cliente.id);
    }

    return { estado: "ok", nombre: perfil.nombre };
  }

  if (decision.motivo === "prueba_vencida") {
    await enviarPush([dueno.id], {
      title: "Intento bloqueado por prueba vencida",
      body: `${perfil.nombre} intentó entrar de nuevo y sigue en día de prueba.`,
      url: `/panel/clientes/${cliente.id}`,
      tag: `prueba-vencida-${cliente.id}`,
    });
    return { estado: "prueba_vencida", nombre: perfil.nombre };
  }

  await enviarPush([dueno.id], {
    title: "Intento de ingreso bloqueado por cuota vencida",
    body: `${perfil.nombre} intentó entrar con la cuota vencida.`,
    url: `/panel/clientes/${cliente.id}`,
    tag: `cuota-vencida-${cliente.id}`,
  });
  return { estado: "cuota_vencida", nombre: perfil.nombre };
}

/**
 * Sale del modo kiosko y vuelve al panel completo. Pide de nuevo la clave del
 * dueño (no un simple botón "volver").
 */
export async function salirModoCheckin(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const dueno = await requireStaffODueno();
  const clave = String(formData.get("clave") ?? "");
  if (!clave) return { error: "Ingresá tu clave." };

  const supabase = await createClient();
  const { data: gym } = await supabase
    .from("gimnasios")
    .select("slug")
    .eq("id", dueno.gimnasio_id)
    .single();
  if (!gym) return { error: "No se pudo verificar." };

  const { error } = await supabase.auth.signInWithPassword({
    email: dniAEmail(dueno.dni, gym.slug),
    password: clave,
  });
  if (error) return { error: "Clave incorrecta." };

  redirect("/panel");
}

/**
 * Atajo de soporte: sale del modo kiosko sin pedir la clave del dueño.
 * Solo para superadmin o mientras hay una impersonación en curso (mismo
 * chequeo que habilita el resto de "Modo Demo") — NO es un bypass general:
 * si `puedeImpersonar()` da false (un dueño/staff real, sin sesión de
 * soporte detrás), se rechaza y el kiosko sigue pidiendo la clave como
 * siempre. El gate de seguridad real sigue siendo ese, no la UI.
 */
export async function salirCheckinSoporte(): Promise<{ error?: string; ok?: string }> {
  await requireStaffODueno();
  if (!(await puedeImpersonar())) {
    return { error: "No autorizado: esto es solo para la sesión de soporte." };
  }
  redirect("/panel");
}
