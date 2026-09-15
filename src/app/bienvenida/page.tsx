import { redirect } from "next/navigation";
import { getSessionProfile, claveInicial } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BienvenidaClient } from "./bienvenida-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BienvenidaPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");

  const destino = profile.rol === "cliente" ? "/mi" : "/panel";
  if (!profile.debe_cambiar_clave) redirect(destino);

  const supabase = await createClient();
  const { data: gym } = await supabase
    .from("gimnasios")
    .select("slug, nombre")
    .eq("id", profile.gimnasio_id)
    .single();

  return (
    <BienvenidaClient
      nombreDueno={profile.nombre}
      nombreGym={gym?.nombre ?? ""}
      slug={gym?.slug ?? ""}
      dni={profile.dni}
      claveDefault={claveInicial(profile.dni)}
      destino={destino}
    />
  );
}
