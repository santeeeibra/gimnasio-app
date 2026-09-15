import { NextResponse } from "next/server";
import { requireStaffODueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Padrón liviano del gimnasio para que el check-in pueda decidir localmente
 * sin red (ver src/lib/offline/padron.ts). Se refresca en el navegador cada
 * vez que hay conexión.
 */
export async function GET() {
  try {
    const dueno = await requireStaffODueno();
    const supabase = await createClient();

    const { data: clientes, error } = await supabase
      .from("clientes")
      .select(
        `
        id,
        estado_cuota,
        fecha_vencimiento,
        en_prueba,
        prueba_iniciada_en,
        plan_id,
        profile:profiles!inner(id, nombre, dni),
        plan:planes(duracion_dias)
      `,
      )
      .eq("gimnasio_id", dueno.gimnasio_id);

    if (error) {
      console.error("Error al cargar padrón de check-in:", error);
      return NextResponse.json({ error: "Error al cargar padrón" }, { status: 500 });
    }

    const socios = (clientes || []).map((c: any) => ({
      cliente_id: c.id,
      profile_id: c.profile?.id,
      dni: c.profile?.dni ?? "",
      nombre: c.profile?.nombre ?? "Socio",
      estado_cuota: c.estado_cuota,
      fecha_vencimiento: c.fecha_vencimiento,
      en_prueba: c.en_prueba,
      prueba_iniciada_en: c.prueba_iniciada_en,
      plan_id: c.plan_id,
      plan_duracion_dias: c.plan?.duracion_dias ?? null,
    }));

    return NextResponse.json({ socios });
  } catch (error) {
    console.error("Error en /api/panel/checkin-padron:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
