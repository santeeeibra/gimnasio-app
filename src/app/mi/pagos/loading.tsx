/** Skeleton de /mi/pagos — respuesta inmediata al tap en Ver mis pagos. */
export default function LoadingMisPagos() {
  return (
    <main className="max-w-md mx-auto p-5 pb-24 space-y-6">
      <span className="sr-only">Cargando tus pagos…</span>

      <div
        aria-hidden
        className="space-y-6 motion-safe:animate-pulse motion-reduce:animate-none"
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between gap-3">
          <div className="h-8 w-32 rounded bg-paper-2" />
          <div className="h-8 w-20 rounded-full bg-rule/70" />
        </div>

        {/* Card Estado de cuota */}
        <div className="rounded-[14px] border border-rule bg-paper-2 p-5 space-y-3 shadow-sm">
          <div className="h-3 w-36 rounded bg-rule/60" />
          <div className="h-7 w-48 rounded bg-paper" />
          <div className="h-4 w-32 rounded bg-rule/60" />
        </div>

        {/* Historial de pagos */}
        <div className="space-y-3">
          <div className="h-4 w-28 rounded bg-rule/70" />
          <div className="card-cut overflow-hidden border border-rule divide-y divide-rule bg-paper-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between p-4">
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="h-4 w-24 rounded bg-paper" />
                  <div className="h-3 w-36 rounded bg-rule/60" />
                </div>
                <div className="h-5 w-20 rounded bg-rule/70 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
