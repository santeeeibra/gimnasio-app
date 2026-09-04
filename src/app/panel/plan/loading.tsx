/** Skeleton de /panel/plan — respuesta inmediata al tap. */
export default function LoadingPanelPlan() {
  return (
    <div className="space-y-8">
      <span className="sr-only">Cargando detalles de tu plan…</span>

      <div
        aria-hidden
        className="space-y-8 motion-safe:animate-pulse motion-reduce:animate-none"
      >
        {/* Cabecera */}
        <div className="space-y-2">
          <div className="h-4 w-16 rounded bg-rule/70" />
          <div className="h-8 w-60 rounded bg-paper-2" />
        </div>

        {/* Estado actual del plan */}
        <div className="card-cut card-cut-lg border border-rule bg-paper-2 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-3 w-28 rounded bg-rule/60" />
              <div className="h-7 w-40 rounded bg-paper" />
            </div>
            <div className="h-6 w-24 rounded-full bg-rule/70" />
          </div>
          <div className="h-2 w-full rounded bg-paper overflow-hidden" />
          <div className="flex justify-between">
            <div className="h-4 w-32 rounded bg-rule/60" />
            <div className="h-4 w-28 rounded bg-rule/60" />
          </div>
        </div>

        {/* Catálogo de planes */}
        <div className="space-y-4">
          <div className="h-6 w-44 rounded bg-paper-2" />
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="card-cut border border-rule bg-paper-2 p-5 space-y-4"
              >
                <div className="h-5 w-24 rounded bg-paper" />
                <div className="h-8 w-32 rounded bg-paper" />
                <div className="space-y-2">
                  <div className="h-3 w-full rounded bg-rule/60" />
                  <div className="h-3 w-4/5 rounded bg-rule/60" />
                </div>
                <div className="h-10 w-full rounded bg-rule/70" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
