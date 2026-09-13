"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Send, MessageCircle } from "lucide-react";
import { useHapticos } from "@/lib/ui/hapticos";
import {
  listarMensajesPartnerAction,
  enviarMensajePartnerAction,
  marcarMensajesPartnerLeidosAction,
  type PartnerMensaje,
} from "./mensajes-actions";

export function MensajesPartner() {
  const hapticos = useHapticos();
  const [mensajes, setMensajes] = useState<PartnerMensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const finRef = useRef<HTMLDivElement>(null);

  const cargar = async () => {
    const data = await listarMensajesPartnerAction();
    setMensajes(data);
  };

  useEffect(() => {
    cargar();
    marcarMensajesPartnerLeidosAction();
  }, []);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes.length]);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    const cuerpo = texto.trim();
    if (!cuerpo) return;
    hapticos.suave();
    start(async () => {
      setError(null);
      const res = await enviarMensajePartnerAction(cuerpo);
      if (res.error) {
        setError(res.error);
        hapticos.error();
        return;
      }
      setTexto("");
      hapticos.exito();
      await cargar();
    });
  };

  return (
    <div className="rounded-[22px] border border-rule bg-paper p-5 space-y-3 shadow-sm">
      <div className="flex items-center gap-2 border-b border-rule pb-3">
        <MessageCircle className="size-4 text-accent" />
        <h3 className="text-sm font-bold text-ink">Consultas con Santi</h3>
      </div>

      <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
        {mensajes.length === 0 ? (
          <p className="text-xs text-ink-soft text-center py-6">
            Sin mensajes todavía. Escribí tu consulta acá abajo.
          </p>
        ) : (
          mensajes.map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-[14px] px-3 py-2 text-xs leading-relaxed ${
                m.autor === "partner"
                  ? "ml-auto bg-accent/15 text-ink"
                  : "mr-auto bg-paper-2 border border-rule text-ink"
              }`}
            >
              <p>{m.cuerpo}</p>
              <span className="block mt-1 text-[10px] text-ink-soft">
                {new Date(m.creado_at).toLocaleString("es-AR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
            </div>
          ))
        )}
        <div ref={finRef} />
      </div>

      <form onSubmit={enviar} className="flex items-center gap-2 pt-2 border-t border-rule">
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escribí tu consulta..."
          disabled={pending}
          className="flex-1 rounded-[10px] border border-rule bg-paper px-3 py-2 text-xs text-ink focus:border-ink focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending || !texto.trim()}
          className="shrink-0 size-9 inline-flex items-center justify-center rounded-[10px] bg-accent text-accent-contrast disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
      {error ? <p className="text-[11px] text-danger">{error}</p> : null}
    </div>
  );
}
