"use server";

import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Backblaze B2 (S3-compatible). El binario vive acá, Supabase solo guarda
// la URL final en `archivos_cliente` (ver migración 0067).
//
// Env requeridas:
//   B2_ENDPOINT        -> ej. https://s3.us-west-004.backblazeb2.com
//   B2_REGION           -> ej. us-west-004
//   B2_BUCKET           -> nombre del bucket
//   B2_KEY_ID           -> keyID de la application key
//   B2_APPLICATION_KEY  -> applicationKey
//   B2_PUBLIC_URL_BASE  -> base pública para armar la URL final, sin "/" final
//                          (bucket público en B2: https://f00X.backblazeb2.com/file/<bucket>
//                           o tu dominio propio detrás de Cloudflare)

const TIPOS_PERMITIDOS = [
  "logo",
  "foto_perfil",
  "checkin_fondo",
  "apto_medico",
  "dieta",
  "otro",
] as const;
type TipoArchivo = (typeof TIPOS_PERMITIDOS)[number];

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

function envRequerido(nombre: string): string {
  const v = process.env[nombre];
  if (!v) throw new Error(`Falta la env ${nombre} para Backblaze B2.`);
  return v;
}

function clienteS3(): S3Client {
  return new S3Client({
    endpoint: envRequerido("B2_ENDPOINT"),
    region: envRequerido("B2_REGION"),
    credentials: {
      accessKeyId: envRequerido("B2_KEY_ID"),
      secretAccessKey: envRequerido("B2_APPLICATION_KEY"),
    },
  });
}

function sanearNombre(nombre: string): string {
  const base = nombre.trim().slice(-120);
  return base.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/** Verifica que el usuario logueado pueda subir/leer archivos de `clienteId`. */
async function verificarAccesoCliente(clienteId: string) {
  const profile = await requireProfile();
  const db = createAdminClient();

  const { data: cliente, error } = await db
    .from("clientes")
    .select("id, gimnasio_id, profile_id")
    .eq("id", clienteId)
    .maybeSingle();

  if (error || !cliente) throw new Error("Cliente no encontrado");
  if (cliente.gimnasio_id !== profile.gimnasio_id) {
    throw new Error("El cliente no pertenece a tu gimnasio");
  }
  if (profile.rol === "cliente" && cliente.profile_id !== profile.id) {
    throw new Error("No podés subir archivos de otro socio");
  }
  if (profile.rol !== "cliente" && profile.rol !== "dueno" && profile.rol !== "staff") {
    throw new Error("Rol sin permiso para subir archivos");
  }

  return { profile, cliente };
}

export type FirmaSubidaB2Input = {
  clienteId: string;
  nombreArchivo: string;
  tipoArchivo: TipoArchivo;
  contentType: string;
  tamanioBytes: number;
};

export type FirmaSubidaB2Resultado =
  | { error: string }
  | { urlSubida: string; urlPublica: string; key: string };

/** Devuelve una URL firmada (PUT) para subir directo a B2 desde el navegador. */
export async function generarFirmaSubidaB2(
  input: FirmaSubidaB2Input,
): Promise<FirmaSubidaB2Resultado> {
  try {
    if (!TIPOS_PERMITIDOS.includes(input.tipoArchivo)) {
      return { error: "Tipo de archivo inválido" };
    }
    if (input.tamanioBytes > MAX_BYTES) {
      return { error: "El archivo supera los 15 MB" };
    }
    if (!input.nombreArchivo?.trim()) {
      return { error: "Falta el nombre del archivo" };
    }

    const { cliente } = await verificarAccesoCliente(input.clienteId);

    const bucket = envRequerido("B2_BUCKET");
    const publicBase = envRequerido("B2_PUBLIC_URL_BASE").replace(/\/$/, "");
    const nombre = sanearNombre(input.nombreArchivo);
    const key = `adjuntos/${cliente.gimnasio_id}/${cliente.id}/${Date.now()}-${randomUUID()}-${nombre}`;

    const comando = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: input.contentType,
    });

    const urlSubida = await getSignedUrl(clienteS3(), comando, { expiresIn: 300 });
    const urlPublica = `${publicBase}/${key}`;

    return { urlSubida, urlPublica, key };
  } catch (e) {
    console.error("[generarFirmaSubidaB2]", e);
    return { error: e instanceof Error ? e.message : "No se pudo generar la firma de subida" };
  }
}

export type ArchivoCliente = {
  id: string;
  nombre_archivo: string;
  url_archivo: string;
  tipo_archivo: TipoArchivo;
  created_at: string;
};

/** Lista los adjuntos de un cliente (RLS decide qué puede ver quien llama). */
export async function listarArchivosCliente(
  clienteId: string,
): Promise<{ error?: string; archivos?: ArchivoCliente[] }> {
  try {
    await verificarAccesoCliente(clienteId);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("archivos_cliente")
      .select("id, nombre_archivo, url_archivo, tipo_archivo, created_at")
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[listarArchivosCliente]", error);
      return { error: "No se pudieron cargar los archivos" };
    }

    return { archivos: data as ArchivoCliente[] };
  } catch (e) {
    console.error("[listarArchivosCliente]", e);
    return { error: e instanceof Error ? e.message : "No se pudieron cargar los archivos" };
  }
}

/** Borra un adjunto (solo dueño/staff, ver policy `archivos_cliente_delete`). */
export async function borrarArchivoCliente(
  archivoId: string,
): Promise<{ error?: string; ok?: boolean }> {
  try {
    const profile = await requireProfile();
    if (profile.rol !== "dueno" && profile.rol !== "staff") {
      return { error: "No tenés permiso para borrar archivos" };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("archivos_cliente").delete().eq("id", archivoId);

    if (error) {
      console.error("[borrarArchivoCliente]", error);
      return { error: "No se pudo borrar el archivo" };
    }
    return { ok: true };
  } catch (e) {
    console.error("[borrarArchivoCliente]", e);
    return { error: e instanceof Error ? e.message : "No se pudo borrar el archivo" };
  }
}

export type GuardarArchivoClienteInput = {
  clienteId: string;
  nombreArchivo: string;
  urlArchivo: string;
  tipoArchivo: TipoArchivo;
};

/** Inserta el registro en `archivos_cliente` una vez subido el binario a B2. */
export async function guardarArchivoClienteDB(
  input: GuardarArchivoClienteInput,
): Promise<{ error?: string; ok?: boolean; id?: string }> {
  try {
    if (!TIPOS_PERMITIDOS.includes(input.tipoArchivo)) {
      return { error: "Tipo de archivo inválido" };
    }
    if (!/^https:\/\/\S+$/.test(input.urlArchivo)) {
      return { error: "URL de archivo inválida" };
    }

    const { cliente } = await verificarAccesoCliente(input.clienteId);

    // Insert con el cliente autenticado (no admin) para que RLS valide de nuevo.
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("archivos_cliente")
      .insert({
        cliente_id: cliente.id,
        gimnasio_id: cliente.gimnasio_id,
        nombre_archivo: sanearNombre(input.nombreArchivo),
        url_archivo: input.urlArchivo,
        tipo_archivo: input.tipoArchivo,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[guardarArchivoClienteDB]", error);
      return { error: "No se pudo guardar el archivo" };
    }

    return { ok: true, id: data.id };
  } catch (e) {
    console.error("[guardarArchivoClienteDB]", e);
    return { error: e instanceof Error ? e.message : "No se pudo guardar el archivo" };
  }
}
