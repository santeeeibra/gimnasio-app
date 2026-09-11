"use client";

import { useActionState, useState } from "react";
import { eliminarGimnasioDefinitivamente } from "../../actions";
import { Button } from "@/components/ui";
import { hapticoImpactoMedio, hapticoError } from "@/lib/ui/hapticos";

export function BorrarGimnasioForm({
  gimnasioId,
  gimnasioNombre,
  gimnasioSlug,
}: {
  gimnasioId: string;
  gimnasioNombre: string;
  gimnasioSlug: string;
}) {
  const [state, formAction, pending] = useActionState(
    eliminarGimnasioDefinitivamente,
    null,
  );
  const [confirmar, setConfirmar] = useState("");
  const listo = confirmar.trim() === gimnasioSlug;

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const ok = window.confirm(
          `Vas a borrar DEFINITIVAMENTE "${gimnasioNombre || gimnasioSlug}".\n\n` +
            "Esto elimina el gimnasio, todos sus socios, planes, pagos, rutinas " +
            "y las cuentas de acceso (dueño y socios). No se puede deshacer.",
        );
        if (!ok) {
          e.preventDefault();
          hapticoError();
          return;
        }
        hapticoImpactoMedio();
      }}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="gimnasio_id" value={gimnasioId} />
      <label className="text-xs text-ink-soft">
        Para confirmar, escribí el slug exacto:{" "}
        <code className="text-ink">{gimnasioSlug}</code>
      </label>
      <input
        type="text"
        name="confirmar_slug"
        value={confirmar}
        onChange={(e) => setConfirmar(e.target.value)}
        placeholder={gimnasioSlug}
        autoComplete="off"
        className="h-10 rounded-[5px] border border-rule bg-paper px-3 text-[15px] outline-none focus:border-danger"
      />
      <Button
        type="submit"
        variant="danger"
        disabled={!listo || pending}
        loading={pending}
      >
        {pending ? "Borrando…" : "Borrar definitivamente"}
      </Button>
      {state?.msg ? (
        <span className={`text-sm ${state.ok ? "text-ok" : "text-danger"}`}>
          {state.msg}
        </span>
      ) : null}
    </form>
  );
}
