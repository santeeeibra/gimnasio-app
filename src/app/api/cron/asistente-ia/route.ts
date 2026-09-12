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

    for (const gym of gyms) {
      const gate = await verificarGateAsistenteIa(admin, gym.id);
      if (!gate.ok) continue;

      // 1. Cumpleaños del día
      try {
        const { data: cumpleaneros } = await admin
          .from("clientes")
          .select("id, fecha_nacimiento, profile:profiles(nombre)")
          .eq("gimnasio_id", gym.id)
          .not("fecha_nacimiento", "is", null);

        for (const c of cumpleaneros ?? []) {
          const fn = c.fecha_nacimiento as string | null;
          if (!fn || fn.slice(5, 10) !== hoyMMDD) continue;

          const profile = Array.isArray(c.profile) ? c.profile[0] : c.profile;
          const nombre = (profile as { nombre?: string } | null)?.nombre?.split(" ")[0] ?? "Campeón";

          const res = await procesarEnvioAvisoIa(admin, gym.id, c.id, "cumpleanos", {
            nombre,
            nombre_gimnasio: gym.nombre,
          });
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
        const [{ data: clientesGym }, { data: entradasGym }, { data: progresosGym }] =
          await Promise.all([
            admin
              .from("clientes")
              .select("id, fecha_vencimiento, profile:profiles(nombre)")
              .eq("gimnasio_id", gym.id)
              .not("fecha_vencimiento", "is", null),
            admin
              .from("registros_entrada")
              .select("cliente_id, creado_en")
              .gte("creado_en", `${hace45dISO}T00:00:00.000Z`),
            admin
              .from("registro_progreso")
              .select("cliente_id, fecha")
              .gte("fecha", hace45dISO),
          ]);

        const ultimaActividad = new Map<string, string>();
        const guardarActividad = (cid: string, f: string) => {
          const prev = ultimaActividad.get(cid);
          if (!prev || f > prev) ultimaActividad.set(cid, f);
        };

        for (const e of (entradasGym ?? []) as { cliente_id: string; creado_en: string }[]) {
          guardarActividad(e.cliente_id, e.creado_en.slice(0, 10));
        }
        for (const p of (progresosGym ?? []) as { cliente_id: string; fecha: string }[]) {
          guardarActividad(p.cliente_id, p.fecha);
        }

        for (const c of clientesGym ?? []) {
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

          const profile = Array.isArray(c.profile) ? c.profile[0] : c.profile;
          const nombre = (profile as { nombre?: string } | null)?.nombre?.split(" ")[0] ?? "socio";

          const res = await procesarEnvioAvisoIa(admin, gym.id, c.id, "riesgo_abandono", {
            nombre,
            dias_sin_asistir: diasInactivo,
            nombre_gimnasio: gym.nombre,
          });
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
          const hace30d = new Date();
          hace30d.setDate(hace30d.getDate() - 30);
          const hace30dISO = hace30d.toISOString().slice(0, 10);

          const [{ count: totalSocios }, { count: totalCheckins }] = await Promise.all([
            admin
              .from("clientes")
              .select("id", { count: "exact", head: true })
              .eq("gimnasio_id", gym.id)
              .gte("fecha_vencimiento", hoyISO),
            admin
              .from("registros_entrada")
              .select("id", { count: "exact", head: true })
              .gte("creado_en", `${hace30dISO}T00:00:00.000Z`),
          ]);

          const res = await procesarEnvioAvisoIa(admin, gym.id, null, "resumen_mensual", {
            nombre_gimnasio: gym.nombre,
            socios_activos: totalSocios ?? 0,
            checkins_mes: totalCheckins ?? 0,
          });
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
