"use client";

import { useRef, useState, useTransition } from "react";
import { altaCliente, type AltaState } from "./actions";
import { Button, Field, Select, Spinner, linkClasses } from "@/components/ui";
import { SEXOS, SEXO_LABEL } from "@/lib/rutina/tipos";
import { CredencialesCard } from "./credenciales-card";
import { encolar } from "@/lib/offline/cola";
import type { PayloadAlta } from "@/lib/offline/handlers";
import { ImageCropModal } from "@/components/ui/image-crop-modal";
import { comprimirImagen } from "@/lib/img/comprimir";
import { createClient } from "@/lib/supabase/client";

const TIMEOUT_MS = 8_000;

export function AltaForm({
  planes,
  full = false,
  gimnasioId,
}: {
  planes: { id: string; nombre: string }[];
  full?: boolean;
  gimnasioId?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<AltaState & { encolado?: boolean }>({});
  const formRef = useRef<HTMLFormElement>(null);

  // Foto de perfil del nuevo cliente
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [pendingFoto, setPendingFoto] = useState(false);
  const [fotoError, setFotoError] = useState<string | null>(null);
  const [fileToCrop, setFileToCrop] = useState<File | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setFotoError(null);
    setFileToCrop(file);
    setCropModalOpen(true);
  }

  async function handleCroppedCanvas(croppedCanvas: HTMLCanvasElement) {
    setCropModalOpen(false);
    setFileToCrop(null);
    setPendingFoto(true);
    setFotoError(null);

    try {
      const { blob } = await comprimirImagen(croppedCanvas, {
        maxLado: 256,
        maxBytes: 60 * 1024,
        calidadInicial: 0.85,
      });

      const contentType = blob.type || "image/jpeg";
      const ext = contentType.includes("webp") ? "webp" : "jpg";
      const gymId = gimnasioId || "temp";
      const filePath = `${gymId}/${crypto.randomUUID()}.${ext}`;

      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("fotos-socios")
        .upload(filePath, blob, {
          upsert: true,
          contentType,
          cacheControl: "3600",
        });

      if (upErr) throw new Error(upErr.message);

      const publicUrl = supabase.storage
        .from("fotos-socios")
        .getPublicUrl(filePath).data.publicUrl;

      setFotoUrl(publicUrl);
    } catch (err) {
      setFotoError(
        err instanceof Error ? err.message : "No se pudo subir la foto.",
      );
    } finally {
      setPendingFoto(false);
    }
  }

  function quitarFoto() {
    setFotoUrl(null);
    setFotoError(null);
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const submitter = (e.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const modo: PayloadAlta["modo"] =
      submitter?.value === "prueba" ? "prueba" : "completa";

    const fd = new FormData(form);
    fd.set("modo", modo);
    if (fotoUrl) {
      fd.set("foto_url", fotoUrl);
    }

    const payload: PayloadAlta = {
      nombre: String(fd.get("nombre") ?? "").trim(),
      dni: String(fd.get("dni") ?? "").trim(),
      telefono: String(fd.get("telefono") ?? "").trim() || null,
      email: String(fd.get("email") ?? "").trim() || null,
      sexo: String(fd.get("sexo") ?? "") || null,
      plan_id: String(fd.get("plan_id") ?? "") || null,
      foto_url: fotoUrl,
      modo,
    };

    startTransition(async () => {
      try {
        const res = await Promise.race([
          altaCliente({}, fd),
          new Promise<never>((_, rej) =>
            setTimeout(() => rej(new Error("timeout")), TIMEOUT_MS),
          ),
        ]);
        setState(res);
        if (res.alta) {
          form.reset();
          setFotoUrl(null);
        }
      } catch {
        // Supabase no respondió: guardamos el alta para crearla al reconectar.
        encolar("alta_cliente", payload);
        setState({ encolado: true });
        form.reset();
        setFotoUrl(null);
      }
    });
  };

  return (
    <>
      <form
        ref={formRef}
        onSubmit={onSubmit}
        className="stagger grid sm:grid-cols-2 gap-4"
      >
        <input type="hidden" name="foto_url" value={fotoUrl ?? ""} />

        {/* Foto de perfil del socio (opcional) */}
        <div className="sm:col-span-2 flex items-center gap-4 p-3 rounded-[14px] bg-paper border border-rule">
          <div className="relative size-14 shrink-0">
            {fotoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={fotoUrl}
                alt="Foto del nuevo socio"
                className="size-14 rounded-full object-cover border-2 border-rule bg-paper-2 shadow-sm"
              />
            ) : (
              <div className="size-14 rounded-full bg-paper-2 border-2 border-dashed border-rule text-ink-soft grid place-items-center text-xs font-semibold">
                👤
              </div>
            )}
            {pendingFoto ? (
              <div className="absolute inset-0 bg-paper/70 backdrop-blur-xs rounded-full grid place-items-center">
                <Spinner className="text-accent" />
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <label
                className={`relative inline-flex h-8 items-center justify-center gap-1.5 overflow-hidden rounded-[5px] border border-rule bg-paper-2 px-3 text-xs font-medium text-ink transition-[transform,background-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-95 hover:bg-paper focus-within:outline-none focus-within:ring-2 focus-within:ring-ink/20 ${
                  pendingFoto
                    ? "cursor-not-allowed opacity-50 pointer-events-none"
                    : "cursor-pointer"
                }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  disabled={pendingFoto}
                  className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                  onChange={onFileChange}
                />
                <span>{fotoUrl ? "Cambiar foto" : "Agregar foto de perfil"}</span>
              </label>

              {fotoUrl ? (
                <button
                  type="button"
                  disabled={pendingFoto}
                  onClick={quitarFoto}
                  className={`text-xs disabled:opacity-50 ${linkClasses.accion}`}
                >
                  Quitar
                </button>
              ) : null}
            </div>

            <span className="text-[11px] text-ink-soft">
              Opcional · Recortá y ajustá antes de guardar (máx. 60 KB)
            </span>

            {fotoError ? (
              <p role="alert" className="text-xs text-danger">
                {fotoError}
              </p>
            ) : null}
          </div>
        </div>

        <Field label="Nombre y apellido" name="nombre" required />
        <Field label="DNI" name="dni" inputMode="numeric" required />
        <Field label="Teléfono" name="telefono" inputMode="tel" />
        <Field
          label="Email (opcional)"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="off"
          hint="Sirve para que el socio recupere la contraseña."
        />

        <Select label="Sexo" name="sexo" defaultValue="">
          <option value="">Sin especificar todavía</option>
          {SEXOS.filter((s) => s !== "sin_especificar").map((s) => (
            <option key={s} value={s}>
              {SEXO_LABEL[s]}
            </option>
          ))}
        </Select>

        <Select label="Plan" name="plan_id" defaultValue="">
          <option value="">Sin plan por ahora</option>
          {planes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </Select>

        <Field
          label="Peso corporal inicial (kg, opcional)"
          name="peso_inicial"
          type="number"
          step="0.1"
          min="20"
          max="300"
          placeholder="ej. 75.5"
          hint="Para arrancar su seguimiento de peso desde el día 1."
        />

        <p className="sm:col-span-2 text-xs text-ink-soft">
          El alta no registra el pago. Después de crear el socio, registrá el
          primer pago desde su ficha.
        </p>

        <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
          {full ? (
            <p className="w-full text-sm text-danger">
              Alcanzaste el límite de socios de tu plan. Contactá a soporte para
              ampliarlo.
            </p>
          ) : null}
          <Button
            type="submit"
            name="modo"
            value="completa"
            loading={pending}
            disabled={full}
          >
            {pending ? "Creando…" : "Dar de alta"}
          </Button>
          <Button
            type="submit"
            name="modo"
            value="prueba"
            variant="ghost"
            disabled={pending || full}
          >
            1 día de prueba
          </Button>
          {state.error ? (
            <p className="w-full text-sm text-danger">{state.error}</p>
          ) : null}
          {state.encolado ? (
            <p className="w-full text-sm text-warn">
              Alta guardada sin conexión. Se crea sola cuando vuelva el servidor —
              no repitas la carga.
            </p>
          ) : null}
          {state.ok ? (
            <p className="w-full text-sm text-ok">{state.ok}</p>
          ) : null}
          {state.alta ? (
            <div className="w-full">
              <CredencialesCard
                gimnasio={state.alta.gimnasio}
                slug={state.alta.slug}
                dni={state.alta.dni}
                clave={state.alta.clave}
                bloqueado={state.alta.bloqueado}
              />
            </div>
          ) : null}
        </div>
      </form>

      {/* Modal interactivo de recorte */}
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
