import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { requireProfile } from "@/lib/auth";

const f = createUploadthing();

// 1. Reglas estrictas antispam
export const ourFileRouter = {
  // Endpoint específico para archivos de clientes (dieta, rutinas extra, apto médico)
  archivoClienteUploader: f({
    pdf: { maxFileSize: "4MB", maxFileCount: 1 },
    image: { maxFileSize: "4MB", maxFileCount: 1 },
  })
    .middleware(async ({ req }) => {
      try {
        // Solo usuarios logueados en nuestra app pueden subir archivos
        const profile = await requireProfile();
        
        // Retornamos el gym y el profileId para usarlo luego si hace falta
        return { userId: profile.id, gimnasioId: profile.gimnasio_id, rol: profile.rol };
      } catch (e) {
        throw new UploadThingError("No autorizado para subir archivos");
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Acá ya se subió a UploadThing con éxito
      console.log("Upload exitoso:", file.url);
      
      // Retornamos la URL al frontend para que el frontend la guarde en la BD
      return { url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
