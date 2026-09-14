"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { comprimirImagen } from "@/lib/img/comprimir";
import { guardarFotoSocio } from "../actions";
import { Spinner, linkClasses } from "@/components/ui";
import { ImageCropModal } from "@/components/ui/image-crop-modal";
import { AvatarPickerModal } from "@/components/ui/avatar-picker-modal";
import { Camera } from "lucide-react";
import { hapticoExito, hapticoImpactoMedio } from "@/lib/ui/hapticos";

const BUCKET = "fotos-socios";
const FOTO_MAX_LADO = 256;
const FOTO_MAX_BYTES = 60 * 1024; // 60 KB máximo

export function FotoSocioUploader({
  gimnasioId,
  clienteId,
  fotoUrlInicial,
  nombre,
}: {
  gimnasioId: string;
  clienteId: string;
  fotoUrlInicial: string | null;
  nombre: string;
}) {
  const [fotoUrl, setFotoUrl] = useState<string | null>(fotoUrlInicial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  // Estado para el modal de recorte
  const [fileToCrop, setFileToCrop] = useState<File | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);

  // Estado para el selector de avatares
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const path = `${gimnasioId}/${clienteId}.webp`;
  const src = fotoUrl ? `${fotoUrl}${version ? `?v=${version}` : ""}` : null;

  const iniciales = nombre
    ? nombre
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0])
        .join("")
        .toUpperCase()
    : "👤";

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setFileToCrop(file);
    setCropModalOpen(true);
  }

  async function handleCroppedCanvas(croppedCanvas: HTMLCanvasElement) {
    setCropModalOpen(false);
    setFileToCrop(null);
    setPending(true);
    setError(null);

    try {
      // Comprimir a max 256px y max 60 KB
      const { blob } = await comprimirImagen(croppedCanvas, {
        maxLado: FOTO_MAX_LADO,
        maxBytes: FOTO_MAX_BYTES,
        calidadInicial: 0.85,
      });

      const contentType = blob.type || "image/jpeg";
      const ext = contentType.includes("webp") ? "webp" : "jpg";
      const filePath = `${gimnasioId}/${clienteId}.${ext}`;

      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, blob, {
          upsert: true,
          contentType,
          cacheControl: "3600",
        });

      if (upErr) throw new Error(upErr.message);

      const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(filePath).data.publicUrl;

      const res = await guardarFotoSocio(clienteId, publicUrl);
      if (res.error) throw new Error(res.error);

      setVersion(Date.now());
      setFotoUrl(publicUrl);
      hapticoExito();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar la foto.",
      );
    } finally {
      setPending(false);
    }
  }

  async function elegirPreset(url: string) {
    setPickerOpen(false);
    setError(null);
    setPending(true);
    try {
      const res = await guardarFotoSocio(clienteId, url);
      if (res.error) throw new Error(res.error);
      setVersion(Date.now());
      setFotoUrl(url);
      hapticoExito();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar la foto.",
      );
    } finally {
      setPending(false);
    }
  }

  async function quitarFoto() {
    setError(null);
    setPending(true);
    try {
      const supabase = createClient();
      await supabase.storage.from(BUCKET).remove([
        `${gimnasioId}/${clienteId}.webp`,
        `${gimnasioId}/${clienteId}.jpg`,
      ]);
      const res = await guardarFotoSocio(clienteId, null);
      if (res.error) throw new Error(res.error);

      setFotoUrl(null);
      setVersion(Date.now());
      hapticoImpactoMedio();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo quitar la foto.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-4">
        {/* AVATAR TÁCTIL CON BADGE DE CÁMARA */}
        <button
          type="button"
          disabled={pending}
          onClick={() => setPickerOpen(true)}
          className={`relative size-18 sm:size-20 shrink-0 cursor-pointer rounded-full group select-none transition-transform active:scale-95 ${
            pending ? "pointer-events-none opacity-60" : ""
          }`}
          title="Tocar para cambiar foto"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            disabled={pending}
            className="sr-only"
            onChange={onFileChange}
          />

          {src ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={src}
              alt={`Foto de ${nombre}`}
              className="size-full rounded-full object-cover border-2 border-rule bg-paper-2 shadow-sm group-hover:brightness-95 transition-all"
            />
          ) : (
            <div className="size-full rounded-full bg-paper-2 border-2 border-dashed border-rule text-ink-soft grid place-items-center text-lg font-semibold tracking-wider group-hover:border-ink/50 transition-all">
              {iniciales}
            </div>
          )}

          {/* BADGE DE CÁMARA ESTILO IOS */}
          <div className="absolute -bottom-1 -right-1 size-7 rounded-full bg-ink text-paper flex items-center justify-center shadow-md border-2 border-paper transition-transform group-hover:scale-110">
            <Camera className="size-3.5" />
          </div>

          {pending ? (
            <div className="absolute inset-0 bg-paper/70 backdrop-blur-xs rounded-full grid place-items-center">
              <Spinner className="text-ink" />
            </div>
          ) : null}
        </button>

        {/* ACCIONES Y TEXTO ASISTENCIAL */}
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={pending}
              onClick={() => setPickerOpen(true)}
              className={`relative inline-flex h-8 items-center justify-center gap-1.5 overflow-hidden rounded-[8px] border border-rule bg-paper px-3 text-xs font-semibold text-ink transition-all active:scale-95 hover:bg-paper-2 ${
                pending ? "cursor-not-allowed opacity-50 pointer-events-none" : "cursor-pointer shadow-xs"
              }`}
            >
              <Camera className="size-3.5 text-ink-soft" />
              <span>{src ? "Cambiar foto" : "Elegir foto"}</span>
            </button>

            {src ? (
              <button
                type="button"
                disabled={pending}
                onClick={quitarFoto}
                className={`text-xs text-danger hover:underline disabled:opacity-50 py-1 px-1.5`}
              >
                Quitar
              </button>
            ) : null}
          </div>

          <span className="text-[11px] text-ink-soft">
            Tocá la foto para sacarle o subir una desde tu celular
          </span>

          {error ? (
            <p role="alert" className="text-xs text-danger font-medium mt-0.5">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      {/* SELECTOR DE AVATARES */}
      <AvatarPickerModal
        isOpen={pickerOpen}
        fotoActual={fotoUrl}
        onSelectPreset={elegirPreset}
        onSubirPropia={() => {
          setPickerOpen(false);
          fileInputRef.current?.click();
        }}
        onQuitar={() => {
          setPickerOpen(false);
          quitarFoto();
        }}
        onClose={() => setPickerOpen(false)}
      />

      {/* MODAL DE RECORTE Y ENCUADRE */}
      <ImageCropModal
        isOpen={cropModalOpen}
        file={fileToCrop}
        onCrop={handleCroppedCanvas}
        onCancel={() => {
          setCropModalOpen(false);
          setFileToCrop(null);
        }}
      />
    </>
  );
}
