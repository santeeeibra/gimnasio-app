import { obtenerProgresoCliente, obtenerProgresoSocio } from "@/lib/progreso/actions";

/** Lectura independiente de la cola de Server Actions de los diales. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const ejercicioId = params.get("ejercicio");
  const clienteId = params.get("cliente");
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!ejercicioId || !uuid.test(ejercicioId) || (clienteId && !uuid.test(clienteId))) {
    return Response.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  // Las lecturas existentes validan sesión/rol y mantienen RLS.
  const registros = clienteId
    ? await obtenerProgresoSocio(clienteId, ejercicioId)
    : await obtenerProgresoCliente(ejercicioId);
  return Response.json(registros, { headers: { "Cache-Control": "private, no-store" } });
}
