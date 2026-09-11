"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { dniAEmail } from "@/lib/auth";
import { enviarPush } from "@/lib/push/enviar";
import { notificarSuperadmin } from "@/lib/admin/notificar";
import { enviarEmail, escaparHtml } from "@/lib/email/enviar";

export type OlvideState = { ok?: string; error?: string };

// Mensajes de éxito. No revelan si el DNI existe.
const OK_SOCIO =
  "Listo. Le avisamos a tu gimnasio para que te regenere la contraseña. Pedísela y entrás con esa.";
const OK_DUENO =
  "Listo. Avisamos a soporte para restablecer tu contraseña. Te contactamos a la brevedad.";
const OK_EMAIL =
  "Si los datos coinciden con una cuenta, te va a llegar un mail con el enlace para cambiar la contraseña. Revisá también spam.";

// Rate limit en memoria: 1 pedido cada 2 min por gimnasio+DNI. No persiste
// entre despliegues; alcanza para frenar spam.
const VENTANA_MS = 2 * 60_000;
const ultimos = new Map<string, number>();

// El flujo por email solo sirve con un dominio verificado en Resend. Con el
// remitente de sandbox (@resend.dev) Resend únicamente entrega a la casilla
// dueña de la cuenta, así que ahí caemos al flujo asistido (avisar al gimnasio
// / a soporte para que regeneren la clave a mano).
function dominioEmailActivo(): boolean {
  const from = (process.env.RESEND_FROM || "").trim().toLowerCase();
  return from.length > 0 && !from.endsWith("@resend.dev");
}

export async function solicitarReset(
  _prev: OlvideState,
  formData: FormData,
): Promise<OlvideState> {
  const gimnasio = String(formData.get("gimnasio") ?? "").trim().toLowerCase();
  const dni = String(formData.get("dni") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!gimnasio || !dni) {
    return { error: "Completá gimnasio y DNI." };
  }

  const clave = `${gimnasio}:${dni}`;
  const ahora = Date.now();
  const prev = ultimos.get(clave);
  if (prev && ahora - prev < VENTANA_MS) {
    return { ok: OK_SOCIO };
  }
  ultimos.set(clave, ahora);
  if (ultimos.size > 500) {
    for (const [k, t] of ultimos) {
      if (ahora - t > VENTANA_MS) ultimos.delete(k);
    }
  }

  try {
    const admin = createAdminClient();

    // Excluye cuentas individuales de Google (ver login/actions.ts): no
    // tienen DNI/contraseña propios, así que no pueden pedir este reset.
    const { data: gym } = await admin
      .from("gimnasios")
      .select("id, slug, nombre")
      .eq("tipo_cuenta", "gym")
      .or(`slug.eq.${gimnasio},nombre.ilike.${gimnasio}`)
      .limit(1)
      .maybeSingle();
    if (!gym) return { ok: OK_SOCIO };

    const { data: prof } = await admin
      .from("profiles")
      .select("id, rol, nombre")
      .eq("gimnasio_id", gym.id)
      .eq("dni", dni)
      .maybeSingle();
    if (!prof) return { ok: OK_SOCIO };

    // Email de contacto cargado según el rol.
    let emailCargado: string | null = null;
    if (prof.rol === "cliente") {
      const { data: cli } = await admin
        .from("clientes")
        .select("email")
        .eq("profile_id", prof.id)
        .maybeSingle();
      emailCargado = cli?.email ?? null;
    } else {
      const { data: p } = await admin
        .from("profiles")
        .select("email_recuperacion")
        .eq("id", prof.id)
        .maybeSingle();
      emailCargado = p?.email_recuperacion ?? null;
    }

    // ── Camino A: link por email (solo con dominio verificado en Resend) ──
    if (
      dominioEmailActivo() &&
      email &&
      emailCargado &&
      emailCargado.trim().toLowerCase() === email
    ) {
      const h = await headers();
      const origin =
        h.get("origin") ??
        (h.get("host") ? `https://${h.get("host")}` : "http://localhost:3000");

      const { data: link, error: linkErr } = await admin.auth.admin.generateLink(
        {
          type: "recovery",
          email: dniAEmail(dni, gym.slug),
          options: { redirectTo: `${origin}/reset-clave` },
        },
      );

      if (!linkErr && link?.properties?.action_link) {
        const url = link.properties.action_link;
        const html = `
          <p>Pediste cambiar la contraseña de tu cuenta del gimnasio.</p>
          <p><a href="${escaparHtml(url)}" style="display:inline-block;padding:10px 18px;background:#16181d;color:#fff;border-radius:6px;text-decoration:none">Cambiar mi contraseña</a></p>
          <p style="color:#888;font-size:12px">Si el botón no funciona, copiá y pegá:<br>${escaparHtml(url)}</p>
          <p style="color:#888;font-size:12px">Si no pediste esto, ignorá el mail.</p>
        `;
        const r = await enviarEmail(email, "Cambiar tu contraseña", html);
        // Si el mail salió de verdad, listo. Si Resend lo rechazó (dominio no
        // verificado, RESEND_FROM mal puesto), NO mentimos: caemos al flujo
        // asistido de abajo.
        if (r.ok) return { ok: OK_EMAIL };
      } else {
        console.error("[olvide-clave] generateLink", linkErr);
      }
    }

    // ── Camino B: flujo asistido, sin email ──
    if (prof.rol === "cliente") {
      const { data: duenos } = await admin
        .from("profiles")
        .select("id")
        .eq("gimnasio_id", gym.id)
        .eq("rol", "dueno");
      const ids = (duenos ?? []).map((d: { id: string }) => d.id);
      if (ids.length) {
        await enviarPush(ids, {
          title: "Un socio no puede entrar",
          body: `${prof.nombre ?? "Un socio"} (DNI ${dni}) pidió recuperar su contraseña. Entrá a su ficha → Acceso → "Regenerar contraseña".`,
          url: "/panel/clientes",
          tag: `reset-socio-${prof.id}`,
        });
      }
      return { ok: OK_SOCIO };
    }

    // Dueño: avisar a soporte (push + email al superadmin).
    await notificarSuperadmin(
      "Dueño pidió recuperar su contraseña",
      `${prof.nombre ?? "Dueño"} (DNI ${dni})\nGimnasio: ${gym.nombre} (${gym.slug})\n\nRestablecer con scripts/reset-clave.mjs o desde /admin.`,
    );
    return { ok: OK_DUENO };
  } catch (err) {
    console.error("[olvide-clave]", err);
    return { ok: OK_SOCIO };
  }
}
