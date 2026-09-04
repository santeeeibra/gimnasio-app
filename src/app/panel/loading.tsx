/** Skeleton del panel / resumen — se muestra al instante al tocar la pestaña o navegar. */
export default function LoadingPanel() {
  return (
    <div className="space-y-8">
      <span className="sr-only">Cargando resumen…</span>

      <div
        aria-hidden
        className="space-y-6 motion-safe:animate-pulse motion-reduce:animate-none"
      >
        {/* Hero métrica principal */}
        <div className="card-cut card-cut-lg border border-rule bg-paper-2 p-6">
          <div className="h-3 w-28 rounded bg-rule/70 mb-3" />
          <div className="flex items-baseline gap-3">
            <div className="h-12 w-20 rounded bg-paper" />
            <div className="h-5 w-44 rounded bg-rule/60" />
          </div>
          <div className="mt-4 flex gap-2">
            <div className="h-8 w-24 rounded bg-paper" />
            <div className="h-8 w-28 rounded bg-paper" />
          </div>
        </div>

        {/* Sección de atención / cuotas */}
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <div className="h-6 w-36 rounded bg-paper-2" />
            <div className="h-4 w-20 rounded bg-rule/60" />
          </div>

          <div className="card-cut overflow-hidden border border-rule divide-y divide-rule bg-paper-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4">
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="h-4 w-40 rounded bg-paper" />
                  <div className="h-3 w-28 rounded bg-rule/60" />
                </div>
                <div className="h-6 w-20 rounded bg-rule/60 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
