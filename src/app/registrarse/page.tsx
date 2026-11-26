import { redirect } from "next/navigation";

// El alta vive en la pestaña "Crear cuenta" del login (registro-form.tsx).
// Esta ruta queda para que los enlaces viejos sigan funcionando.
export default async function RegistrarsePage() {
  redirect("/login?registro=individual");
}
