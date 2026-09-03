/** Skeleton del home de cliente — se pinta al instante mientras el RSC
 *  resuelve gimnasio + cliente + no leídos. */
export default function LoadingMi() {
  return (
    <main className="max-w-md mx-auto min-h-full p-6 pb-24 space-y-6">
      <span className="sr-only">Cargando…</span>

      <div
        aria-hidden
        className="space-y-6 motion-safe:animate-pulse motion-reduce:animate-none"
      >
        {/* encabezado */}
        <div className="flex items-baseline justify-between">
          <div className="h-7 w-40 rounded bg-paper-2" />
          <div className="h-4 w-16 rounded bg-rule/70" />
        </div>

        {/* card "Tu cuota" con anillo */}
        <div className="card-cut card-cut-lg border border-rule border-l-2 bg-paper-2 p-5">
          <div className="mb-4 h-3 w-16 rounded bg-rule/60" />
          <div className="flex items-center gap-6">
            <div className="size-[120px] shrink-0 rounded-full border-[8px] border-rule/60" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-6 w-28 rounded bg-paper" />
              <div className="h-4 w-40 rounded bg-rule/60" />
            </div>
          </div>
        </div>

        {/* lista de accesos */}
        <ul className="card-cut overflow-hidden border border-rule divide-y divide-rule bg-paper-2">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-4">
              <div className="size-[18px] shrink-0 rounded bg-rule/60" />
              <div className="h-4 w-40 rounded bg-paper" />
              <div className="ml-auto h-4 w-3 rounded bg-rule/60" />
            </li>
          ))}
        </ul>

        {/* CTA notificaciones */}
        <div className="h-16 rounded-[6px] border border-rule bg-paper-2" />
      </div>
    </main>
  );
}
