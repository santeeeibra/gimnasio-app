/** Skeleton de /panel/ingresos — respuesta inmediata al tap. */
export default function LoadingIngresos() {
  return (
    <div className="space-y-8">
      <span className="sr-only">Cargando ingresos…</span>

      <div
        aria-hidden
        className="space-y-8 motion-safe:animate-pulse motion-reduce:animate-none"
      >
        {/* Cabecera */}
        <div className="h-8 w-32 rounded bg-paper-2" />

        {/* Métricas de ingresos */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="card-cut border border-rule bg-paper-2 p-5 space-y-3"
            >
              <div className="h-3 w-24 rounded bg-rule/60" />
              <div className="h-8 w-32 rounded bg-paper" />
              <div className="h-3 w-20 rounded bg-rule/50" />
            </div>
          ))}
        </div>

        {/* Listado de ingresos / transacciones */}
        <div className="space-y-3">
          <div className="h-6 w-36 rounded bg-paper-2" />
          <div className="card-cut overflow-hidden border border-rule divide-y divide-rule bg-paper-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4">
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="h-4 w-40 rounded bg-paper" />
                  <div className="h-3 w-28 rounded bg-rule/60" />
                </div>
                <div className="h-6 w-24 rounded bg-paper shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
