"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { crearGimnasio, type ResultadoAltaGym } from "@/app/admin/actions";
import { Button, linkClasses } from "@/components/ui";
import { hapticoExito, hapticoImpactoMedio } from "@/lib/ui/hapticos";
import { Check, Copy, Building2, User, KeyRound, Sparkles, ArrowLeft, Send } from "lucide-react";

type Plan = {
  id: string;
  nombre: string;
  max_socios: number;
};

export function AltaGymForm({ planes }: { planes: Plan[] }) {
  const [state, action, isPending] = useActionState<ResultadoAltaGym | null, FormData>(
    async (prev, formData) => {
      const res = await crearGimnasio(prev, formData);
      if (res.ok) {
        hapticoExito();
      } else {
        hapticoImpactoMedio();
      }
      return res;
    },
    null,
  );

  const [nombre, setNombre] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEditadoManualmente, setSlugEditadoManualmente] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNombre(val);
    if (!slugEditadoManualmente) {
      const autogenerado = val
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
      setSlug(autogenerado);
    }
  };

  const copiarCredenciales = () => {
    if (!state?.credenciales) return;
    const { nombre, slug, dni, nombreDueno, passwordTemporal } = state.credenciales;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const texto = `¡Hola ${nombreDueno}! 👋\nYa está creado tu acceso a *${nombre}* en SysGym:\n\n🔗 *Link de acceso:* ${origin}/login\n🏢 *Gimnasio:* ${slug}\n👤 *DNI:* ${dni}\n🔑 *Contraseña temporal:* ${passwordTemporal}\n\n(El sistema te pedirá cambiarla en tu primer inicio de sesión).`;

    navigator.clipboard.writeText(texto);
    hapticoImpactoMedio();
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  // Si se dio de alta con éxito, mostrar tarjeta con credenciales listas para WhatsApp
  if (state?.ok && state.credenciales) {
    const { gimnasioId, nombre: gymNom, slug: gymSlug, dni: gymDni, nombreDueno: gymDueno, passwordTemporal } =
      state.credenciales;

    return (
      <div className="space-y-4">
        <div className="rounded-[16px] border border-ok/30 bg-ok/10 p-5 space-y-4">
          <div className="flex items-center gap-2 text-ok font-semibold text-sm">
            <Check className="size-4" />
            <span>{state.msg}</span>
          </div>

          <div className="rounded-[12px] bg-paper border border-rule p-4 space-y-2 text-sm">
            <div className="flex justify-between items-center border-b border-rule/60 pb-2">
              <span className="text-xs text-ink-soft">Gimnasio</span>
              <span className="font-semibold text-ink">{gymNom} ({gymSlug})</span>
            </div>
            <div className="flex justify-between items-center border-b border-rule/60 pb-2">
              <span className="text-xs text-ink-soft">Dueño</span>
              <span className="font-medium text-ink">{gymDueno}</span>
            </div>
            <div className="flex justify-between items-center border-b border-rule/60 pb-2">
              <span className="text-xs text-ink-soft">DNI</span>
              <span className="font-mono text-ink">{gymDni}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-ink-soft">Clave inicial</span>
              <span className="font-mono font-bold text-ink bg-paper-2 px-2 py-0.5 rounded-[6px]">
                {passwordTemporal}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="volt"
            className="w-full h-12 text-sm font-semibold"
            onClick={copiarCredenciales}
          >
            {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copiado ? "¡Mensaje copiado para WhatsApp!" : "Copiar mensaje de bienvenida"}
          </Button>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Link
            href={`/admin/gimnasios/${gimnasioId}`}
            className="h-11 inline-flex items-center justify-center rounded-[12px] bg-ink text-paper text-sm font-medium hover:brightness-125"
          >
            Ver ficha del gimnasio →
          </Link>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={`text-center py-2 text-xs ${linkClasses.inline}`}
          >
            + Dar de alta otro gimnasio
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state && !state.ok && (
        <div className="rounded-[12px] border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-xs text-danger font-medium">
          {state.msg}
        </div>
      )}

      {/* Datos del Gimnasio */}
      <div className="rounded-[14px] border border-rule bg-paper p-4 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft uppercase tracking-wider">
          <Building2 className="size-3.5" />
          <span>Datos del Gimnasio</span>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink mb-1">
            Nombre del Gimnasio *
          </label>
          <input
            type="text"
            name="nombre"
            required
            placeholder="Ej: Fénix Gym"
            value={nombre}
            onChange={handleNombreChange}
            className="w-full h-11 px-3 rounded-[10px] border border-rule bg-paper text-ink text-sm placeholder:text-ink-soft/50 focus:outline-none focus:border-ink"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-medium text-ink">
              Slug identificador *
            </label>
            <span className="text-[11px] text-ink-soft font-mono">
              ej: login con &quot;{slug || "slug"}&quot;
            </span>
          </div>
          <input
            type="text"
            name="slug"
            required
            placeholder="fenix"
            value={slug}
            onChange={(e) => {
              setSlugEditadoManualmente(true);
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""));
            }}
            className="w-full h-11 px-3 rounded-[10px] border border-rule bg-paper text-ink font-mono text-sm placeholder:text-ink-soft/50 focus:outline-none focus:border-ink"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink mb-1">
            Plan inicial de plataforma
          </label>
          <select
            name="plan_id"
            className="w-full h-11 px-3 rounded-[10px] border border-rule bg-paper text-ink text-sm focus:outline-none focus:border-ink"
          >
            {planes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} (hasta {p.max_socios} socios)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Datos del Dueño */}
      <div className="rounded-[14px] border border-rule bg-paper p-4 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft uppercase tracking-wider">
          <User className="size-3.5" />
          <span>Datos del Dueño</span>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink mb-1">
            Nombre y Apellido *
          </label>
          <input
            type="text"
            name="nombre_dueno"
            required
            placeholder="Ej: Laura Gómez"
            className="w-full h-11 px-3 rounded-[10px] border border-rule bg-paper text-ink text-sm placeholder:text-ink-soft/50 focus:outline-none focus:border-ink"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink mb-1">
            DNI * (usuario de acceso)
          </label>
          <input
            type="tel"
            name="dni"
            required
            inputMode="numeric"
            placeholder="34555888"
            className="w-full h-11 px-3 rounded-[10px] border border-rule bg-paper text-ink font-mono text-sm placeholder:text-ink-soft/50 focus:outline-none focus:border-ink"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink mb-1">
            Email de recuperación <span className="text-ink-soft font-normal">(opcional)</span>
          </label>
          <input
            type="email"
            name="email_recuperacion"
            placeholder="dueno@gmail.com"
            className="w-full h-11 px-3 rounded-[10px] border border-rule bg-paper text-ink text-sm placeholder:text-ink-soft/50 focus:outline-none focus:border-ink"
          />
        </div>
      </div>

      {/* Explicación de clave inicial */}
      <div className="rounded-[12px] bg-paper-2/60 border border-rule/60 p-3 text-xs text-ink-soft flex items-start gap-2">
        <KeyRound className="size-4 text-ink-soft shrink-0 mt-0.5" />
        <div>
          La clave inicial se generará automáticamente como <strong className="text-ink font-mono">gym + últimos 4 del DNI</strong>.
          Al ingresar, el sistema le obligará a crear una clave propia.
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        loading={isPending}
        className="w-full h-12 text-sm font-semibold mt-2"
      >
        <Sparkles className="size-4" />
        Dar de alta gimnasio ahora
      </Button>
    </form>
  );
}
