"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type LeadState =
  | { ok: true }
  | { ok: false; error: string };

function limpiar(v: FormDataEntryValue | null, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function enviarLead(
  _prev: LeadState | null,
  formData: FormData,
): Promise<LeadState> {
  const nombre = limpiar(formData.get("nombre"), 120);
  const gimnasio = limpiar(formData.get("gimnasio"), 120);
  const telefono = limpiar(formData.get("telefono"), 40);
  const ciudad = limpiar(formData.get("ciudad"), 120);

  // Honeypot: los bots completan campos ocultos.
  if (limpiar(formData.get("empresa_web"), 200)) return { ok: true };

  if (!nombre || !gimnasio || !telefono || !ciudad) {
    return { ok: false, error: "Completá todos los campos." };
  }
  if (!/[0-9]{6,}/.test(telefono.replace(/\D/g, ""))) {
    return { ok: false, error: "Revisá el teléfono." };
  }

  const ua = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  const supabase = await createClient();
  const { error } = await supabase.from("leads_landing").insert({
    nombre,
    gimnasio,
    telefono,
    ciudad,
    origen: "landing",
    user_agent: ua,
  });

  if (error) {
    return { ok: false, error: "No pudimos guardar tus datos. Probá de nuevo." };
  }
  return { ok: true };
}
