"use client";

import { useActionState, useState, useTransition } from "react";
import { UserPlus, Copy, Check, Power, KeyRound, Phone, Shield } from "lucide-react";
import { Button, Field } from "@/components/ui";
import { useHapticos } from "@/lib/ui/hapticos";
import { PulpoCard } from "@/components/mascota/pulpo";
import {
  altaStaff,
  toggleStaffActivo,
  restablecerClaveStaff,
  type AltaStaffState,
} from "./staff-actions";

export type StaffItem = {
  id: string;
  nombre: string;
  dni: string;
  telefono: string | null;
  activo: boolean;
  creado_at: string;
};

export function StaffForm({
  empleados,
  gimnasioSlug,
}: {
  empleados: StaffItem[];
  gimnasioSlug: string;
}) {
  const hapticos = useHapticos();
  const [mostrarNuevo, setMostrarNuevo] = useState(empleados.length === 0);
  const [copiado, setCopiado] = useState(false);
  const [claveRestablecida, setClaveRestablecida] = useState<{ id: string; clave: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const [state, formAction, pending] = useActionState(
    async (prev: AltaStaffState, fd: FormData) => {
      hapticos.medio();
      const res = await altaStaff(prev, fd);
      if (res.ok) {
        hapticos.exito();
      } else if (res.error) {
        hapticos.error();
      }
      return res;
    },
    {} as AltaStaffState,
  );

  const handleToggleActivo = (staffId: string, activoActual: boolean) => {
    hapticos.medio();
    startTransition(async () => {
      const res = await toggleStaffActivo(staffId, activoActual);
      if (res.ok) {
        hapticos.suave();
      } else {
        hapticos.error();
      }
    });
  };

  const handleRestablecerClave = (staffId: string) => {
    hapticos.medio();
    startTransition(async () => {
      const res = await restablecerClaveStaff(staffId);
      if (res.ok && res.clave) {
        hapticos.exito();
        setClaveRestablecida({ id: staffId, clave: res.clave });
      } else {
        hapticos.error();
      }
    });
  };

  const copiarCredenciales = (nombre: string, dni: string, clave: string) => {
    hapticos.suave();
    const texto = `Hola ${nombre}, este es tu acceso como staff a SysGym:\nGimnasio: ${gimnasioSlug}\nUsuario (DNI): ${dni}\nContraseña inicial: ${clave}\nIngresá acá: ${window.location.origin}/login`;
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Botón para alternar formulario de alta */}
      <div className="flex items-center justify-between gap-3 border-b border-rule pb-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">Personal de Recepción</h3>
          <p className="text-xs text-ink-soft">
            Cuentas operativas para cobrar cuotas, dar altas y marcar check-in.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            hapticos.suave();
            setMostrarNuevo(!mostrarNuevo);
          }}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-[10px] bg-ink px-3.5 py-1.5 text-xs font-semibold text-paper hover:opacity-90 active:scale-95 transition-all"
        >
          <UserPlus className="size-3.5" />
          <span>{mostrarNuevo ? "Ocultar formulario" : "Nuevo empleado"}</span>
        </button>
      </div>

      {/* Formulario de Alta */}
      {mostrarNuevo ? (
        <div className="rounded-[14px] border border-rule bg-paper-3/40 p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="size-6 rounded-full bg-volt/20 border border-volt/40 grid place-items-center text-[11px] font-bold text-ink">
              +
            </span>
            <h4 className="text-sm font-semibold text-ink">Alta de nuevo empleado</h4>
          </div>

          <form action={formAction} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field
                label="Nombre y apellido"
                name="nombre"
                placeholder="Ej: Sofía Pérez"
                required
              />
            </div>
            <Field
              label="DNI"
              name="dni"
              inputMode="numeric"
              placeholder="Sin puntos ni espacios"
              hint="Será su usuario de ingreso"
              required
            />
            <Field
              label="Teléfono (opcional)"
              name="telefono"
              inputMode="tel"
              placeholder="Ej: 11 2345 6789"
            />

            <div className="sm:col-span-2 flex flex-wrap items-center gap-3 pt-2">
              <Button type="submit" loading={pending}>
                {pending ? "Creando cuenta…" : "Dar de alta empleado"}
              </Button>
              {state.error ? (
                <p className="text-xs font-medium text-danger">{state.error}</p>
              ) : null}
            </div>
          </form>

          {/* Tarjeta de credenciales generadas */}
          {state.staff ? (
            <div className="mt-4 rounded-[12px] border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-emerald-400">
                  ✓ Cuenta creada con éxito
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copiarCredenciales(
                      state.staff!.nombre,
                      state.staff!.dni,
                      state.staff!.clave,
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-[8px] bg-paper-2 border border-rule px-2.5 py-1 text-xs font-medium text-ink hover:bg-paper-3 active:scale-95 transition-all"
                >
                  {copiado ? (
                    <>
                      <Check className="size-3 text-emerald-400" />
                      <span className="text-emerald-400">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3 text-ink-soft" />
                      <span>Copiar datos</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-[8px] bg-paper-2 border border-rule">
                  <span className="text-[10px] uppercase tracking-wider text-ink-soft block font-bold">
                    DNI / Usuario
                  </span>
                  <span className="font-mono text-sm font-semibold text-ink">
                    {state.staff.dni}
                  </span>
                </div>
                <div className="p-2.5 rounded-[8px] bg-paper-2 border border-rule">
                  <span className="text-[10px] uppercase tracking-wider text-ink-soft block font-bold">
                    Contraseña inicial
                  </span>
                  <span className="font-mono text-sm font-semibold text-volt">
                    {state.staff.clave}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-ink-soft leading-relaxed">
                El empleado deberá cambiar esta contraseña la primera vez que ingrese.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Lista de Empleados Existentes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider font-semibold text-ink-soft">
            Equipo activo ({empleados.length})
          </span>
        </div>

        {empleados.length === 0 ? (
          <div className="rounded-[16px] border border-rule bg-paper-2 p-6 flex flex-col items-center justify-center text-center space-y-3">
            <PulpoCard size={72} pose="vacio" />
            <div className="space-y-1 max-w-sm">
              <p className="text-sm font-semibold text-ink">
                Todavía no diste de alta empleados
              </p>
              <p className="text-xs text-ink-soft leading-relaxed">
                Creá accesos limitados para tu staff de recepción para que puedan atender socios y cobrar sin acceder a tus ajustes de facturación ni planes.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-rule border border-rule rounded-[14px] overflow-hidden bg-paper-2">
            {empleados.map((emp) => {
              const restablecida = claveRestablecida?.id === emp.id ? claveRestablecida.clave : null;

              return (
                <div
                  key={emp.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    !emp.activo ? "opacity-60 bg-paper-3/40" : ""
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-ink truncate">
                        {emp.nombre}
                      </span>
                      <span
                        className={`rounded-[6px] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          emp.activo
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-danger/15 text-danger border border-danger/30"
                        }`}
                      >
                        {emp.activo ? "Activo" : "Inactivo"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-ink-soft font-mono">
                      <span>DNI: {emp.dni}</span>
                      {emp.telefono ? (
                        <span className="flex items-center gap-1">
                          <Phone className="size-3" /> {emp.telefono}
                        </span>
                      ) : null}
                    </div>

                    {restablecida ? (
                      <div className="mt-2 text-xs font-mono text-volt bg-paper-3 p-2 rounded-[6px] border border-volt/30 flex items-center justify-between">
                        <span>Nueva clave inicial: <strong>{restablecida}</strong></span>
                        <button
                          type="button"
                          onClick={() => copiarCredenciales(emp.nombre, emp.dni, restablecida)}
                          className="text-[11px] underline font-sans ml-2 text-ink"
                        >
                          Copiar
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleRestablecerClave(emp.id)}
                      title="Volver a la clave inicial gymXXXX"
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-[8px] border border-rule bg-paper-3 px-2.5 py-1.5 text-xs text-ink-soft hover:text-ink hover:bg-paper active:scale-95 transition-all disabled:opacity-50"
                    >
                      <KeyRound className="size-3.5" />
                      <span className="hidden sm:inline">Restablecer clave</span>
                    </button>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleToggleActivo(emp.id, emp.activo)}
                      className={`inline-flex min-h-9 items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 ${
                        emp.activo
                          ? "border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20"
                          : "border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                      }`}
                    >
                      <Power className="size-3.5" />
                      <span>{emp.activo ? "Desactivar" : "Activar"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
