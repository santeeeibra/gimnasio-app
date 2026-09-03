/** Skeleton de /mi/rutina — se pinta al instante al tocar la pestaña, mientras
 *  el RSC resuelve las queries. Sólo estructura, sin datos. */
export default function LoadingRutina() {
  return (
    <main className="max-w-md mx-auto px-5 py-6 space-y-6">
      <span className="sr-only">Cargando tu rutina…</span>

      <div
        aria-hidden
        className="space-y-6 motion-safe:animate-pulse motion-reduce:animate-none"
      >
        {/* volver + encabezado */}
        <div className="space-y-3">
          <div className="h-4 w-16 rounded bg-rule/70" />
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="h-7 w-40 rounded bg-paper-2" />
              <div className="h-4 w-52 rounded bg-rule/60" />
            </div>
            <div className="h-9 w-36 shrink-0 rounded-lg border border-rule bg-paper-2" />
          </div>
        </div>

        {/* banner motivacional */}
        <div className="h-14 rounded-[6px] border border-rule bg-paper-2" />

        {/* chips de entrada (armar a mano / avanzado) */}
        <div className="space-y-3">
          <div className="h-10 w-72 max-w-full rounded-lg border border-rule bg-paper-2" />
          <div className="h-10 w-60 max-w-full rounded-lg border border-rule bg-paper-2" />
        </div>

        {/* tabs Día 1/2/3 */}
        <div className="flex gap-2">
          <div className="h-10 flex-1 rounded-lg border border-rule bg-paper-2" />
          <div className="h-10 flex-1 rounded-lg border border-rule" />
          <div className="h-10 flex-1 rounded-lg border border-rule" />
        </div>

        {/* encabezado del día */}
        <div className="space-y-2">
          <div className="h-6 w-36 rounded bg-paper-2" />
          <div className="h-4 w-44 rounded bg-rule/60" />
          <div className="flex gap-1.5 pt-1">
            <div className="h-5 w-16 rounded-full border border-rule" />
            <div className="h-5 w-16 rounded-full border border-rule" />
            <div className="h-5 w-16 rounded-full border border-rule" />
          </div>
        </div>

        {/* filas de ejercicios */}
        <ul className="card-cut overflow-hidden border border-rule divide-y divide-rule bg-paper-2">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="flex items-start gap-3 p-4">
              <div className="size-[72px] shrink-0 rounded-[8px] border border-rule bg-paper" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-2/3 rounded bg-paper" />
                <div className="h-3 w-20 rounded bg-rule/60" />
                <div className="flex gap-1.5 pt-1">
                  <div className="h-5 w-16 rounded-full border border-rule" />
                  <div className="h-5 w-16 rounded-full border border-rule" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
