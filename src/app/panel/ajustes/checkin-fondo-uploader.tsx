"use client";

import { useActionState, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { comprimirImagen } from "@/lib/img/comprimir";
import {
  guardarCheckinFondoImagen,
  quitarCheckinFondoImagen,
  actualizarCheckinFondoAjustes,
  type AjustesState,
} from "./actions";
import { PRESETS_FONDO_CHECKIN } from "@/lib/checkin/fondos-preset";
import { Button, Spinner, Toggle, linkClasses } from "@/components/ui";
import { useHapticos } from "@/lib/ui/hapticos";
import type { CheckinFondo } from "@/lib/tema";

const BUCKET = "checkin-fondos";
const MAX_LADO = 1600;
const MAX_BYTES = 700 * 1024;

export function CheckinFondoUploader({
  gimnasioId,
  fondo,
}: {
  gimnasioId: string;
  fondo: CheckinFondo;
}) {
  const hapticos = useHapticos();
  const [imagenUrl, setImagenUrl] = useState(fondo.imagenUrl);
  const [origen, setOrigen] = useState(fondo.origen);
  const [version, setVersion] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presetPendiente, setPresetPendiente] = useState<string | null>(null);

  const src = imagenUrl
    ? `${imagenUrl}${version ? `?v=${version}` : ""}`
    : null;

  async function elegirPreset(id: string, url: string) {
    hapticos.seleccion();
    setError(null);
    setPresetPendiente(id);
    try {
      const res = await guardarCheckinFondoImagen(gimnasioId, url, "preset");
      if (res.error) throw new Error(res.error);
      setImagenUrl(url);
      setOrigen("preset");
      hapticos.exito();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo aplicar el fondo.");
      hapticos.error();
    } finally {
      setPresetPendiente(null);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setPending(true);
    try {
      const { blob } = await comprimirImagen(file, {
        maxLado: MAX_LADO,
        maxBytes: MAX_BYTES,
        calidadInicial: 0.82,
      });
      const supabase = createClient();
      const path = `${gimnasioId}.webp`;

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

      const res = await guardarCheckinFondoImagen(gimnasioId, publicUrl, "propio");
      if (res.error) throw new Error(res.error);

      setVersion(Date.now());
      setImagenUrl(publicUrl);
      setOrigen("propio");
      hapticos.exito();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo subir la imagen.",
      );
      hapticos.error();
    } finally {
      setPending(false);
    }
  }

  async function quitar() {
    hapticos.seleccion();
    setError(null);
    setPending(true);
    try {
      if (origen === "propio") {
        const supabase = createClient();
        await supabase.storage.from(BUCKET).remove([`${gimnasioId}.webp`]);
      }
      const res = await quitarCheckinFondoImagen(gimnasioId);
      if (res.error) throw new Error(res.error);
      setImagenUrl(null);
      setOrigen(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo quitar el fondo.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <span className="block text-[11px] uppercase tracking-[0.08em] text-ink-soft">
          Fondo de la pantalla de check-in
        </span>
        <p className="mt-1 text-xs text-ink-soft">
          Se ve detrás del DNI en la tablet de mostrador. Elegí un fondo
          precargado o subí una foto propia (se comprime en tu teléfono).
        </p>
      </div>

      {src ? (
        <div className="flex items-center gap-3">
          <span className="h-24 w-16 shrink-0 overflow-hidden rounded-[10px] border border-rule bg-paper-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt="Fondo del check-in"
              className="h-full w-full object-cover"
            />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-sm font-medium">
              {origen === "propio" ? "Imagen propia" : "Fondo precargado"}
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={quitar}
              className={`text-xs disabled:opacity-50 ${linkClasses.accion}`}
            >
              Quitar fondo
            </button>
          </div>
        </div>
      ) : null}

      {PRESETS_FONDO_CHECKIN.length > 0 ? (
        <div>
          <span className="block text-[13px] font-medium text-ink-soft mb-1.5">
            Fondos precargados
          </span>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {PRESETS_FONDO_CHECKIN.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={pending || presetPendiente !== null}
                onClick={() => elegirPreset(p.id, p.url)}
                className={`relative aspect-[3/4] overflow-hidden rounded-[10px] border transition-[transform,border-color] duration-150 active:scale-95 disabled:opacity-50 ${
                  imagenUrl === p.url ? "border-ink" : "border-rule"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={p.label}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                {presetPendiente === p.id ? (
                  <span className="absolute inset-0 grid place-items-center bg-paper/70">
                    <Spinner />
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="rounded-[10px] border border-dashed border-rule bg-paper-2 px-3 py-2 text-xs text-ink-soft">
          Todavía no hay fondos precargados por SysGym. Por ahora subí una
          imagen propia.
        </p>
      )}

      <label
        className={`relative inline-flex h-9 items-center justify-center gap-2 overflow-hidden rounded-[5px] border border-rule bg-paper px-3 text-sm font-medium text-ink transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 hover:bg-paper-2 focus-within:outline-none focus-within:ring-2 focus-within:ring-ink/20 ${
          pending ? "cursor-not-allowed opacity-50 pointer-events-none" : "cursor-pointer"
        }`}
      >
        <input
          type="file"
          accept="image/*"
          disabled={pending}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          onChange={onFile}
        />
        {pending ? (
          <>
            <Spinner />
            Subiendo…
          </>
        ) : (
          "Subir foto propia"
        )}
      </label>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      {imagenUrl ? <AjustesFondoForm gimnasioId={gimnasioId} fondo={fondo} /> : null}
    </div>
  );
}

function AjustesFondoForm({
  gimnasioId,
  fondo,
}: {
  gimnasioId: string;
  fondo: CheckinFondo;
}) {
  const hapticos = useHapticos();
  const [state, formAction, pending] = useActionState<AjustesState, FormData>(
    actualizarCheckinFondoAjustes,
    {},
  );
  const [activo, setActivo] = useState(fondo.activo);
  const [oscurecido, setOscurecido] = useState(fondo.oscurecido);

  useEffect(() => {
    if (state.ok) hapticos.exito();
    else if (state.error) hapticos.error();
  }, [state.ok, state.error, hapticos]);

  return (
    <form action={formAction} className="space-y-4 border-t border-rule pt-4">
      <input type="hidden" name="gimnasio_id" value={gimnasioId} />

      <Toggle
        name="activo"
        checked={activo}
        onCheckedChange={setActivo}
        label="Mostrar este fondo en el check-in"
      />

      <label className="block">
        <span className="block text-[13px] font-medium text-ink-soft mb-1.5">
          Oscurecido sobre la imagen (legibilidad del DNI)
        </span>
        <input
          type="range"
          name="oscurecido"
          min={0}
          max={90}
          step={5}
          value={oscurecido}
          onChange={(e) => setOscurecido(Number(e.target.value))}
          className="w-full accent-[var(--volt)]"
        />
        <span className="block text-xs text-ink-soft mt-1">{oscurecido}%</span>
      </label>

      {state.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" loading={pending} className="h-10">
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
