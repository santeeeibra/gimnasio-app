"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { hapticoImpactoMedio } from "@/lib/ui/hapticos";

export function VincularGmail() {
  const searchParams = useSearchParams();
  const linkedOk = searchParams.get("linked") === "google";
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVincular = async () => {
    hapticoImpactoMedio();
    setCargando(true);
    setError(null);
    const supabase = createClient();
    const { error: linkError } = await supabase.auth.linkIdentity({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/admin?linked=google` },
    });
    if (linkError) {
      setError(linkError.message);
      setCargando(false);
    }
    // Si no hay error, Supabase ya redirigió a Google.
  };

  return (
    <div className="card-cut rounded-[18px] border border-rule/80 bg-paper-2/90 p-5 shadow-sm backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-[10px] bg-paper border border-rule">
            <Mail className="size-4.5 text-ink-soft" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-ink">
              Vincular tu Gmail personal
            </h2>
            <p className="text-xs text-ink-soft mt-0.5">
              Vinculá tu Gmail a esta cuenta superadmin para poder entrar también con &quot;Ingresar con Google&quot;.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleVincular}
          disabled={cargando}
          className="inline-flex items-center gap-1.5 rounded-[12px] bg-ink px-3.5 py-2 text-xs font-semibold text-paper shadow-sm hover:brightness-125 active:scale-95 transition-all disabled:opacity-60"
        >
          {cargando ? "Redirigiendo…" : "Vincular tu Gmail"}
        </button>
      </div>

      {linkedOk ? (
        <div className="mt-4 flex items-center gap-2 rounded-[10px] border border-ok/30 bg-ok/15 px-3.5 py-2 text-xs font-medium text-ok">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>Tu Gmail quedó vinculado. Ya podés entrar con Google.</span>
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 flex items-center gap-2 rounded-[10px] border border-danger/30 bg-danger/15 px-3.5 py-2 text-xs font-medium text-danger">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  );
}
