"use server";

import { requireDueno } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { cupoSocios } from "@/lib/plataforma/cupo";
import {
  importarSociosCore,
  type SocioImportarItem,
  type ResultadoImportarItem,
} from "@/app/admin/gimnasios/[id]/importar-socios/actions";

// Versión para el propio dueño (self-service, sin pasar por soporte). Mismo
// núcleo que el importador de /admin, pero:
// - gimnasioId siempre es el del dueño logueado (el primer parámetro se
//   ignora a propósito — nunca se confía en un id que venga del cliente —
//   se mantiene solo para calzar con la firma que espera <ImportadorSocios>).
// - respeta el cupo de su plan: si la tanda excede el cupo disponible, el
//   resto se marca como fallido en vez de crearlos igual.
export async function importarTandaSociosDuenoAction(
  _gimnasioIdIgnorado: string,
  socios: SocioImportarItem[],
): Promise<ResultadoImportarItem[]> {
  const dueno = await requireDueno();
  const admin = createAdminClient();

  const cupo = await cupoSocios(admin, dueno.gimnasio_id);
  const disponibles = cupo.max == null ? socios.length : Math.max(0, cupo.max - cupo.usados);

  const admitidos = socios.slice(0, disponibles);
  const excedidos = socios.slice(disponibles);

  const resultados = admitidos.length
    ? await importarSociosCore(dueno.gimnasio_id, admitidos)
    : [];

  const resultadosExcedidos: ResultadoImportarItem[] = excedidos.map((s) => ({
    dni: s.dni,
    nombre: s.nombre,
    ok: false,
    error: `Límite de socios de tu plan alcanzado${cupo.plan ? ` (${cupo.plan}: ${cupo.max})` : ""}.`,
  }));

  return [...resultados, ...resultadosExcedidos];
}
