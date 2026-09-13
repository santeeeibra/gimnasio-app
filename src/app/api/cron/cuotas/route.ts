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

  // Los push idénticos (mismo texto y mismo tag) se agrupan en un solo
  // enviarPush con todos los profile_id: una consulta de suscripciones por
  // grupo en vez de una por socio. Los UPDATE se acumulan y salen en batch.
  const agrupar = <T,>(filas: T[], clave: (f: T) => string) => {
    const m = new Map<string, T[]>();
    for (const f of filas) {
      const k = clave(f);
      const arr = m.get(k);
      if (arr) arr.push(f);
      else m.set(k, [f]);
    }
    return m;
  };

  let avisosMorosidad = 0;
  const morosos = ((clientes ?? []) as Row[]).filter((c) => {
    const umbral = diasAvisoPorGym.get(c.gimnasio_id) ?? 5;
    return (
      diasRestantes(c.fecha_vencimiento) === umbral &&
      c.ultimo_aviso_morosidad_enviado_en !== hoyISO
    );
  });

  if (morosos.length > 0) {
    const porGrupo = agrupar(
      morosos,
      (c) => `${diasAvisoPorGym.get(c.gimnasio_id) ?? 5}|${c.fecha_vencimiento}`,
    );
    await Promise.all(
      [...porGrupo.values()].map((grupo) => {
        const dias = diasRestantes(grupo[0].fecha_vencimiento);
        return enviarPush(
          grupo.map((c) => c.profile_id),
          {
            title: "Cuota por vencer",
            body: `Tu cuota vence en ${dias} días. Recordá renovarla para seguir entrenando.`,
            url: "/mi",
            tag: `morosidad-${grupo[0].fecha_vencimiento}`,
          },
        );
      }),
    );

    const idsMorosos = morosos.map((c) => c.id);
    const { data: marcados, error: errMoros } = await admin
      .from("clientes")
      .update({ ultimo_aviso_morosidad_enviado_en: hoyISO })
      .in("id", idsMorosos)
      .select("id");
    if (errMoros) {
      throw new Error(
        `no se pudo marcar el aviso de morosidad: ${errMoros.message}`,
      );
    }
    avisosMorosidad = marcados?.length ?? 0;
    if (avisosMorosidad !== idsMorosos.length) {
      console.warn(
        `[cron cuotas] morosidad: se avisó a ${idsMorosos.length} socios pero se marcaron ${avisosMorosidad}`,
      );
    }
  }

  // ─── Aviso preventivo fijo: 3 días antes (solo socio, texto propio) ───
  // Si el gimnasio ya tiene el aviso de morosidad configurado en 3 días, ese
  // bloque ya cubrió al socio: no duplicar.
  const preventivos = ((clientes ?? []) as Row[]).filter(
    (c) =>
      diasRestantes(c.fecha_vencimiento) === 3 &&
      (diasAvisoPorGym.get(c.gimnasio_id) ?? 5) !== 3,
  );
  const avisos3d = preventivos.length;
  if (avisos3d > 0) {
    const porVencimiento = agrupar(preventivos, (c) => c.fecha_vencimiento);
    await Promise.all(
      [...porVencimiento.entries()].map(([vence, grupo]) =>
        enviarPush(
          grupo.map((c) => c.profile_id),
          {
            title: "Cuota por vencer",
            body: "Tu cuota vence en 3 días. Podés renovar desde tu panel o en recepción para no cortar tu racha 💳",
            url: "/mi",
            tag: `cuota-3d-${vence}`,
          },
        ),
      ),
    );
  }

  // ─── Alerta de abandono: socio con cuota al día que dejó de entrenar ───
  //     (sin registro_progreso ni registros_entrada hace > 10 días).
  //     Un push por gimnasio a sus dueños. Dedupe: no reavisar en < 7 días.
  const hace10 = new Date();
  hace10.setDate(hace10.getDate() - 10);
  const hace10ISO = hace10.toISOString().slice(0, 10);
  const hace7 = new Date();
  hace7.setDate(hace7.getDate() - 7);
  const hace7ISO = hace7.toISOString().slice(0, 10);
  const hace60d = new Date();
  hace60d.setDate(hace60d.getDate() - 60);
  const hace60dISO = hace60d.toISOString().slice(0, 10);

  let avisosAbandono = 0;
  try {
    const [{ data: progr }, { data: entr }, { data: clientesAbandono }] =
      await Promise.all([
        admin
          .from("registro_progreso")
          .select("cliente_id, fecha")
          .gte("fecha", hace60dISO),
        admin
          .from("registros_entrada")
          .select("cliente_id, creado_en")
          .gte("creado_en", `${hace60dISO}T00:00:00.000Z`),
        admin
          .from("clientes")
          .select(
            "id, gimnasio_id, fecha_vencimiento, ultimo_aviso_abandono_enviado_en",
          )
          .not("fecha_vencimiento", "is", null),
      ]);

    const ultimaActividad = new Map<string, string>();
    const guardar = (cid: string, fecha: string) => {
      const prev = ultimaActividad.get(cid);
      if (!prev || fecha > prev) ultimaActividad.set(cid, fecha);
    };
    for (const r of (progr ?? []) as { cliente_id: string; fecha: string }[]) {
      guardar(r.cliente_id, r.fecha);
    }
    for (const r of (entr ?? []) as { cliente_id: string; creado_en: string }[]) {
      guardar(r.cliente_id, r.creado_en.slice(0, 10));
    }

    type RowAb = {
      id: string;
      gimnasio_id: string;
      fecha_vencimiento: string;
      ultimo_aviso_abandono_enviado_en: string | null;
    };
    const inactivosPorGym = new Map<string, string[]>();
    for (const c of (clientesAbandono ?? []) as RowAb[]) {
      const dias = diasRestantes(c.fecha_vencimiento);
      if (dias === null || dias < 0) continue; // solo cuota al día
      const ultima = ultimaActividad.get(c.id);
      if (!ultima) continue; // nunca entrenó o churn total (> 60 días): no es "abandono" fresco
      if (ultima >= hace10ISO) continue; // entrenó hace poco
      if (
        c.ultimo_aviso_abandono_enviado_en &&
        c.ultimo_aviso_abandono_enviado_en >= hace7ISO
      ) {
        continue; // ya avisamos esta semana
      }
      const arr = inactivosPorGym.get(c.gimnasio_id) ?? [];
      arr.push(c.id);
      inactivosPorGym.set(c.gimnasio_id, arr);
    }

    if (inactivosPorGym.size > 0) {
      const gymsAbandono = [...inactivosPorGym.keys()];
      const { data: duenosAb } = await admin
        .from("profiles")
        .select("id, gimnasio_id")
        .eq("rol", "dueno")
        .in("gimnasio_id", gymsAbandono);
      const duenosAbPorGym = new Map<string, string[]>();
      for (const d of (duenosAb ?? []) as {
        id: string;
        gimnasio_id: string;
      }[]) {
        const arr = duenosAbPorGym.get(d.gimnasio_id) ?? [];
        arr.push(d.id);
        duenosAbPorGym.set(d.gimnasio_id, arr);
      }

      // Un push por gimnasio (el texto depende del conteo), todos en paralelo,
      // y un único UPDATE con los ids de todos los gimnasios.
      await Promise.all(
        [...inactivosPorGym.entries()].map(([gid, ids]) => {
          const dueniosGym = duenosAbPorGym.get(gid) ?? [];
          if (!dueniosGym.length) return Promise.resolve();
          const n = ids.length;
          return enviarPush(dueniosGym, {
            title: "Socios en riesgo de abandono",
            body:
              n === 1
                ? "1 socio con la cuota al día lleva +10 días sin entrenar. Un mensaje ahora ayuda a que renueve."
                : `${n} socios con la cuota al día llevan +10 días sin entrenar. Un mensaje ahora ayuda a que renueven.`,
            url: "/panel/clientes",
            tag: `abandono-${gid}-${hoyISO}`,
          });
        }),
      );

      const idsInactivos = [...inactivosPorGym.values()].flat();
      const { data: marcadosAb, error: errAb } = await admin
        .from("clientes")
        .update({ ultimo_aviso_abandono_enviado_en: hoyISO })
        .in("id", idsInactivos)
        .select("id");
      if (errAb) {
        throw new Error(
          `no se pudo marcar el aviso de abandono: ${errAb.message}`,
        );
      }
      avisosAbandono = marcadosAb?.length ?? 0;
    }
  } catch (err) {
    // Pre-migración 0042 (columna ausente) o cualquier fallo: no romper el cron.
    console.error("alerta de abandono falló:", err);
  }

  // ─── Trials vencidos (gimnasios en prueba > 14 días desde creado_at) y
  //     planes de plataforma vencidos (gimnasios activos). Se corre siempre,
  //     no solo cuando hay cuotas de socios por vencer. ───
  await admin.rpc("recalcular_estado_cuota");
  await admin.rpc("chequear_trial_vencido");
  await admin.rpc("chequear_plan_vencido");
  // Libera comisiones de partners cuyo hold anti-fraude de 10 días ya venció
  // (PLAN_PARTNERS_Y_GATING.md §5.B). Best-effort: no debe romper el cron.
  try {
    await admin.rpc("partner_liberar_comisiones_vencidas");
  } catch {
    // best-effort
  }

  const afectados = (clientes ?? []).filter((c: Row) =>
    DIAS_AVISO.has(diasRestantes(c.fecha_vencimiento) ?? -999),
  );

  if (afectados.length === 0) {
    return NextResponse.json({
      ok: true,
      avisos: 0,
      avisosMorosidad,
      avisos3d,
      avisosAbandono,
    });
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

  const avisos = afectados.length;

  // Push al socio: agrupado por (días restantes, vencimiento) — texto y tag
  // idénticos dentro de cada grupo.
  const porAviso = agrupar(
    afectados as Row[],
    (c) => `${diasRestantes(c.fecha_vencimiento) ?? 0}|${c.fecha_vencimiento}`,
  );
  await Promise.all(
    [...porAviso.values()].map((grupo) => {
      const dias = diasRestantes(grupo[0].fecha_vencimiento) ?? 0;
      return enviarPush(
        grupo.map((c) => c.profile_id),
        {
          title: "Cuota por vencer",
          body:
            dias === 1
              ? "Tu cuota vence mañana."
              : `Tu cuota vence en ${dias} días.`,
          url: "/mi",
          tag: `cuota-${grupo[0].fecha_vencimiento}`,
        },
      );
    }),
  );

  // Push al dueño: el tag lleva el profile_id del socio, así que sigue siendo
  // una notificación por cliente (decisión de producto), pero en paralelo.
  await Promise.all(
    (afectados as Row[]).map((c) => {
      const dueniosGym = duenosPorGym.get(c.gimnasio_id) ?? [];
      if (!dueniosGym.length) return Promise.resolve();
      const dias = diasRestantes(c.fecha_vencimiento) ?? 0;
      return enviarPush(dueniosGym, {
        title: "Cuota de cliente por vencer",
        body:
          dias === 1
            ? "Un cliente tiene la cuota venciendo mañana."
            : `Un cliente tiene la cuota venciendo en ${dias} días.`,
        url: "/panel/clientes",
        tag: `cuota-cli-${c.profile_id}-${c.fecha_vencimiento}`,
      });
    }),
  );

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

  return NextResponse.json({
    ok: true,
    avisos,
    avisosMorosidad,
    avisos3d,
    avisosAbandono,
  });
}
