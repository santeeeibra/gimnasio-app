"use client";

import { useState } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Button, Spinner } from "@/components/ui";
import { guardarArchivoClienteDB } from "@/lib/storage/b2"; // Usamos la misma función de BD de Claude
import { hapticoExito, hapticoError, hapticoImpactoSuave } from "@/lib/ui/hapticos";
import { useUploadThing } from "@/lib/uploadthing";

type TipoArchivo = "logo" | "foto_perfil" | "checkin_fondo" | "apto_medico" | "dieta" | "otro";

const OPCIONES_TIPO: { value: TipoArchivo; label: string }[] = [
  { value: "apto_medico", label: "Apto Médico" },
  { value: "dieta", label: "Dieta / Nutrición" },
  { value: "otro", label: "Otro Documento" },
];

export function ArchivoUploader({
  clienteId,
  onUploadSuccess,
  className = "",
}: {
  clienteId: string;
  onUploadSuccess?: () => void;
  className?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoArchivo>("apto_medico");
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [guardandoDB, setGuardandoDB] = useState(false);

  const { startUpload, isUploading } = useUploadThing("archivoClienteUploader", {
    onUploadError: (err) => {
      setErrorLocal(err.message || "No se pudo subir el archivo a UploadThing.");
      hapticoError();
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seleccionado = e.target.files?.[0];
    if (seleccionado) {
      if (seleccionado.size > 4 * 1024 * 1024) {
        setErrorLocal("El archivo supera los 4MB permitidos.");
        return;
      }
      setFile(seleccionado);
      setErrorLocal(null);
      setExito(false);
      hapticoImpactoSuave();
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setErrorLocal(null);
    
    try {
      // 1. Subir a UploadThing
      const resUpload = await startUpload([file]);
      
      if (!resUpload || resUpload.length === 0) {
        throw new Error("No se pudo obtener la URL de respuesta.");
      }

      setGuardandoDB(true);

      // 2. Guardar URL en Supabase usando la función de Claude
      const urlFinal = resUpload[0].url;
      const resDb = await guardarArchivoClienteDB({
        clienteId,
        nombreArchivo: file.name,
        tipoArchivo: tipoSeleccionado,
        urlArchivo: urlFinal,
      });

      if (resDb.error) {
        throw new Error(resDb.error);
      }

      setExito(true);
      hapticoExito();
      
      setTimeout(() => {
        setFile(null);
        setExito(false);
        if (onUploadSuccess) onUploadSuccess();
      }, 2000);

    } catch (err: any) {
      setErrorLocal(err.message || "No se pudo completar el proceso.");
      hapticoError();
    } finally {
      setGuardandoDB(false);
    }
  };

  const isLoading = isUploading || guardandoDB;

  return (
    <div className={`p-4 bg-paper-3/40 rounded-[12px] border border-rule transition-all duration-200 ${className}`}>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-3 flex items-center gap-2">
        <Upload className="w-3.5 h-3.5 text-ink-soft" />
        Subir nuevo archivo
      </h3>

      {!file ? (
        <label className="animate-in fade-in zoom-in-95 duration-200 flex flex-col items-center justify-center p-5 border-2 border-dashed border-rule rounded-[12px] cursor-pointer hover:border-ink-soft/40 hover:bg-paper-3/30 transition-colors bg-paper/60 text-center">
          <Upload className="w-5 h-5 text-ink-soft mb-2 transition-transform duration-200 group-hover:-translate-y-0.5" />
          <span className="text-xs text-ink font-medium">Tocar para seleccionar PDF o Foto</span>
          <span className="text-[11px] text-ink-soft mt-1">Apto médico, Dieta, Certificado o Estudios (máx. 4 MB)</span>
          <input
            type="file"
            className="hidden"
            accept=".pdf,image/*"
            onChange={handleFileChange}
          />
        </label>
      ) : (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between bg-paper p-3 rounded-[10px] border border-rule">
            <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
              <FileText className="w-4 h-4 text-accent flex-shrink-0" />
              <span className="text-xs text-ink truncate font-medium">
                {file.name}
              </span>
            </div>
            {!isLoading && (
              <button 
                onClick={() => setFile(null)}
                className="p-1 hover:bg-paper-3 rounded-full text-ink-soft hover:text-ink transition-colors"
                aria-label="Quitar archivo"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-ink-soft font-medium ml-0.5">Tipo de Documento</label>
            <select
              value={tipoSeleccionado}
              onChange={(e) => setTipoSeleccionado(e.target.value as TipoArchivo)}
              disabled={isLoading}
              className="w-full bg-paper border border-rule rounded-[10px] p-2.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-accent transition-all"
            >
              {OPCIONES_TIPO.map((opcion) => (
                <option key={opcion.value} value={opcion.value}>
                  {opcion.label}
                </option>
              ))}
            </select>
          </div>

          {errorLocal && (
            <div className="animate-in fade-in slide-in-from-top-1 flex items-center gap-2 text-danger text-xs bg-danger/10 border border-danger/20 p-2.5 rounded-[10px]">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {errorLocal}
            </div>
          )}

          {exito ? (
            <div className="animate-in zoom-in duration-200 flex items-center gap-2 text-ok text-xs bg-ok/10 border border-ok/20 p-2.5 rounded-[10px] justify-center font-medium">
              <CheckCircle2 className="w-4 h-4" />
              ¡Archivo subido con éxito!
            </div>
          ) : (
            <Button
              onClick={handleUpload}
              disabled={isLoading}
              className="w-full rounded-[10px] text-xs h-9 transition-transform duration-200 active:scale-[0.98]"
              variant="primary"
            >
              {isLoading ? (
                <>
                  <Spinner className="w-3.5 h-3.5 mr-2" />
                  {isUploading ? "Subiendo archivo..." : "Guardando enlace..."}
                </>
              ) : (
                "Guardar Archivo"
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
