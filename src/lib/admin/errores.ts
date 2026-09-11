import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { notificarSuperadmin } from "@/lib/admin/notificar";

/** De dónde salió el error. Mismo criterio que la columna `origen`. */
export type OrigenError =
  | "alta_cliente"
  | "alta_staff"
  | "checkin"
  | "rutina"
  | "pago"
  | "push";

/** Texto legible por origen, para mostrar en /admin/errores sin jerga. */
export const ORIGEN_LABEL: Record<OrigenError, string> = {
  alta_cliente: "Alta de socio",
  alta_staff: "Alta de empleado",
  checkin: "Check-in",
  rutina: "Rutina",
  pago: "Pago",
  push: "Notificación",
};

/** Semáforo por gimnasio según la cantidad de errores en las últimas 24 h. */
export type SemaforoNivel = "verde" | "amarillo" | "rojo";

export function semaforo(cantidad: number): SemaforoNivel {
  if (cantidad >= 3) return "rojo";
  if (cantidad >= 1) return "amarillo";
  return "verde";
}

export const SEMAFORO_COLOR: Record<SemaforoNivel, string> = {
  verde: "bg-ok",
  amarillo: "bg-warn",
  rojo: "bg-danger",
};

export const SEMAFORO_TITULO: Record<SemaforoNivel, string> = {
  verde: "Sin errores en las últimas 24 h",
  amarillo: "1 o 2 errores en las últimas 24 h",
  rojo: "3 o más errores en las últimas 24 h",
};

/** Texto tipo "hace 5 min" / "hace 2 h" / "hace 3 días", sin jerga. */
export function haceCuanto(fecha: string | Date): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  const seg = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (seg < 60) return "recién";
  const min = Math.floor(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.floor(h / 24);
  return `hace ${dias} día${dias === 1 ? "" : "s"}`;
}

export interface ErrorHumanizado {
  titulo: string;
  mensajeClaro: string;
  detalleTecnico?: string;
  codigo?: string;
  resumenPush: string;
}

export function humanizarError(mensaje: unknown): ErrorHumanizado {
  let obj: Record<string, unknown> | null = null;
  let str = "";

  if (typeof mensaje === "string") {
    str = mensaje.trim();
    if (
      (str.startsWith("{") && str.endsWith("}")) ||
      (str.startsWith("[") && str.endsWith("]") && !str.startsWith("[Técnica"))
    ) {
      try {
        const parsed = JSON.parse(str);
        if (typeof parsed === "object" && parsed !== null) {
          obj = parsed as Record<string, unknown>;
        }
      } catch {
        // no era JSON válido
      }
    }
  } else if (mensaje instanceof Error) {
    str = `${mensaje.name}: ${mensaje.message}`;
    obj = { name: mensaje.name, message: mensaje.message, stack: mensaje.stack };
  } else if (typeof mensaje === "object" && mensaje !== null) {
    obj = mensaje as Record<string, unknown>;
    try {
      str = JSON.stringify(mensaje);
    } catch {
      str = String(mensaje);
    }
  } else {
    str = String(mensaje ?? "Error desconocido");
  }

  // Si ya es un texto previamente estructurado con [Título] Mensaje:
  if (!obj && str.startsWith("[") && str.includes("]")) {
    const cierre = str.indexOf("]");
    const tituloPrevio = str.slice(1, cierre);
    const resto = str.slice(cierre + 1).trim();
    const partes = resto.split("\n");
    const mensajeClaro = partes[0] ?? "";
    const detalleLinea = partes.find((p) => p.startsWith("Detalle:"))?.replace(/^Detalle:\s*/, "");
    const codigoLinea = partes.find((p) => p.startsWith("Código:"))?.replace(/^Código:\s*/, "");

    return {
      titulo: tituloPrevio,
      mensajeClaro,
      detalleTecnico: detalleLinea,
      codigo: codigoLinea,
      resumenPush: `${tituloPrevio}: ${mensajeClaro}`.slice(0, 150),
    };
  }

  const code = String(
    obj?.code ?? obj?.statusCode ?? obj?.status ?? ""
  ).trim();
  const rawMsg = String(
    obj?.message ?? obj?.msg ?? obj?.error_description ?? obj?.error ?? (obj ? "" : str)
  ).trim();
  const rawDetail = obj?.details ? String(obj.details).trim() : undefined;
  const rawHint = obj?.hint ? String(obj.hint).trim() : undefined;

  let titulo = "Error en el sistema";
  let mensajeClaro = rawMsg || str || "Ocurrió un error inesperado al procesar la solicitud.";
  let detalleTecnico = [rawMsg, rawDetail, rawHint].filter(Boolean).join(" · ") || str;

  // Postgres / Supabase / Servicios externos
  if (code === "23514") {
    titulo = "Validación de datos no cumplida (Check constraint)";
    if (detalleTecnico.includes("rutina_items_tecnica_check") || detalleTecnico.includes("tecnica")) {
      titulo = "Técnica de ejercicio no permitida";
      mensajeClaro = "Se intentó guardar una técnica de intensidad que no está registrada en la base de datos (rutina_items_tecnica_check).";
    } else {
      const match = detalleTecnico.match(/violates check constraint "([^"]+)"/i);
      const constr = match ? match[1] : "";
      mensajeClaro = constr
        ? `Un dato no cumple la condición requerida en '${constr}'.`
        : "Un campo tiene un valor fuera de lo permitido por la base de datos.";
    }
  } else if (code === "23505") {
    titulo = "Dato duplicado (Ya existe)";
    const match = detalleTecnico.match(/Key \(([^)]+)\)=\(([^)]+)\) already exists/i);
    if (match) {
      mensajeClaro = `Ya existe un registro con ${match[1]} = '${match[2]}'.`;
    } else {
      mensajeClaro = "Se intentó guardar un registro con un dato único repetido (ej. DNI, email o código ya utilizado).";
    }
  } else if (code === "23503") {
    titulo = "Referencia no encontrada (Clave foránea)";
    mensajeClaro = "Se intentó asociar con un registro (socio, rutina o gimnasio) que no existe o fue eliminado.";
  } else if (code === "23502") {
    titulo = "Campo obligatorio faltante";
    const match = detalleTecnico.match(/column "([^"]+)" of relation "([^"]+)"/i);
    mensajeClaro = match
      ? `El campo '${match[1]}' en la tabla '${match[2]}' es obligatorio y quedó vacío.`
      : "La base de datos rechazó la operación porque falta un dato obligatorio.";
  } else if (code === "42501") {
    titulo = "Permiso denegado por seguridad (RLS)";
    mensajeClaro = "Las políticas de seguridad de la base de datos no autorizaron esta operación.";
  } else if (code === "42P01") {
    titulo = "Tabla inexistente en la base de datos";
    mensajeClaro = "Se intentó consultar una tabla que no existe en Supabase (falta aplicar una migración).";
  } else if (code === "42703") {
    titulo = "Columna inexistente en la tabla";
    mensajeClaro = "Se intentó acceder a un campo inexistente (falta aplicar una migración).";
  } else if (code === "PGRST116") {
    titulo = "Registro no encontrado";
    mensajeClaro = "Se esperaba encontrar exactamente un registro pero no se encontró ninguno.";
  } else if (code === "PGRST301" || /jwt/i.test(detalleTecnico)) {
    titulo = "Sesión o token vencido";
    mensajeClaro = "La sesión expiró o el token de autenticación ya no es válido.";
  } else if (code === "410") {
    titulo = "Suscripción push caducada (410)";
    mensajeClaro = "El navegador del usuario eliminó o revocó el permiso de notificaciones push.";
  } else if (code === "404") {
    titulo = "Recurso no encontrado (404)";
    mensajeClaro = "El recurso solicitado no fue encontrado en el servidor.";
  } else if (/fetch failed|network|econnrefused|etimedout|timeout/i.test(detalleTecnico)) {
    titulo = "Problema de conexión o tiempo de espera";
    mensajeClaro = "No se pudo conectar o se agotó el tiempo de espera con un servicio externo.";
  } else if (/mercadopago|mp-connect|collector/i.test(detalleTecnico)) {
    titulo = "Error en Mercado Pago";
    mensajeClaro = "Hubo un inconveniente con la pasarela de Mercado Pago o las credenciales vinculadas.";
  }

  const resumenPush = `${titulo}: ${mensajeClaro}${code ? ` (cód ${code})` : ""}`.slice(0, 150);

  return {
    titulo,
    mensajeClaro,
    detalleTecnico: detalleTecnico !== mensajeClaro ? detalleTecnico : undefined,
    codigo: code || undefined,
    resumenPush,
  };
}

/**
 * Registra un error en `errores_app` para el semáforo de /admin y notifica al superadmin
 * con explicaciones claras en español comprensible.
 */
export async function registrarError(
  gimnasioId: string | null | undefined,
  origen: OrigenError,
  mensaje: unknown,
): Promise<void> {
  const info = humanizarError(mensaje);

  const lineasGuardar = [
    `[${info.titulo}] ${info.mensajeClaro}`,
    info.detalleTecnico ? `Detalle: ${info.detalleTecnico}` : null,
    info.codigo ? `Código: ${info.codigo}` : null,
  ].filter(Boolean);
  const textoParaGuardar = lineasGuardar.join("\n").slice(0, 2000);

  try {
    const admin = createAdminClient();
    await admin.from("errores_app").insert({
      gimnasio_id: gimnasioId ?? null,
      origen,
      mensaje: textoParaGuardar,
    });
  } catch (err) {
    console.error("[admin/errores]", err);
  }

  // Aviso estructurado y claro al superadmin
  const tituloOrigen = ORIGEN_LABEL[origen] ?? origen;
  const tituloAviso = `${tituloOrigen}: ${info.titulo}`;

  const lineasAviso = [
    `⚠️ ${info.mensajeClaro}`,
    info.codigo ? `Código de error: ${info.codigo}` : null,
    info.detalleTecnico ? `Detalle técnico: ${info.detalleTecnico}` : null,
    gimnasioId ? `Gimnasio ID: ${gimnasioId}` : "Sin gimnasio asignado",
  ].filter(Boolean);

  await notificarSuperadmin(
    tituloAviso,
    lineasAviso.join("\n\n"),
    origen === "push" ? { push: false, email: true } : { push: true, email: true },
  );
}
