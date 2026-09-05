"use server";

import { requireSuperadmin, dniAEmail, claveInicial } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAccionAdmin } from "@/lib/admin/audit";
import { revalidatePath } from "next/cache";

export type SocioImportarItem = {
  nombre: string;
  dni: string;
  telefono: string | null;
  email: string | null;
  planId: string | null;
  sexo: "hombre" | "mujer" | "sin_especificar" | null;
  fotoBase64: string | null; // DataURL o base64 puro
};

export type ResultadoImportarItem = {
  dni: string;
  nombre: string;
  ok: boolean;
  error?: string;
};

/**
 * Importa una tanda de socios válidos usando service_role.
 * Sigue el mismo criterio que el alta individual:
 * - Auth user creado con dni@<slug>.gym.local y claveInicial(dni)
 * - Perfil en `profiles` con rol='cliente'
 * - Registro en `clientes` con estado_cuota='vencido', acceso_habilitado=true, sin pago
 * - Si tiene foto, se sube a fotos-socios/<gimnasio_id>/<cliente_id>.webp y se setea foto_url
 */
export async function importarTandaSocios(
  gimnasioId: string,
  socios: SocioImportarItem[],
): Promise<ResultadoImportarItem[]> {
  await requireSuperadmin();
  const admin = createAdminClient();

  const { data: gym, error: gymErr } = await admin
    .from("gimnasios")
    .select("id, slug, nombre")
    .eq("id", gimnasioId)
    .single();

  if (gymErr || !gym) {
    throw new Error("Gimnasio no encontrado.");
  }

  const resultados: ResultadoImportarItem[] = [];

  for (const s of socios) {
    const dni = s.dni.trim();
    const nombre = s.nombre.trim();

    if (!dni || !nombre) {
      resultados.push({
        dni,
        nombre,
        ok: false,
        error: "Nombre o DNI vacío",
      });
      continue;
    }

    try {
      const emailSintetico = dniAEmail(dni, gym.slug);
      const clave = claveInicial(dni);

      // 1. Crear usuario en Auth
      const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
        email: emailSintetico,
        password: clave,
        email_confirm: true,
      });

      if (authErr || !authUser.user) {
        resultados.push({
          dni,
          nombre,
          ok: false,
          error: authErr?.message?.includes("already")
            ? "Ya existe un usuario con este DNI"
            : authErr?.message ?? "Error al crear usuario de auth",
        });
        continue;
      }

      const userId = authUser.user.id;

      // 2. Insertar profile
      const { error: profErr } = await admin.from("profiles").insert({
        id: userId,
        gimnasio_id: gimnasioId,
        rol: "cliente",
        dni,
        nombre,
        telefono: s.telefono || null,
        debe_cambiar_clave: true,
      });

      if (profErr) {
        await admin.auth.admin.deleteUser(userId);
        resultados.push({
          dni,
          nombre,
          ok: false,
          error: "Error al crear perfil de socio",
        });
        continue;
      }

      // 3. Insertar cliente
      const insertCliente: Record<string, any> = {
        gimnasio_id: gimnasioId,
        profile_id: userId,
        plan_id: s.planId || null,
        sexo: s.sexo || null,
        email: s.email || null,
        fecha_inicio: null,
        fecha_vencimiento: null,
        estado_cuota: "vencido",
        acceso_habilitado: true,
        en_prueba: false,
      };

      const { data: cliente, error: cliErr } = await admin
        .from("clientes")
        .insert(insertCliente)
        .select("id")
        .single();

      if (cliErr || !cliente) {
        resultados.push({
          dni,
          nombre,
          ok: false,
          error: cliErr?.message ?? "Error al vincular cliente",
        });
        continue;
      }

      // 4. Si tiene foto, subir a fotos-socios/<gimnasio_id>/<cliente_id>.webp
      if (s.fotoBase64) {
        try {
          const rawBase64 = s.fotoBase64.replace(/^data:image\/\w+;base64,/, "");
          const buffer = Buffer.from(rawBase64, "base64");
          const storagePath = `${gimnasioId}/${cliente.id}.webp`;

          const { error: upErr } = await admin.storage
            .from("fotos-socios")
            .upload(storagePath, buffer, {
              upsert: true,
              contentType: "image/webp",
              cacheControl: "3600",
            });

          if (!upErr) {
            const { data: pubData } = admin.storage
              .from("fotos-socios")
              .getPublicUrl(storagePath);

            if (pubData?.publicUrl) {
              await admin
                .from("clientes")
                .update({ foto_url: pubData.publicUrl })
                .eq("id", cliente.id);
            }
          }
        } catch (imgErr) {
          console.error("Error al procesar foto para DNI", dni, imgErr);
          // La foto no debe abortar la creación del socio
        }
      }

      resultados.push({
        dni,
        nombre,
        ok: true,
      });
    } catch (err) {
      resultados.push({
        dni,
        nombre,
        ok: false,
        error: err instanceof Error ? err.message : "Error inesperado",
      });
    }
  }

  return resultados;
}

/**
 * Registra el fin de la importación masiva en el log de auditoría
 * y revalida la vista del gimnasio en /admin.
 */
export async function registrarFinImportacion(
  gimnasioId: string,
  resumen: {
    total: number;
    exitosos: number;
    fallidos: number;
    errores: { dni: string; motivo: string }[];
  },
): Promise<void> {
  const adminUser = await requireSuperadmin();

  await registrarAccionAdmin(adminUser.id, "importar_socios", gimnasioId, {
    total: resumen.total,
    exitosos: resumen.exitosos,
    fallidos: resumen.fallidos,
    errores: resumen.errores.slice(0, 30),
  });

  revalidatePath(`/admin/gimnasios/${gimnasioId}`);
  revalidatePath(`/admin/gimnasios/${gimnasioId}/importar-socios`);
}
