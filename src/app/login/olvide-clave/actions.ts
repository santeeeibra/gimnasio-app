"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { dniAEmail } from "@/lib/auth";
import { enviarEmail, escaparHtml } from "@/lib/email/enviar";

export type OlvideState = { ok?: string; error?: string };

// Mensaje único de éxito: no revela si el DNI existe ni si el email coincide.
const GENERICO =
  "Si los datos coinciden con una cuenta, te va a llegar un mail con el enlace para cambiar la contraseña. Revisá también spam.";

// Rate limit en memoria: 1 pedido cada 2 min por gimnasio+DNI. No persiste
// entre despliegues; alcanza para frenar spam de mails.
const VENTANA_MS = 2 * 60_000;
const ultimos = new Map<string, number>();

export async function solicitarReset(
  _prev: OlvideState,
  formData: FormData,
): Promise<OlvideState> {
  const gimnasio = String(formData.get("gimnasio") ?? "").trim().toLowerCase();
  const dni = String(formData.get("dni") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!gimnasio || !dni || !email) {
    return { error: "Completá gimnasio, DNI y email." };
  }

  const clave = `${gimnasio}:${dni}`;
  const ahora = Date.now();
  const prev = ultimos.get(clave);
  if (prev && ahora - prev < VENTANA_MS) {
    return { ok: GENERICO };
  }
  ultimos.set(clave, ahora);
  if (ultimos.size > 500) {
    for (const [k, t] of ultimos) {
      if (ahora - t > VENTANA_MS) ultimos.delete(k);
    }
  }

  try {
    const admin = createAdminClient();

    const { data: gym } = await admin
      .from("gimnasios")
      .select("id, slug")
      .or(`slug.eq.${gimnasio},nombre.ilike.${gimnasio}`)
      .limit(1)
      .maybeSingle();
    if (!gym) return { ok: GENERICO };

    const { data: prof } = await admin
      .from("profiles")
      .select("id, rol")
      .eq("gimnasio_id", gym.id)
      .eq("dni", dni)
      .maybeSingle();
    if (!prof) return { ok: GENERICO };

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

    if (!emailCargado || emailCargado.trim().toLowerCase() !== email) {
      return { ok: GENERICO };
    }

    const h = await headers();
    const origin =
      h.get("origin") ??
      (h.get("host") ? `https://${h.get("host")}` : "http://localhost:3000");

    const { data: link, error: linkErr } =
      await admin.auth.admin.generateLink({
        type: "recovery",
        email: dniAEmail(dni, gym.slug),
        options: { redirectTo: `${origin}/reset-clave` },
      });

    if (linkErr || !link?.properties?.action_link) {
      console.error("[olvide-clave] generateLink", linkErr);
      return { ok: GENERICO };
    }

    const url = link.properties.action_link;
    const html = `
      <p>Pediste cambiar la contraseña de tu cuenta del gimnasio.</p>
      <p><a href="${escaparHtml(url)}" style="display:inline-block;padding:10px 18px;background:#16181d;color:#fff;border-radius:6px;text-decoration:none">Cambiar mi contraseña</a></p>
      <p style="color:#888;font-size:12px">Si el botón no funciona, copiá y pegá este enlace:<br>${escaparHtml(url)}</p>
      <p style="color:#888;font-size:12px">Si no pediste esto, ignorá el mail.</p>
    `;
    await enviarEmail(email, "Cambiar tu contraseña", html);

    return { ok: GENERICO };
  } catch (err) {
    console.error("[olvide-clave]", err);
    return { ok: GENERICO };
  }
}
