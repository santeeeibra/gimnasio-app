import { impersonacionActiva } from "@/lib/impersonation";
import { salirImpersonacionAction } from "@/app/admin/impersonar-actions";

// Barra fija visible mientras el superadmin ve la app como otra persona.
// "Volver a soporte" restaura la sesión del superadmin y vuelve a /admin.
export async function ImpersonationBanner() {
  const imp = await impersonacionActiva();
  if (!imp) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-ink px-4 pb-2 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] text-[13px] text-paper">
      <span className="min-w-0 truncate">
        Viendo como <strong>{imp.nombre}</strong>{" "}
        {imp.rol === "dueno" ? "(dueño)" : "(socio)"} · {imp.gym}
      </span>
      <form action={salirImpersonacionAction}>
        <button
          type="submit"
          className="shrink-0 rounded-[4px] border border-paper/40 px-2.5 py-1 hover:bg-paper hover:text-ink"
        >
          Volver a soporte
        </button>
      </form>
    </div>
  );
}
