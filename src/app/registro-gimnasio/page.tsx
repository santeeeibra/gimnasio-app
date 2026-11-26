import { redirect } from "next/navigation";

// El alta vive en la pestaña "Crear cuenta" del login (registro-form.tsx).
// Esta ruta queda para que los enlaces viejos (landing, partners, referidos
// con ?ref=) sigan funcionando. La acción registrarGimnasio de esta carpeta
// la sigue usando login/registro-actions.ts para el alta de dueño.
export default async function RegistroGimnasioPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; codigo?: string; tipo?: string }>;
}) {
  const params = await searchParams;
  const destino = new URLSearchParams();
  destino.set("registro", params.tipo === "solo" ? "individual" : "dueno");
  const ref = (params.ref ?? params.codigo ?? "").trim();
  if (ref) destino.set("ref", ref);
  redirect(`/login?${destino.toString()}`);
}
