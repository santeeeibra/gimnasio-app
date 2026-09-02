import { NextResponse } from "next/server";
import { requireDueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const dueno = await requireDueno();
    const supabase = await createClient();

    const { data: pagos, error } = await supabase
      .from("pagos")
      .select(
        `
        id,
        monto,
        fecha_pago,
        cliente:clientes!inner(
          gimnasio_id,
          profile:profiles(nombre)
        ),
        plan:planes(nombre)
      `
      )
      .eq("cliente.gimnasio_id", dueno.gimnasio_id)
      .order("fecha_pago", { ascending: false });

    if (error) {
      console.error("Error al cargar pagos:", error);
      return NextResponse.json({ error: "Error al cargar pagos" }, { status: 500 });
    }

    // Mapear los pagos para simplificar la estructura
    const pagosMapeados = (pagos || []).map((p: any) => ({
      id: p.id,
      fecha_pago: p.fecha_pago,
      monto: p.monto,
      cliente_nombre: p.cliente?.profile?.nombre || "Cliente desconocido",
      plan_nombre: p.plan?.nombre || "Sin plan",
    }));

    return NextResponse.json({ pagos: pagosMapeados });
  } catch (error) {
    console.error("Error en /api/panel/ingresos:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
