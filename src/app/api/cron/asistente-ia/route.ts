import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notificarSuperadmin } from "@/lib/admin/notificar";
import {
  verificarGateAsistenteIa,
  procesarEnvioAvisoIa,
} from "@/lib/n8n/asistente-ia";
import { diasRestantes } from "@/lib/cuota";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function fechaArgentina(): { hoyISO: string; hoyMMDD: string; diaDelMes: number } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const hoyISO = formatter.format(new Date());
  const hoyMMDD = hoyISO.slice(5, 10);
  const diaDelMes = Number(hoyISO.slice(8, 10));
  return { hoyISO, hoyMMDD, diaDelMes };
}

function validarAutorizacion(req: NextRequest): boolean {
  const secretN8n = process.env.N8N_SYSGYM_SECRET;
  const cronSecret = process.env.CRON_SECRET;

  const headerSecret = req.headers.get("x-n8n-secret");
  const authHeader = req.headers.get("authorization");
  const querySecret = req.nextUrl.searchParams.get("secret");

  if (secretN8n && (headerSecret === secretN8n || querySecret === secretN8n)) {
    return true;
  }
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }
  return false;
}

export async function GET(req: NextRequest) {
  return ejecutarAsistenteIa(req);
}

export async function POST(req: NextRequest) {
  return ejecutarAsistenteIa(req);
}

async function ejecutarAsistenteIa(req: NextRequest) {
  if (!validarAutorizacion(req)) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { hoyISO, hoyMMDD, diaDelMes } = fechaArgentina();

  const resultados = {
    cumpleanosEnviados: 0,
    abandonoEnviados: 0,
    resumenesEnviados: 0,
    errores: [] as string[],
  };

  try {
    const { data: gyms, error: gymError } = await admin
      .from("gimnasios")
      .select("id, nombre, asistente_ia_activo")
      .eq("asistente_ia_activo", true);

    if (gymError) throw gymError;
    if (!gyms || gyms.length === 0) {
      return NextResponse.json({
        ok: true,
        mensaje: "No hay gimnasios con asistente IA activado",
        resultados,
      });
    }

    const hace14d = new Date();
    hace14d.setDate(hace14d.getDate() - 14);
    const hace14dISO = hace14d.toISOString().slice(0, 10);

    const hace7d = new Date();
    hace7d.setDate(hace7d.getDate() - 7);
    const hace7dISO = hace7d.toISOString().slice(0, 10);

    const hace45d = new Date();
    hace45d.setDate(hace45d.getDate() - 45);
    const hace45dISO = hace45d.toISOString().slice(0, 10);

    const gymIds = gyms.map((g) => g.id);
    const hace30d = new Date();
    hace30d.setDate(hace30d.getDate() - 30);
    const hace30dISO = hace30d.toISOString().slice(0, 10);

    // Pre-carga global. Antes estas consultas vivían DENTRO del loop por
    // gimnasio, y las de actividad no filtraban por gimnasio: se escaneaban
    // 45 días de toda la plataforma una vez por gym (y el resumen mensual
    // contaba los check-ins de todos los gimnasios como propios). Ahora son
    // tres consultas y el loop no toca la base.
    const [
      { data: clientesTodos },
      { data: entradasTodas },
      { data: progresosTodos },
    ] = await Promise.all([
      admin
        .from("clientes")
        .select(
          "id, gimnasio_id, fecha_nacimiento, fecha_vencimiento, profile:profiles(nombre)",
        )
        .in("gimnasio_id", gymIds),
      admin
        .from("registros_entrada")
        .select("cliente_id, creado_en")
        .gte("creado_en", `${hace45dISO}T00:00:00.000Z`),
      admin
        .from("registro_progreso")
        .select("cliente_id, fecha")
        .gte("fecha", hace45dISO),
    ]);

    type ClienteRow = {
      id: string;
      gimnasio_id: string;
      fecha_nacimiento: string | null;
      fecha_vencimiento: string | null;
      profile: { nombre?: string } | { nombre?: string }[] | null;
    };

    const primerNombre = (c: ClienteRow, fallback: string) => {
      const prof = Array.isArray(c.profile) ? c.profile[0] : c.profile;
      return prof?.nombre?.split(" ")[0] ?? fallback;
    };

    const clientesPorGym = new Map<string, ClienteRow[]>();
    const gymDeCliente = new Map<string, string>();
    for (const c of (clientesTodos ?? []) as ClienteRow[]) {
      gymDeCliente.set(c.id, c.gimnasio_id);
      const arr = clientesPorGym.get(c.gimnasio_id);
      if (arr) arr.push(c);
      else clientesPorGym.set(c.gimnasio_id, [c]);
    }

    // Última actividad por socio (entradas + progreso) y check-ins de los
    // últimos 30 días por gimnasio, resueltos de una sola pasada.
    const ultimaActividad = new Map<string, string>();
    const checkinsPorGym = new Map<string, number>();
    const guardarActividad = (cid: string, f: string) => {
      const prev = ultimaActividad.get(cid);
      if (!prev || f > prev) ultimaActividad.set(cid, f);
    };
    for (const e of (entradasTodas ?? []) as {
      cliente_id: string;
      creado_en: string;
    }[]) {
      const fecha = e.creado_en.slice(0, 10);
      guardarActividad(e.cliente_id, fecha);
      const gid = gymDeCliente.get(e.cliente_id);
      if (gid && fecha >= hace30dISO) {
        checkinsPorGym.set(gid, (checkinsPorGym.get(gid) ?? 0) + 1);
      }
    }
    for (const pr of (progresosTodos ?? []) as {
      cliente_id: string;
      fecha: string;
    }[]) {
      guardarActividad(pr.cliente_id, pr.fecha);
    }

    for (const gym of gyms) {
      const gate = await verificarGateAsistenteIa(admin, gym.id);
      if (!gate.ok) continue;

      const clientesGym = clientesPorGym.get(gym.id) ?? [];

      // 1. Cumpleaños del día
      try {
        for (const c of clientesGym) {
          if (c.fecha_nacimiento?.slice(5, 10) !== hoyMMDD) continue;

          const res = await procesarEnvioAvisoIa(
            admin,
            gym.id,
            c.id,
            "cumpleanos",
            {
              nombre: primerNombre(c, "Campeón"),
              nombre_gimnasio: gym.nombre,
            },
          );
          if (res.ok) {
            resultados.cumpleanosEnviados++;
          }
        }
      } catch (err) {
        resultados.errores.push(
          `Error cumpleaños gym ${gym.nombre}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      // 2. Riesgo de abandono (cuota al día, sin actividad entre 7 y 14 días)
      try {
        for (const c of clientesGym) {
          if (!c.fecha_vencimiento) continue;
          const dias = diasRestantes(c.fecha_vencimiento);
          if (dias === null || dias < 0) continue;

          const ultima = ultimaActividad.get(c.id);
          if (!ultima) continue;
          if (ultima >= hace7dISO) continue;
          if (ultima < hace14dISO) continue;

          const diasInactivo = Math.max(
            7,
            Math.round(
              (new Date(hoyISO).getTime() - new Date(ultima).getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          );

          const res = await procesarEnvioAvisoIa(
            admin,
            gym.id,
            c.id,
            "riesgo_abandono",
            {
              nombre: primerNombre(c, "socio"),
              dias_sin_asistir: diasInactivo,
              nombre_gimnasio: gym.nombre,
            },
          );
          if (res.ok) {
            resultados.abandonoEnviados++;
          }
        }
      } catch (err) {
        resultados.errores.push(
          `Error riesgo abandono gym ${gym.nombre}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      // 3. Resumen mensual (día 1 de cada mes)
      if (diaDelMes === 1) {
        try {
          const sociosActivos = clientesGym.filter(
            (c) => c.fecha_vencimiento && c.fecha_vencimiento >= hoyISO,
          ).length;

          const res = await procesarEnvioAvisoIa(
            admin,
            gym.id,
            null,
            "resumen_mensual",
            {
              nombre_gimnasio: gym.nombre,
              socios_activos: sociosActivos,
              checkins_mes: checkinsPorGym.get(gym.id) ?? 0,
            },
          );
          if (res.ok) {
            resultados.resumenesEnviados++;
          }
        } catch (err) {
          resultados.errores.push(
            `Error resumen mensual gym ${gym.nombre}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }

    return NextResponse.json({ ok: true, resultados });
  } catch (err) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    await notificarSuperadmin("Falló cron Asistente IA", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
