/** Skeleton de /mi/ajustes — respuesta inmediata al tap en Personalizar color. */
export default function LoadingMiAjustes() {
  return (
    <main className="max-w-md mx-auto min-h-full p-6 pb-24 space-y-6">
      <span className="sr-only">Cargando personalización…</span>

      <div
        aria-hidden
        className="space-y-6 motion-safe:animate-pulse motion-reduce:animate-none"
      >
        <div className="space-y-2">
          <div className="h-4 w-24 rounded bg-rule/70" />
          <div className="h-7 w-48 rounded bg-paper-2" />
          <div className="h-4 w-full rounded bg-rule/60" />
        </div>

        <div className="card-cut card-cut-lg border border-rule bg-paper-2 p-5 space-y-4">
          <div className="h-5 w-32 rounded bg-paper" />
          <div className="grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-lg border border-rule bg-paper" />
            ))}
          </div>
          <div className="h-10 w-full rounded bg-rule/70" />
        </div>
      </div>
    </main>
  );
}
