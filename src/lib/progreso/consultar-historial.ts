import type { RegistroProgreso } from "./actions";

export async function consultarHistorial(
  ejercicioId: string,
  clienteId?: string,
): Promise<RegistroProgreso[]> {
  const params = new URLSearchParams({ ejercicio: ejercicioId });
  if (clienteId) params.set("cliente", clienteId);
  const response = await fetch(`/api/rutina/progreso?${params}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
    throw new Error("No se pudo cargar el progreso.");
  }
  return response.json();
}
