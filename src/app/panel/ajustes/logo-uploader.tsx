"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { procesarLogo } from "@/lib/logo/comprimir";
import { colorDominante } from "@/lib/logo/paleta";
import { guardarLogo } from "./actions";

const BUCKET = "logos";

export function LogoUploader({
  gimnasioId,
  logoUrl,
  onLogo,
  onColor,
}: {
  gimnasioId: string;
  logoUrl: string | null;
  /** URL pública nueva (o null al quitar). */
  onLogo: (url: string | null) => void;
  /** Color dominante detectado en el logo recién subido. */
  onColor: (hex: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Cache-buster: el path es fijo (<id>.webp), hay que forzar recarga.
  const [version, setVersion] = useState(0);

  const path = `${gimnasioId}.webp`;
  const src = logoUrl ? `${logoUrl}${version ? `?v=${version}` : ""}` : null;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setPending(true);
    try {
      const { blob, imageData } = await procesarLogo(file);
      const supabase = createClient();

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, {
          upsert: true,
          contentType: "image/webp",
          cacheControl: "3600",
        });
      if (upErr) throw new Error(upErr.message);

      const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data
        .publicUrl;

      const res = await guardarLogo(gimnasioId, publicUrl);
      if (res.error) throw new Error(res.error);

      setVersion(Date.now());
      onLogo(publicUrl);
      onColor(colorDominante(imageData));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el logo.");
    } finally {
      setPending(false);
    }
  }

  async function quitar() {
    setError(null);
    setPending(true);
    try {
      const supabase = createClient();
      await supabase.storage.from(BUCKET).remove([path]);
      const res = await guardarLogo(gimnasioId, null);
      if (res.error) throw new Error(res.error);
      onLogo(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo quitar el logo.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <span className="block text-[11px] uppercase tracking-[0.12em] text-ink-soft">
          Logo
        </span>
        <p className="mt-1 text-xs text-ink-soft">
          Se comprime en tu teléfono antes de subir. Aparece en el panel y en la
          app de tus clientes.
        </p>
      </div>

      <div className="flex items-center gap-3">
        {src ? (
          <span className="size-[72px] shrink-0 overflow-hidden rounded-[8px] border border-rule bg-paper-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt="Logo del gimnasio"
              className="h-full w-full object-contain"
            />
          </span>
        ) : (
          <span className="grid size-[72px] shrink-0 place-items-center rounded-[8px] border border-dashed border-rule bg-paper-2 text-ink-soft">
            <svg
              className="size-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-4.5-4.5L5 21" />
            </svg>
          </span>
        )}

        <div className="flex min-w-0 flex-col gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-9 items-center justify-center rounded-[5px] border border-rule bg-paper px-3 text-sm font-medium text-ink transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 disabled:opacity-50"
          >
            {pending ? "Subiendo…" : src ? "Cambiar logo" : "Subir logo"}
          </button>
          {src ? (
            <button
              type="button"
              disabled={pending}
              onClick={quitar}
              className="text-xs text-ink-soft underline underline-offset-2 transition-transform duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 hover:text-ink disabled:opacity-50"
            >
              Quitar
            </button>
          ) : null}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={onFile}
      />

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
