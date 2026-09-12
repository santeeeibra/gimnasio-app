"use client";

import { useState, useTransition } from "react";
import { FileText, Trash2, ExternalLink } from "lucide-react";
import { Spinner } from "@/components/ui";
import { borrarArchivoCliente, type ArchivoCliente } from "@/lib/storage/b2";
import { hapticoImpactoSuave, hapticoError } from "@/lib/ui/hapticos";

const TIPO_LABEL: Record<string, string> = {
  logo: "Logo",
  foto_perfil: "Foto de perfil",
  checkin_fondo: "Fondo de check-in",
  apto_medico: "Apto Médico",
  dieta: "Dieta / Nutrición",
  otro: "Otro Documento",
};

export function ArchivosLista({
  archivos,
  puedeBorrar = false,
  onArchivoBorrado,
}: {
  archivos: ArchivoCliente[];
  puedeBorrar?: boolean;
  onArchivoBorrado?: (id: string) => void;
}) {
  const [borrandoId, setBorrandoId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleBorrar = (id: string) => {
    hapticoImpactoSuave();
    setBorrandoId(id);
    startTransition(async () => {
      const res = await borrarArchivoCliente(id);
      setBorrandoId(null);
      if (res.error) {
        hapticoError();
        return;
      }
      onArchivoBorrado?.(id);
    });
  };

  if (archivos.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-ink-soft bg-surface-dark/40 rounded-[10px] border border-rule/50">
        Todavía no hay archivos subidos.
      </div>
    );
  }

  return (
    <ul className="border border-rule rounded-[12px] divide-y divide-rule overflow-hidden bg-surface">
      {archivos.map((a) => (
        <li key={a.id} className="px-4 py-3 flex items-center justify-between gap-3">
          <a
            href={a.url_archivo}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 overflow-hidden group min-w-0"
          >
            <FileText className="size-5 text-brand shrink-0" />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink truncate group-hover:underline">
                {a.nombre_archivo}
              </span>
              <span className="block text-xs text-ink-soft">
                {TIPO_LABEL[a.tipo_archivo] ?? a.tipo_archivo} ·{" "}
                {new Date(a.created_at).toLocaleDateString("es-AR")}
              </span>
            </span>
            <ExternalLink className="size-3.5 text-ink-soft shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>

          {puedeBorrar && (
            <button
              type="button"
              onClick={() => handleBorrar(a.id)}
              disabled={isPending && borrandoId === a.id}
              className="p-2 rounded-full text-ink-soft hover:text-danger hover:bg-danger/10 transition-colors shrink-0"
              aria-label="Borrar archivo"
            >
              {isPending && borrandoId === a.id ? (
                <Spinner className="size-4" />
              ) : (
                <Trash2 className="size-4" />
              )}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
