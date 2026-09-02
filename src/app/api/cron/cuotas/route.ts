import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarPush } from "@/lib/push/enviar";
import { diasRestantes } from "@/lib/cuota";

// Cron diario (Vercel Cron -> vercel.json). Avisa a cliente y dueño cuando
// faltan 6 o 1 días para el vencimiento de la cuota. Dos toques, sin spam.

export const dynamic = "force-dynamic";

const DIAS_AVISO = new Set([6, 1]);

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: clientes, error } = await admin
    .from("clientes")
    .select("profile_id, gimnasio_id, fecha_vencimiento")
    .not("fecha_vencimiento", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Row = {
    profile_id: string;
    gimnasio_id: string;
    fecha_vencimiento: string;
  };

  const afectados = (clientes ?? []).filter((c: Row) =>
    DIAS_AVISO.has(diasRestantes(c.fecha_vencimiento) ?? -999),
  );

  if (afectados.length === 0) {
    return NextResponse.json({ ok: true, avisos: 0 });
  }

  // Dueños por gimnasio (una sola consulta).
  const gymIds = [...new Set(afectados.map((c: Row) => c.gimnasio_id))];
  const { data: duenos } = await admin
    .from("profiles")
    .select("id, gimnasio_id")
    .eq("rol", "dueno")
    .in("gimnasio_id", gymIds);

  const duenosPorGym = new Map<string, string[]>();
  for (const d of (duenos ?? []) as { id: string; gimnasio_id: string }[]) {
    const arr = duenosPorGym.get(d.gimnasio_id) ?? [];
    arr.push(d.id);
    duenosPorGym.set(d.gimnasio_id, arr);
  }

  let avisos = 0;
  for (const c of afectados as Row[]) {
    const dias = diasRestantes(c.fecha_vencimiento) ?? 0;
    const texto =
      dias === 1 ? "Tu cuota vence mañana." : `Tu cuota vence en ${dias} días.`;

    await enviarPush([c.profile_id], {
      title: "Cuota por vencer",
      body: texto,
      url: "/mi",
      tag: `cuota-${c.fecha_vencimiento}`,
    });

    const dueniosGym = duenosPorGym.get(c.gimnasio_id) ?? [];
    if (dueniosGym.length) {
      await enviarPush(dueniosGym, {
        title: "Cuota de cliente por vencer",
        body:
          dias === 1
            ? "Un cliente tiene la cuota venciendo mañana."
            : `Un cliente tiene la cuota venciendo en ${dias} días.`,
        url: "/panel/clientes",
        tag: `cuota-cli-${c.profile_id}-${c.fecha_vencimiento}`,
      });
    }
    avisos++;
  }

  return NextResponse.json({ ok: true, avisos });
}
