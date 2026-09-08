import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarPush } from "@/lib/push/enviar";
import { diasRestantes } from "@/lib/cuota";
import { notificarSuperadmin } from "@/lib/admin/notificar";

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

  try {
    return await correrCron();
  } catch (err) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    await notificarSuperadmin("Falló el cron de cuotas", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function correrCron() {
  const admin = createAdminClient();

  const { data: clientes, error } = await admin
    .from("clientes")
    .select(
      "id, profile_id, gimnasio_id, fecha_vencimiento, ultimo_aviso_morosidad_enviado_en",
    )
    .not("fecha_vencimiento", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Row = {
    id: string;
    profile_id: string;
    gimnasio_id: string;
    fecha_vencimiento: string;
    ultimo_aviso_morosidad_enviado_en: string | null;
  };

  const hoyISO = new Date().toISOString().slice(0, 10);

  // ─── Aviso de morosidad: push al socio N días antes (N por gimnasio) ───
  const { data: gyms } = await admin
    .from("gimnasios")
    .select("id, dias_aviso_morosidad");
  const diasAvisoPorGym = new Map<string, number>();
  for (const g of (gyms ?? []) as { id: string; dias_aviso_morosidad: number }[]) {
    diasAvisoPorGym.set(g.id, g.dias_aviso_morosidad ?? 5);
  }

  let avisosMorosidad = 0;
  for (const c of (clientes ?? []) as Row[]) {
    const dias = diasRestantes(c.fecha_vencimiento);
    const umbral = diasAvisoPorGym.get(c.gimnasio_id) ?? 5;
    if (dias !== umbral) continue;
    if (c.ultimo_aviso_morosidad_enviado_en === hoyISO) continue;

    await enviarPush([c.profile_id], {
      title: "Cuota por vencer",
      body: `Tu cuota vence en ${dias} días. Recordá renovarla para seguir entrenando.`,
      url: "/mi",
      tag: `morosidad-${c.fecha_vencimiento}`,
    });
    await admin
      .from("clientes")
      .update({ ultimo_aviso_morosidad_enviado_en: hoyISO })
      .eq("id", c.id);
    avisosMorosidad++;
  }

  // ─── Aviso preventivo fijo: 3 días antes (solo socio, texto propio) ───
  let avisos3d = 0;
  for (const c of (clientes ?? []) as Row[]) {
    if (diasRestantes(c.fecha_vencimiento) !== 3) continue;
    // Si el gimnasio ya tiene el aviso de morosidad configurado en 3 días,
    // ese bloque ya cubrió al socio: no duplicar.
    if ((diasAvisoPorGym.get(c.gimnasio_id) ?? 5) === 3) continue;

    await enviarPush([c.profile_id], {
      title: "Cuota por vencer",
      body: "Tu cuota vence en 3 días. Podés renovar desde tu panel o en recepción para no cortar tu racha 💳",
      url: "/mi",
      tag: `cuota-3d-${c.fecha_vencimiento}`,
    });
    avisos3d++;
  }

  // ─── Trials vencidos (gimnasios en prueba > 14 días desde creado_at) y
  //     planes de plataforma vencidos (gimnasios activos). Se corre siempre,
  //     no solo cuando hay cuotas de socios por vencer. ───
  await admin.rpc("chequear_trial_vencido");
  await admin.rpc("chequear_plan_vencido");

  const afectados = (clientes ?? []).filter((c: Row) =>
    DIAS_AVISO.has(diasRestantes(c.fecha_vencimiento) ?? -999),
  );

  if (afectados.length === 0) {
    return NextResponse.json({ ok: true, avisos: 0, avisosMorosidad, avisos3d });
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

  // ─── Purga de buzón: borrar comentarios resueltos con más de 60 días ────────
  // Caso A: resueltos con respuesta → filtrar por respondido_at
  // Caso B: resueltos sin respuesta (marcados a mano) → filtrar por creado_at
  const hace60Dias = new Date();
  hace60Dias.setDate(hace60Dias.getDate() - 60);
  const hace60ISO = hace60Dias.toISOString();

  await Promise.all([
    admin
      .from("buzon_comentarios")
      .delete()
      .eq("estado", "resuelto")
      .not("respondido_at", "is", null)
      .lt("respondido_at", hace60ISO),
    admin
      .from("buzon_comentarios")
      .delete()
      .eq("estado", "resuelto")
      .is("respondido_at", null)
      .lt("creado_at", hace60ISO),
  ]);

  return NextResponse.json({ ok: true, avisos, avisosMorosidad, avisos3d });
}
