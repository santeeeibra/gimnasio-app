"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { comprimirImagen } from "@/lib/img/comprimir";
import { guardarFotoSocio } from "../actions";
import { Spinner, linkClasses } from "@/components/ui";
import { ImageCropModal } from "@/components/ui/image-crop-modal";

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
        {/* AVATAR CIRCULAR */}
        <div className="relative size-16 shrink-0">
          {src ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={src}
              alt={`Foto de ${nombre}`}
              className="size-16 rounded-full object-cover border-2 border-rule bg-paper-2 shadow-sm"
            />
          ) : (
            <div className="size-16 rounded-full bg-paper-3 border-2 border-dashed border-rule text-ink-soft grid place-items-center text-sm font-semibold tracking-wider">
              {iniciales}
            </div>
          )}

          {pending ? (
            <div className="absolute inset-0 bg-paper/70 backdrop-blur-xs rounded-full grid place-items-center">
              <Spinner className="text-accent" />
            </div>
          ) : null}
        </div>

        {/* ACCIONES (SUBIR / CAMBIAR / QUITAR) CON FIX DE SAFARI IOS */}
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <label
              className={`relative inline-flex h-8 items-center justify-center gap-1.5 overflow-hidden rounded-[5px] border border-rule bg-paper px-3 text-xs font-medium text-ink transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 hover:bg-paper-2 focus-within:outline-none focus-within:ring-2 focus-within:ring-ink/20 ${
                pending
                  ? "cursor-not-allowed opacity-50 pointer-events-none"
                  : "cursor-pointer"
              }`}
            >
              <input
                type="file"
                accept="image/*"
                disabled={pending}
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                onChange={onFileChange}
              />
              <span>{src ? "Cambiar foto" : "Subir foto"}</span>
            </label>

            {src ? (
              <button
                type="button"
                disabled={pending}
                onClick={quitarFoto}
                className={`text-xs disabled:opacity-50 ${linkClasses.accion}`}
              >
                Quitar
              </button>
            ) : null}
          </div>

          <span className="text-[11px] text-ink-soft">
            Máx. 256px · Se comprime a menos de 60 KB
          </span>

          {error ? (
            <p role="alert" className="text-xs text-danger">
              {error}
            </p>
          ) : null}
        </div>
      </div>

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
