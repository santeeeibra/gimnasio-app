"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Check,
  Dumbbell,
  Eye,
  EyeOff,
  Info,
  Loader2,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { registrarDesdeLogin, type PerfilRegistro, type RegistroState } from "./registro-actions";
import { obtenerInfoPartnerReferidor, type InfoReferidor } from "@/app/registro-gimnasio/info-partner";
import { hapticoError, hapticoImpactoMedio, hapticoSeleccion } from "@/lib/ui/hapticos";

const INPUT =
  "w-full h-12.5 px-4 rounded-xl border border-white/20 bg-[#1d212d] text-white text-[16px] placeholder:text-slate-500 outline-none transition-[border-color,box-shadow,background-color] duration-150 focus:border-volt focus:bg-[#222736] focus:ring-2 focus:ring-volt/30";
const LABEL = "block text-[12px] font-bold text-slate-200 uppercase tracking-wider mb-1.5";
const OPCIONAL = "ml-1 normal-case tracking-normal font-medium text-slate-400";

const PERFILES: {
  valor: PerfilRegistro;
  titulo: string;
  detalle: string;
  Icono: typeof Dumbbell;
}[] = [
  {
    valor: "individual",
    titulo: "Entreno por mi cuenta",
    detalle: "Rutina, peso y progreso, sin gimnasio.",
    Icono: Dumbbell,
  },
  {
    valor: "dueno",
    titulo: "Tengo un gimnasio",
    detalle: "Gimnasio, estudio o entrenador. 14 días gratis.",
    Icono: Building2,
  },
  {
    valor: "socio",
    titulo: "Soy socio de un gimnasio",
    detalle: "Pedí tu alta; tu gimnasio la aprueba.",
    Icono: UserPlus,
  },
];

const BOTON: Record<PerfilRegistro, string> = {
  individual: "Crear mi cuenta",
  dueno: "Crear mi gimnasio",
  socio: "Pedir alta al gimnasio",
};

export function RegistroForm({
  perfil,
  onPerfil,
  gimnasioInicial,
  refCode,
}: {
  perfil: PerfilRegistro;
  onPerfil: (p: PerfilRegistro) => void;
  gimnasioInicial: string;
  refCode: string;
}) {
  const [state, formAction, pendiente] = useActionState<RegistroState, FormData>(
    registrarDesdeLogin,
    {},
  );
  const [verClave, setVerClave] = useState(false);
  const [partner, setPartner] = useState<InfoReferidor>(null);

  useEffect(() => {
    if (refCode) obtenerInfoPartnerReferidor(refCode).then(setPartner);
  }, [refCode]);

  useEffect(() => {
    if (state.error) hapticoError();
  }, [state]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="perfil" value={perfil} />
      <input type="hidden" name="refCode" value={partner?.referralCode ?? refCode} />
      {/* Honeypot: invisible para personas */}
      <input
        type="text"
        name="empresa"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      <p className="text-[14px] text-slate-300">¿Cómo vas a usar SysGym?</p>

      <fieldset className="space-y-2">
        <legend className="sr-only">Tipo de cuenta</legend>
        {PERFILES.map(({ valor, titulo, detalle, Icono }) => {
          const activo = perfil === valor;
          return (
            <label
              key={valor}
              className={`flex min-h-[60px] cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-[border-color,background-color] duration-150 ${
                activo
                  ? "border-volt/70 bg-volt/10"
                  : "border-white/12 bg-[#1d212d] hover:border-white/25"
              }`}
            >
              <input
                type="radio"
                name="perfil_visible"
                value={valor}
                checked={activo}
                onChange={() => {
                  hapticoSeleccion();
                  onPerfil(valor);
                }}
                className="sr-only"
              />
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-lg ${
                  activo ? "bg-volt text-volt-ink" : "bg-white/8 text-slate-300"
                }`}
              >
                <Icono aria-hidden className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-white leading-tight">{titulo}</span>
                <span className="block text-[12px] text-slate-400 leading-snug">{detalle}</span>
              </span>
              <span
                aria-hidden
                className={`grid size-5 shrink-0 place-items-center rounded-full border ${
                  activo ? "border-volt bg-volt text-volt-ink" : "border-white/25"
                }`}
              >
                {activo ? <Check className="size-3" strokeWidth={3} /> : null}
              </span>
            </label>
          );
        })}
      </fieldset>

      {perfil === "dueno" && partner ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3 text-[13px] text-emerald-100">
          <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-emerald-300" />
          <p>
            Invitación de <strong>{partner.nombre}</strong> (código{" "}
            <span className="font-mono">{partner.referralCode}</span>): Plan Inicial gratuito hasta 40
            alumnos activos.
          </p>
        </div>
      ) : null}

      <div className="space-y-4">
        {perfil === "socio" ? (
          <div>
            <label htmlFor="reg-gimnasio" className={LABEL}>Tu gimnasio</label>
            <input
              id="reg-gimnasio"
              name="gimnasio"
              required
              defaultValue={gimnasioInicial}
              autoComplete="organization"
              placeholder="Nombre o código del gimnasio"
              className={INPUT}
            />
          </div>
        ) : null}

        {perfil === "dueno" ? (
          <div>
            <label htmlFor="reg-nombre-gym" className={LABEL}>Nombre del gimnasio</label>
            <input
              id="reg-nombre-gym"
              name="nombreGimnasio"
              required
              autoComplete="organization"
              placeholder="Ej. Olimpo Fitness"
              className={INPUT}
            />
          </div>
        ) : null}

        <div>
          <label htmlFor="reg-nombre" className={LABEL}>Tu nombre y apellido</label>
          <input id="reg-nombre" name="nombre" required autoComplete="name" placeholder="Juan Pérez" className={INPUT} />
        </div>

        {perfil !== "individual" ? (
          <div>
            <label htmlFor="reg-dni" className={LABEL}>DNI</label>
            <input
              id="reg-dni"
              name="dni"
              required
              inputMode="numeric"
              pattern="[0-9.\s]*"
              autoComplete="off"
              placeholder="Sin puntos"
              className={`${INPUT} font-mono tabular-nums tracking-wider`}
            />
            <p className="mt-1.5 text-[12px] text-slate-400">Con tu DNI y la contraseña entrás a la app.</p>
          </div>
        ) : null}

        {perfil === "socio" ? (
          <div>
            <label htmlFor="reg-tel" className={LABEL}>
              Teléfono<span className={OPCIONAL}>(opcional)</span>
            </label>
            <input
              id="reg-tel"
              name="telefono"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="11 2345 6789"
              className={INPUT}
            />
          </div>
        ) : null}

        <div>
          <label htmlFor="reg-email" className={LABEL}>
            Email
            {perfil === "individual" ? null : <span className={OPCIONAL}>(opcional, para recuperar la clave)</span>}
          </label>
          <input
            id="reg-email"
            name="email"
            type="email"
            required={perfil === "individual"}
            autoComplete="email"
            inputMode="email"
            placeholder="tu@email.com"
            className={INPUT}
          />
        </div>

        <div>
          <label htmlFor="reg-clave" className={LABEL}>Contraseña</label>
          <div className="relative">
            <input
              id="reg-clave"
              name="clave"
              type={verClave ? "text" : "password"}
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
              className={`${INPUT} pr-12`}
            />
            <button
              type="button"
              onClick={() => {
                hapticoSeleccion();
                setVerClave((v) => !v);
              }}
              aria-pressed={verClave}
              aria-label={verClave ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute right-1 top-1/2 -translate-y-1/2 size-10.5 flex items-center justify-center rounded-lg text-slate-300 hover:text-white active:scale-90 transition-transform touch-manipulation"
            >
              {verClave ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
        </div>
      </div>

      {perfil === "socio" ? (
        <p className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-[12.5px] leading-relaxed text-slate-300">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-slate-400" />
          Tu gimnasio tiene que aprobar el alta. Hasta entonces vas a ver tu cuenta como pendiente.
        </p>
      ) : null}

      <label className="flex items-start gap-2.5 text-[13px] text-slate-300 select-none cursor-pointer">
        <input
          type="checkbox"
          name="acepto_tyc"
          required
          className="mt-0.5 size-4 shrink-0 rounded accent-volt [color-scheme:dark]"
        />
        <span>
          Acepto los{" "}
          <Link href="/terminos" target="_blank" className="font-semibold text-volt hover:underline">
            Términos y Condiciones
          </Link>
          .
        </span>
      </label>

      {state.error ? (
        <div
          role="alert"
          className="px-4 py-3 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-200 text-[13px] font-medium flex items-center gap-2.5 animate-shake"
        >
          <span className="size-2 rounded-full bg-rose-400 shrink-0" />
          <p>{state.error}</p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pendiente}
        onClick={() => hapticoImpactoMedio()}
        className="w-full h-13 rounded-xl font-bold text-[16px] tracking-wide text-volt-ink bg-volt hover:brightness-105 active:scale-[0.98] transition-[transform,filter] duration-150 shadow-[0_4px_24px_rgba(205,233,74,0.4)] disabled:opacity-60 flex items-center justify-center gap-2 touch-manipulation"
      >
        {pendiente ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
        {pendiente ? "Creando tu cuenta…" : BOTON[perfil]}
      </button>
    </form>
  );
}
