import { impersonacionActiva } from "@/lib/impersonation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ControlesFlotantes } from "./controles-flotantes";

// Franja fija arriba (solo texto) mientras el superadmin ve la app como otra
// persona. Los controles (switch Dueño/Socio + volver a soporte) viven en un
// panel flotante aparte (ver ImpersonationControls), para no ocupar la barra
// superior y poder ocultarse al grabar un video.
export async function ImpersonationBanner() {
  const imp = await impersonacionActiva();
  if (!imp) return null;

  return (
    <div className="sticky top-0 z-50 truncate bg-ink px-4 pb-2 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] text-[13px] text-paper">
      Viendo como <strong>{imp.nombre}</strong>{" "}
      {imp.rol === "dueno" ? "(dueño)" : "(socio)"} · {imp.gym}
    </div>
  );
}

export async function ImpersonationControls() {
  const imp = await impersonacionActiva();
  if (!imp) return null;

  let duenoId: string | null = null;
  let socioId: string | null = null;
  if (imp.gymSlug === "sante") {
    const db = createAdminClient();
    const { data: gym } = await db
      .from("gimnasios")
      .select("id")
      .eq("slug", "sante")
      .maybeSingle();
    if (gym) {
      const { data: perfiles } = await db
        .from("profiles")
        .select("id, rol")
        .eq("gimnasio_id", gym.id)
        .in("rol", ["dueno", "cliente"]);
      duenoId = perfiles?.find((p) => p.rol === "dueno")?.id ?? null;
      socioId = perfiles?.find((p) => p.rol === "cliente")?.id ?? null;
    }
  }

  return <ControlesFlotantes imp={imp} duenoId={duenoId} socioId={socioId} />;
}
