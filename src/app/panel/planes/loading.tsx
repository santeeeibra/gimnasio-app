/** Skeleton de /panel/planes — respuesta inmediata al tap en Planes. */
export default function LoadingPlanes() {
  return (
    <div className="space-y-8">
      <span className="sr-only">Cargando planes…</span>

      <div
        aria-hidden
        className="space-y-8 motion-safe:animate-pulse motion-reduce:animate-none"
      >
        {/* Cabecera */}
        <div className="space-y-1">
          <div className="h-8 w-44 rounded bg-paper-2" />
          <div className="h-4 w-72 rounded bg-rule/60" />
        </div>

        {/* Card Nuevo plan */}
        <div className="card-cut card-cut-lg border border-rule bg-paper-2 p-5 space-y-4">
          <div className="h-6 w-32 rounded bg-paper" />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="h-10 rounded border border-rule bg-paper" />
            <div className="h-10 rounded border border-rule bg-paper" />
            <div className="h-10 rounded border border-rule bg-paper" />
          </div>
          <div className="h-10 w-28 rounded bg-rule/70" />
        </div>

        {/* Listado de planes */}
        <div className="card-cut overflow-hidden border border-rule divide-y divide-rule bg-paper-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div className="space-y-2 min-w-0 flex-1">
                <div className="h-4 w-36 rounded bg-paper" />
                <div className="h-3 w-20 rounded bg-rule/60" />
              </div>
              <div className="h-6 w-16 rounded bg-rule/70 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
