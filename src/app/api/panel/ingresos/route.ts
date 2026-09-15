import { NextResponse } from "next/server";
import { requireDueno } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const dueno = await requireDueno();
    const supabase = await createClient();

    const [{ data: pagos, error }, { data: pendientes }] = await Promise.all([
      supabase
        .from("pagos")
        .select(
          `
          id,
          monto,
          fecha_pago,
          comprobante_ref,
          medio_pago,
          cliente:clientes!inner(
            gimnasio_id,
            profile:profiles(nombre)
          ),
          plan:planes(nombre)
        `
        )
        .eq("cliente.gimnasio_id", dueno.gimnasio_id)
        .order("fecha_pago", { ascending: false }),
      // Cobranza pendiente: socios morosos o por vencer, con el precio de su plan.
      supabase
        .from("clientes")
        .select("id, estado_cuota, plan:planes(precio)")
        .eq("gimnasio_id", dueno.gimnasio_id)
        .in("estado_cuota", ["por_vencer", "vencido"]),
    ]);

    if (error) {
      console.error("Error al cargar pagos:", error);
      return NextResponse.json({ error: "Error al cargar pagos" }, { status: 500 });
    }

    // Mapear los pagos para simplificar la estructura
    const pagosMapeados = (pagos || []).map((p: any) => ({
      id: p.id,
      fecha_pago: p.fecha_pago,
      monto: p.monto,
      comprobante_ref: p.comprobante_ref ?? null,
      medio_pago: p.medio_pago || "efectivo",
      cliente_nombre: p.cliente?.profile?.nombre || "Cliente desconocido",
      plan_nombre: p.plan?.nombre || "Sin plan",
    }));

    const pendientesResumen = (pendientes || []).reduce(
      (acc: { monto: number; cantidad: number }, c: any) => {
        acc.monto += Number(c.plan?.precio) || 0;
        acc.cantidad += 1;
        return acc;
      },
      { monto: 0, cantidad: 0 },
    );

    return NextResponse.json({ pagos: pagosMapeados, pendientes: pendientesResumen });
  } catch (error) {
    console.error("Error en /api/panel/ingresos:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
