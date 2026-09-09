import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import LandingPage from "./landing-page";

export default async function Home() {
  const profile = await getSessionProfile();
  if (!profile) return <LandingPage />;
  if (profile.debe_cambiar_clave) redirect("/cambiar-clave");
  redirect(profile.rol === "dueno" ? "/panel" : "/mi");
}

