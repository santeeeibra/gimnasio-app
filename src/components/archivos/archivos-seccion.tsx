"use client";

import { useCallback, useEffect, useState } from "react";
import { ArchivoUploader } from "./archivo-uploader";
import { ArchivosLista } from "./archivos-lista";
import { listarArchivosCliente, type ArchivoCliente } from "@/lib/storage/b2";
import { Spinner } from "@/components/ui";

/** Sube adjuntos (aptos médicos, dietas, etc.) y lista los ya guardados. */
export function ArchivosSeccion({
  clienteId,
  puedeBorrar = false,
}: {
  clienteId: string;
  puedeBorrar?: boolean;
}) {
  const [archivos, setArchivos] = useState<ArchivoCliente[] | null>(null);

  const cargar = useCallback(() => {
    listarArchivosCliente(clienteId).then((res) => {
      setArchivos(res.archivos ?? []);
    });
  }, [clienteId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="space-y-4">
      <ArchivoUploader clienteId={clienteId} onUploadSuccess={cargar} />

      {archivos === null ? (
        <div className="flex justify-center py-4">
          <Spinner className="size-5" />
        </div>
      ) : (
        <ArchivosLista
          archivos={archivos}
          puedeBorrar={puedeBorrar}
          onArchivoBorrado={(id) =>
            setArchivos((prev) => prev?.filter((a) => a.id !== id) ?? null)
          }
        />
      )}
    </div>
  );
}
