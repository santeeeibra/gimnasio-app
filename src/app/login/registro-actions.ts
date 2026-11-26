"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { crearCuentaConEmail } from "@/lib/plataforma/alta-individual";
import { solicitarAltaSocio } from "@/lib/plataforma/alta-socio";
import { registrarGimnasio } from "@/app/registro-gimnasio/actions";

export type PerfilRegistro = "individual" | "dueno" | "socio";
export type RegistroState = { error?: string };

// Única puerta de alta (pestaña "Crear cuenta" del login): cuenta individual,
// dueño de gimnasio o socio que pide el alta a su gimnasio.

// Rate limit en memoria: 1 alta cada 60 s por IP. No persiste entre despliegues;
// alcanza para frenar un bot que dispara altas en loop.
const VENTANA_MS = 60_000;
const ultimasAltas = new Map<string, number>();

async function frenarRafaga(): Promise<string | null> {
  const h = await headers();
  const ip =
    (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "desconocida";
  const ahora = Date.now();
  const previa = ultimasAltas.get(ip);
  if (previa && ahora - previa < VENTANA_MS) {
    return "Esperá un minuto antes de volver a intentar.";
  }
  ultimasAltas.set(ip, ahora);
  if (ultimasAltas.size > 500) {
    for (const [k, t] of ultimasAltas) if (ahora - t > VENTANA_MS) ultimasAltas.delete(k);
  }
  return null;
}

const EMAIL_OK = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function registrarDesdeLogin(
  prev: RegistroState,
  fd: FormData,
): Promise<RegistroState> {
  const perfil = String(fd.get("perfil") ?? "") as PerfilRegistro;
  const nombre = String(fd.get("nombre") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const clave = String(fd.get("clave") ?? "");
  const trampa = String(fd.get("empresa") ?? "").trim(); // honeypot

  if (trampa) return { error: "No se pudo completar el registro." };
  if (!["individual", "dueno", "socio"].includes(perfil)) {
    return { error: "Elegí qué tipo de cuenta querés crear." };
  }
  if (!nombre) return { error: "Completá tu nombre." };
  if (clave.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres." };
  if (fd.get("acepto_tyc") !== "on") {
    return { error: "Tenés que aceptar los Términos y Condiciones para continuar." };
  }
  if (email && !EMAIL_OK.test(email)) return { error: "El email no parece válido." };

  if (perfil === "individual") {
    if (!email) return { error: "Ingresá tu email: con eso vas a entrar." };
    const freno = await frenarRafaga();
    if (freno) return { error: freno };
    const alta = await crearCuentaConEmail({
      nombre,
      email,
      password: clave,
      tipo: "individual",
      tycAceptado: true,
    });
    if (alta.error) return alta;
    redirect("/panel");
  }

  const dni = String(fd.get("dni") ?? "").replace(/\D/g, "");
  if (dni.length < 6) return { error: "Ingresá tu DNI sin puntos (al menos 6 dígitos)." };

  if (perfil === "socio") {
    const gimnasio = String(fd.get("gimnasio") ?? "").trim();
    if (!gimnasio) return { error: "Escribí el nombre o el código de tu gimnasio." };
    const telefonoRaw = String(fd.get("telefono") ?? "").trim();
    const telefono = telefonoRaw ? telefonoRaw.replace(/[^\d+]/g, "") || null : null;
    const freno = await frenarRafaga();
    if (freno) return { error: freno };
    const alta = await solicitarAltaSocio({
      gimnasio,
      nombre,
      dni,
      telefono,
      email: email || null,
      clave,
    });
    if (alta.error) return alta;
    redirect("/mi");
  }

  // Dueño: mismo alta de siempre (gimnasio en prueba de 14 días, referido de
  // partner incluido). registrarGimnasio lee sus propios nombres de campo.
  const freno = await frenarRafaga();
  if (freno) return { error: freno };
  const datosGym = new FormData();
  datosGym.set("tipoCuenta", "dueno");
  datosGym.set("nombreGimnasio", String(fd.get("nombreGimnasio") ?? ""));
  datosGym.set("nombreDueno", nombre);
  datosGym.set("dni", dni);
  datosGym.set("email", email);
  datosGym.set("clave", clave);
  datosGym.set("acepto_tyc", "on");
  datosGym.set("refCode", String(fd.get("refCode") ?? ""));
  return registrarGimnasio(prev, datosGym);
}
