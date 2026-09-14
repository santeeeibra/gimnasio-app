"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { comprimirImagen } from "@/lib/img/comprimir";
import { guardarFotoPropia } from "@/app/mi/perfil/actions";
import { Spinner } from "@/components/ui";
import { ImageCropModal } from "@/components/ui/image-crop-modal";
import { AvatarPickerModal } from "@/components/ui/avatar-picker-modal";
import { Pulpo } from "@/components/mascota/pulpo";
import { Camera } from "lucide-react";
import { hapticoExito, hapticoImpactoMedio } from "@/lib/ui/hapticos";

const BUCKET = "fotos-socios";
const FOTO_MAX_LADO = 256;
const FOTO_MAX_BYTES = 60 * 1024;

export function FotoPerfilPropia({
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [fileToCrop, setFileToCrop] = useState<File | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const src = fotoUrl ? `${fotoUrl}${version ? `?v=${version}` : ""}` : null;

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

      const res = await guardarFotoPropia(publicUrl);
      if (res.error) throw new Error(res.error);

      setVersion(Date.now());
      setFotoUrl(publicUrl);
      hapticoExito();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la foto.");
    } finally {
      setPending(false);
    }
  }

  async function elegirPreset(url: string) {
    setPickerOpen(false);
    setError(null);
    setPending(true);
    try {
      const res = await guardarFotoPropia(url);
      if (res.error) throw new Error(res.error);
      setVersion(Date.now());
      setFotoUrl(url);
      hapticoExito();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la foto.");
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
      const res = await guardarFotoPropia(null);
      if (res.error) throw new Error(res.error);
      setFotoUrl(null);
      setVersion(Date.now());
      hapticoImpactoMedio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo quitar la foto.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => setPickerOpen(true)}
        title="Tocar para cambiar tu foto"
        className={`relative size-14 shrink-0 rounded-full border-2 border-rule bg-paper-3 overflow-hidden grid place-items-center group active:scale-95 transition-transform ${
          pending ? "pointer-events-none opacity-60" : ""
        }`}
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
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={`Foto de ${nombre}`}
            className="size-full object-cover group-hover:brightness-95 transition-all"
          />
        ) : (
          <div className="size-full bg-[#052e1f] grid place-items-center">
            <Pulpo size={46} pose="neutral" />
          </div>
        )}

        <div className="absolute -bottom-0.5 -right-0.5 size-5 rounded-full bg-ink text-paper flex items-center justify-center shadow-md border-2 border-paper transition-transform group-hover:scale-110">
          <Camera className="size-2.5" />
        </div>

        {pending ? (
          <div className="absolute inset-0 bg-paper/70 backdrop-blur-xs rounded-full grid place-items-center">
            <Spinner className="text-ink" />
          </div>
        ) : null}
      </button>

      {error ? (
        <p role="alert" className="text-[10px] text-danger font-medium mt-0.5">
          {error}
        </p>
      ) : null}

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
