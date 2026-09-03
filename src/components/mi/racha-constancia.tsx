/**
 * RachaConstancia — mini-calendario de asistencia de las últimas 4 semanas.
 * Una barra por ventana de 2 días: alta si hubo al menos un ingreso, baja si no.
 * Ambiental y dentro de REGLAS_UI_EMIL.md §17: sin color ni fuente nueva
 * (usa `--volt` / `--rule` y `--font-hero` para el número). Las barras crecen
 * desde la base al montar (`.animate-bar-grow`, escalonadas); con
 * `prefers-reduced-motion` quedan en su altura final.
 *
 * Se muestra solo si hay al menos una visita registrada (ver `mi/page.tsx`),
 * así que también cubre el caso de que `registros_entrada` no exista todavía.
 */

export function RachaConstancia({
  dias,
  total,
}: {
  dias: boolean[];
  total: number;
}) {
  return (
    <div className="card-cut border border-rule bg-paper-2 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">
          Tu constancia
        </p>
        <p className="shrink-0 text-xs text-ink-soft">
          <span
            className="font-[700] text-ink"
            style={{ fontFamily: "var(--font-hero)" }}
          >
            {total}
          </span>{" "}
          {total === 1 ? "visita" : "visitas"} · 30 días
        </p>
      </div>
      <div className="mt-2.5 flex h-9 items-end gap-1" aria-hidden>
        {dias.map((hit, i) => (
          <span
            key={i}
            className={`animate-bar-grow flex-1 rounded-t-[2px] ${
              hit ? "bg-volt" : "bg-rule"
            }`}
            style={{
              height: hit ? "100%" : "34%",
              animationDelay: `${i * 32}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
