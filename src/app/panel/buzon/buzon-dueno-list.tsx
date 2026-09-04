"use client";

import { useState, useTransition, useActionState } from "react";
import { Button } from "@/components/ui";
import {
  responderComentario,
  marcarResuelto,
  borrarComentario,
  type BuzonState,
} from "./actions";

const CATEGORIA_LABEL: Record<string, string> = {
  equipo: "Equipo roto",
  limpieza: "Limpieza",
  sugerencia: "Sugerencia",
  otro: "Otro",
};

type Comentario = {
  id: string;
  categoria: string;
  texto: string;
  estado: string;
  respuesta: string | null;
  respondido_at: string | null;
  creado_at: string;
};

// ─── Formulario de respuesta inline ───────────────────────────────────────────

const inicialResp: BuzonState = {};

function RespuestaForm({ comentarioId }: { comentarioId: string }) {
  const [state, action, pending] = useActionState(responderComentario, inicialResp);
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="text-sm text-ink-soft underline decoration-rule underline-offset-[3px] hover:text-ink transition-colors duration-150"
      >
        Responder
      </button>
    );
  }

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="comentario_id" value={comentarioId} />
      <textarea
        name="respuesta"
        required
        maxLength={500}
        rows={3}
        placeholder="Escribí tu respuesta…"
        className="w-full px-3 py-2 rounded-[5px] border border-rule bg-paper text-[15px] outline-none resize-none transition-[border-color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] focus:border-ink focus:shadow-[0_0_0_3px_rgb(22_24_29_/_0.08)]"
      />
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
      <div className="flex gap-2">
        <Button type="submit" loading={pending} className="h-9 text-xs px-3">
          Enviar respuesta
        </Button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="h-9 px-3 text-xs text-ink-soft border border-rule rounded-[5px] hover:bg-paper-2 transition-colors duration-150"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ─── Fila de un comentario ────────────────────────────────────────────────────

function ComentarioRow({ c }: { c: Comentario }) {
  const [isPending, startTransition] = useTransition();

  function handleMarcarResuelto() {
    startTransition(async () => {
      await marcarResuelto(c.id);
    });
  }

  function handleBorrar() {
    if (!window.confirm("¿Borrar este comentario? Esta acción no se puede deshacer.")) return;
    startTransition(async () => {
      await borrarComentario(c.id);
    });
  }

  return (
    <li className="px-4 py-4 space-y-3">
      {/* Cabecera: categoría + fecha + estado */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <span className="block text-[11px] uppercase tracking-[0.06em] text-ink-soft">
            {CATEGORIA_LABEL[c.categoria] ?? c.categoria}
          </span>
          <span className="block text-xs text-ink-soft">
            {new Date(c.creado_at).toLocaleDateString("es-AR", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
        <span
          className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full ${
            c.estado === "resuelto"
              ? "bg-ok/15 text-ok"
              : "bg-warn/15 text-warn"
          }`}
        >
          {c.estado === "resuelto" ? "Resuelto" : "Pendiente"}
        </span>
      </div>

      {/* Texto del comentario — sin datos de identidad */}
      <p className="text-sm">{c.texto}</p>

      {/* Respuesta existente */}
      {c.respuesta && (
        <div className="rounded-[5px] border border-rule bg-paper px-3 py-2.5 space-y-1">
          <p className="text-[11px] uppercase tracking-[0.06em] text-ink-soft">
            Tu respuesta
          </p>
          <p className="text-sm">{c.respuesta}</p>
        </div>
      )}

      {/* Acciones */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        {!c.respuesta && <RespuestaForm comentarioId={c.id} />}

        {c.estado !== "resuelto" && (
          <button
            onClick={handleMarcarResuelto}
            disabled={isPending}
            className="text-sm text-ink-soft underline decoration-rule underline-offset-[3px] hover:text-ink transition-colors duration-150 disabled:opacity-50"
          >
            Marcar resuelto
          </button>
        )}

        <button
          onClick={handleBorrar}
          disabled={isPending}
          className="text-sm text-danger underline decoration-danger/40 underline-offset-[3px] hover:decoration-danger transition-colors duration-150 disabled:opacity-50"
        >
          Borrar
        </button>
      </div>
    </li>
  );
}

// ─── Lista con filtro ─────────────────────────────────────────────────────────

export function BuzonDuenoList({ comentarios }: { comentarios: Comentario[] }) {
  const [filtro, setFiltro] = useState<"todos" | "pendiente" | "resuelto">("todos");

  const filtrados =
    filtro === "todos"
      ? comentarios
      : comentarios.filter((c) => c.estado === filtro);

  const pendientes = comentarios.filter((c) => c.estado === "pendiente").length;

  return (
    <div className="space-y-4">
      {/* Filtro rápido */}
      <div className="flex gap-2">
        {(["todos", "pendiente", "resuelto"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`h-9 px-3 text-sm rounded-[5px] border transition-colors duration-150 [transition-timing-function:var(--ease-out)] ${
              filtro === f
                ? "border-ink bg-ink text-paper"
                : "border-rule bg-paper-2 text-ink-soft hover:bg-paper hover:text-ink"
            }`}
          >
            {f === "todos"
              ? "Todos"
              : f === "pendiente"
                ? `Pendientes${pendientes > 0 ? ` (${pendientes})` : ""}`
                : "Resueltos"}
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <div className="card-cut border border-rule bg-paper-2 px-5 py-9 text-center">
          <span aria-hidden className="mx-auto mb-3 block size-2 rounded-full bg-volt" />
          <p className="font-display text-xl">
            {filtro === "pendiente" ? "Todo al día" : "Sin comentarios"}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {filtro === "pendiente"
              ? "No hay comentarios pendientes."
              : filtro === "resuelto"
                ? "No hay comentarios resueltos."
                : "Todavía no llegaron comentarios."}
          </p>
        </div>
      ) : (
        <ul className="card-cut overflow-hidden border border-rule bg-paper-2 divide-y divide-rule">
          {filtrados.map((c) => (
            <ComentarioRow key={c.id} c={c} />
          ))}
        </ul>
      )}
    </div>
  );
}
