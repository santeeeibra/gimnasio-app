/** Skeleton de la bandeja de mensajes del cliente. */
export default function LoadingMensajes() {
  return (
    <main className="max-w-md mx-auto min-h-full p-6 pb-24 space-y-6">
      <span className="sr-only">Cargando mensajes…</span>

      <div
        aria-hidden
        className="space-y-6 motion-safe:animate-pulse motion-reduce:animate-none"
      >
        <div className="flex items-baseline justify-between">
          <div className="h-7 w-32 rounded bg-paper-2" />
          <div className="h-4 w-16 rounded bg-rule/70" />
        </div>

        <ul className="card-cut overflow-hidden border border-rule divide-y divide-rule bg-paper-2">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="space-y-2 px-4 py-4">
              <div className="h-4 w-full rounded bg-paper" />
              <div className="h-4 w-4/5 rounded bg-paper" />
              <div className="h-3 w-32 rounded bg-rule/60" />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
