/**
 * Lógica pura de decisión de acceso (torniquete / check-in).
 *
 * Un solo lugar donde se decide si un socio pasa o no, para que el kiosko
 * manual (`checkin/actions.ts`) y el futuro control de torniquete (Wi-Fi)
 * usen exactamente la misma regla. No toca Supabase ni hardware: recibe el
 * estado ya leído y devuelve una decisión + si corresponde registrar
 * asistencia.
 */

export type EstadoCuota = "al_dia" | "por_vencer" | "vencido";

export type AccesoInput = {
  /** false si no existe un perfil/cliente con ese DNI en el gimnasio. */
  socioEncontrado: boolean;
  /** true si el cliente está en período de prueba (sin cuota paga aún). */
  enPrueba: boolean;
  /** true si ya usó su ingreso de prueba y volvió a intentar entrar. */
  pruebaVencida: boolean;
  estadoCuota: EstadoCuota | null;
};

export type MotivoAcceso = "ok" | "cuota_vencida" | "prueba_vencida" | "no_encontrado";

export type AccesoResultado = {
  /** true = abrir el torniquete/entrada. false = bloquear. */
  habilitado: boolean;
  motivo: MotivoAcceso;
  /** Un acceso bloqueado nunca debe generar un registro de asistencia. */
  registrarAsistencia: boolean;
};

export function decidirAcceso(input: AccesoInput): AccesoResultado {
  if (!input.socioEncontrado) {
    return { habilitado: false, motivo: "no_encontrado", registrarAsistencia: false };
  }

  if (input.enPrueba && input.pruebaVencida) {
    return { habilitado: false, motivo: "prueba_vencida", registrarAsistencia: false };
  }

  if (!input.enPrueba && input.estadoCuota === "vencido") {
    return { habilitado: false, motivo: "cuota_vencida", registrarAsistencia: false };
  }

  return { habilitado: true, motivo: "ok", registrarAsistencia: true };
}
