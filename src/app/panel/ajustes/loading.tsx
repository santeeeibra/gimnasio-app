/** Skeleton de /panel/ajustes — respuesta inmediata al tap. */
export default function LoadingAjustes() {
  return (
    <div className="space-y-8">
      <span className="sr-only">Cargando ajustes…</span>

      <div
        aria-hidden
        className="space-y-8 motion-safe:animate-pulse motion-reduce:animate-none"
      >
        {/* Cabecera */}
        <div className="h-8 w-32 rounded bg-paper-2" />

        {/* Sección Datos del Gimnasio */}
        <div className="card-cut card-cut-lg border border-rule bg-paper-2 p-5 space-y-4">
          <div className="h-6 w-44 rounded bg-paper" />
          <div className="space-y-3">
            <div className="h-10 w-full rounded border border-rule bg-paper" />
            <div className="h-10 w-full rounded border border-rule bg-paper" />
          </div>
          <div className="h-10 w-32 rounded bg-rule/70" />
        </div>

        {/* Sección Datos de Transferencia */}
        <div className="card-cut card-cut-lg border border-rule bg-paper-2 p-5 space-y-4">
          <div className="h-6 w-48 rounded bg-paper" />
          <div className="space-y-3">
            <div className="h-10 w-full rounded border border-rule bg-paper" />
            <div className="h-10 w-full rounded border border-rule bg-paper" />
          </div>
          <div className="h-10 w-32 rounded bg-rule/70" />
        </div>
      </div>
    </div>
  );
}
