"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Link2, Loader2, Pencil, Power, Trash2 } from "lucide-react";
import { hapticoSeleccion, hapticoExito, hapticoError } from "@/lib/ui/hapticos";
import {
  alternarPlantillaActiva,
  eliminarPlantilla,
  renombrarPlantilla,
} from "./actions";

type Plantilla = {
  id: string;
  nombre: string;
  codigo: string;
  objetivo: string | null;
  nivel: string | null;
  dias_por_semana: number | null;
  activa: boolean;
  veces_cargada: number;
  creada_at: string;
};

function origen() {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export function PlantillasClient({ plantillas }: { plantillas: Plantilla[] }) {
  if (plantillas.length === 0) {
    return (
      <p className="rounded-[14px] border border-dashed border-rule bg-paper p-6 text-center text-sm text-ink-soft">
        Todavía no publicaste ninguna rutina para compartir.
      </p>
    );
  }
  return (
    <ul className="space-y-2.5">
      {plantillas.map((p) => (
        <Fila key={p.id} p={p} />
      ))}
    </ul>
  );
}

function Fila({ p }: { p: Plantilla }) {
  const [copiado, setCopiado] = useState<"link" | "codigo" | null>(null);
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(p.nombre);
  const [codigo, setCodigo] = useState(p.codigo);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const link = `${origen()}/r/${p.codigo}`;

  async function copiar(tipo: "link" | "codigo", texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      hapticoSeleccion();
      setCopiado(tipo);
      setTimeout(() => setCopiado(null), 1800);
    } catch {
      hapticoError();
    }
  }

  function toggle() {
    start(async () => {
      const r = await alternarPlantillaActiva(p.id, !p.activa);
      if (r.error) hapticoError();
      else hapticoSeleccion();
      setMsg(r.error ?? null);
    });
  }

  function guardar() {
    start(async () => {
      const r = await renombrarPlantilla(p.id, nombre, codigo);
      if (r.error) {
        hapticoError();
        setMsg(r.error);
        return;
      }
      hapticoExito();
      if (r.codigo) setCodigo(r.codigo);
      setEditando(false);
      setMsg(null);
    });
  }

  function borrar() {
    if (!confirm(`¿Borrar la plantilla “${p.nombre}”? El link deja de funcionar.`)) return;
    start(async () => {
      const r = await eliminarPlantilla(p.id);
      if (r.error) {
        hapticoError();
        setMsg(r.error);
      }
    });
  }

  return (
    <li className="rounded-[18px] border border-rule bg-paper-2 p-4 shadow-sm">
      {editando ? (
        <div className="space-y-2">
          <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-soft">
            Nombre
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="mt-1 h-10 w-full rounded-[10px] border border-rule bg-paper px-3 text-[16px] text-ink"
            />
          </label>
          <label className="block text-[11px] font-medium uppercase tracking-[0.08em] text-ink-soft">
            Código (link)
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              className="mt-1 h-10 w-full rounded-[10px] border border-rule bg-paper px-3 text-[16px] uppercase text-ink"
            />
          </label>
          <div className="flex gap-2 pt-1">
            <button
              onClick={guardar}
              disabled={pending}
              className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-accent px-3 text-sm font-medium text-accent-ink disabled:opacity-60"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Guardar
            </button>
            <button
              onClick={() => {
                setEditando(false);
                setNombre(p.nombre);
                setCodigo(p.codigo);
                setMsg(null);
              }}
              className="h-9 rounded-[10px] px-3 text-sm text-ink-soft"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-display text-base text-ink">{p.nombre}</p>
              <p className="text-xs text-ink-soft">
                {[
                  p.objetivo,
                  p.nivel,
                  p.dias_por_semana ? `${p.dias_por_semana} días` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Rutina"}
              </p>
            </div>
            {!p.activa && (
              <span className="shrink-0 rounded-full border border-rule px-2 py-0.5 text-[11px] text-ink-soft">
                Pausada
              </span>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-[10px] border border-rule bg-paper px-2.5 py-1.5">
            <Link2 aria-hidden className="size-3.5 shrink-0 text-ink-soft" />
            <span className="truncate text-xs text-ink-soft">/r/{p.codigo}</span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={() => copiar("link", link)}
              className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-rule bg-paper px-3 text-sm font-medium text-ink active:scale-[0.98]"
            >
              {copiado === "link" ? <Check className="size-4 text-ok" /> : <Copy className="size-4" />}
              {copiado === "link" ? "Copiado" : "Copiar link"}
            </button>
            <button
              onClick={() => copiar("codigo", p.codigo)}
              className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-rule bg-paper px-3 text-sm font-medium text-ink active:scale-[0.98]"
            >
              {copiado === "codigo" ? <Check className="size-4 text-ok" /> : <Copy className="size-4" />}
              Código
            </button>
            <span className="ml-auto text-xs text-ink-soft">
              {p.veces_cargada} {p.veces_cargada === 1 ? "alumno" : "alumnos"}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-1 border-t border-rule pt-2">
            <button
              onClick={() => setEditando(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2 text-xs text-ink-soft hover:text-ink"
            >
              <Pencil className="size-3.5" /> Editar
            </button>
            <button
              onClick={toggle}
              disabled={pending}
              className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2 text-xs text-ink-soft hover:text-ink disabled:opacity-60"
            >
              <Power className="size-3.5" /> {p.activa ? "Pausar" : "Activar"}
            </button>
            <button
              onClick={borrar}
              disabled={pending}
              className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2 text-xs text-danger hover:opacity-80 disabled:opacity-60"
            >
              <Trash2 className="size-3.5" /> Borrar
            </button>
          </div>
        </>
      )}

      {msg && <p className="mt-2 text-xs text-danger">{msg}</p>}
    </li>
  );
}
