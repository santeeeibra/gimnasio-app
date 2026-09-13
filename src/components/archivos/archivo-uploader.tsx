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
    <div className={`p-4 bg-zinc-900 rounded-[12px] border border-zinc-800 transition-all duration-300 ease-out ${className}`}>
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <Upload className="w-4 h-4 text-zinc-400" />
        Subir nuevo archivo
      </h3>

      {!file ? (
        <label className="animate-in fade-in zoom-in-95 duration-300 flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-800 rounded-[12px] cursor-pointer hover:border-zinc-700 transition-colors bg-zinc-950">
          <Upload className="w-6 h-6 text-zinc-500 mb-2 transition-transform duration-300 group-hover:-translate-y-1" />
          <span className="text-sm text-zinc-400 font-medium">Tocar para seleccionar PDF o Foto</span>
          <span className="text-xs text-zinc-500 mt-1">Apto médico, Dieta/Plan nutricional, Certificado o Estudios (PDF/Foto máx. 4 MB)</span>
          <input
            type="file"
            className="hidden"
            accept=".pdf,image/*"
            onChange={handleFileChange}
          />
        </label>
      ) : (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between bg-zinc-950 p-3 rounded-[10px] border border-zinc-800">
            <div className="flex items-center gap-3 overflow-hidden">
              <FileText className="w-5 h-5 text-indigo-400 flex-shrink-0" />
              <span className="text-sm text-white truncate font-medium">
                {file.name}
              </span>
            </div>
            {!isLoading && (
              <button 
                onClick={() => setFile(null)}
                className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400 font-medium ml-1">Tipo de Documento</label>
            <select
              value={tipoSeleccionado}
              onChange={(e) => setTipoSeleccionado(e.target.value as TipoArchivo)}
              disabled={isLoading}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-[10px] p-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            >
              {OPCIONES_TIPO.map((opcion) => (
                <option key={opcion.value} value={opcion.value}>
                  {opcion.label}
                </option>
              ))}
            </select>
          </div>

          {errorLocal && (
            <div className="animate-in fade-in slide-in-from-top-1 flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-[10px]">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {errorLocal}
            </div>
          )}

          {exito ? (
            <div className="animate-in zoom-in duration-300 flex items-center gap-2 text-emerald-400 text-sm bg-emerald-400/10 p-3 rounded-[10px] justify-center font-medium">
              <CheckCircle2 className="w-5 h-5" />
              ¡Archivo subido con éxito!
            </div>
          ) : (
            <Button
              onClick={handleUpload}
              disabled={isLoading}
              className="w-full rounded-[10px] transition-transform duration-200 active:scale-[0.98]"
              variant="primary"
            >
              {isLoading ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
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
