import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";

export default async function Home() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (profile.debe_cambiar_clave) redirect("/cambiar-clave");
  redirect(profile.rol === "dueno" ? "/panel" : "/mi");
}
