/** Skeleton de /panel/mensajes — respuesta inmediata al tap. */
export default function LoadingPanelMensajes() {
  return (
    <div className="space-y-8">
      <span className="sr-only">Cargando mensajes…</span>

      <div
        aria-hidden
        className="space-y-8 motion-safe:animate-pulse motion-reduce:animate-none"
      >
        {/* Cabecera */}
        <div className="h-8 w-36 rounded bg-paper-2" />

        {/* Card Nuevo mensaje */}
        <div className="card-cut card-cut-lg border border-rule bg-paper-2 p-5 space-y-4">
          <div className="h-6 w-36 rounded bg-paper" />
          <div className="h-10 w-full rounded border border-rule bg-paper" />
          <div className="h-24 w-full rounded border border-rule bg-paper" />
          <div className="flex justify-between items-center">
            <div className="h-5 w-32 rounded bg-rule/60" />
            <div className="h-10 w-28 rounded bg-rule/70" />
          </div>
        </div>

        {/* Enviados */}
        <div className="space-y-3">
          <div className="h-6 w-28 rounded bg-paper-2" />
          <div className="card-cut overflow-hidden border border-rule divide-y divide-rule bg-paper-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="p-4 space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 w-48 rounded bg-paper" />
                  <div className="h-3 w-20 rounded bg-rule/60" />
                </div>
                <div className="h-4 w-full rounded bg-paper" />
                <div className="h-3 w-32 rounded bg-rule/60" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
