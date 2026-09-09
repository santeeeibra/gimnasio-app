"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LogIn, TriangleAlert, StickyNote, Search } from "lucide-react";
import { entrarComoAction } from "../impersonar-actions";
import { BotonResetClave } from "../boton-reset-clave";
import { hapticoImpactoMedio, hapticoSeleccion } from "@/lib/ui/hapticos";

export type FilaGym = {
  id: string;
  nombre: string;
  slug: string;
  estado: string;
  nivel: "verde" | "amarillo" | "rojo";
  nErrores: number;
  socios: number;
  vencidos: number;
  venceEl: string | null;
  duenoId: string | null;
  duenoNombre: string | null;
  tieneNota: boolean;
};

const SEMAFORO_COLOR: Record<FilaGym["nivel"], string> = {
  verde: "bg-ok",
  amarillo: "bg-warn",
  rojo: "bg-danger",
};
const SEMAFORO_TITULO: Record<FilaGym["nivel"], string> = {
  verde: "Sin errores en las últimas 24 h",
  amarillo: "1 o 2 errores en las últimas 24 h",
  rojo: "3 o más errores en las últimas 24 h",
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

function vencChip(venceEl: string | null) {
  if (!venceEl) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const v = new Date(venceEl);
  v.setHours(0, 0, 0, 0);
  if (Number.isNaN(v.getTime())) return null;
  const dias = Math.round((v.getTime() - hoy.getTime()) / 86_400_000);
  const cls =
    dias < 0
      ? "border-danger/40 bg-danger/12 text-danger"
      : dias <= 7
        ? "border-warn/50 bg-warn/12 text-warn"
        : "border-ok/40 bg-ok/12 text-ok";
  const txt =
    dias < 0
      ? `venció hace ${Math.abs(dias)} d`
      : dias === 0
        ? "vence hoy"
        : `vence en ${dias} d`;
  return { cls, txt };
}

export function ListaGimnasios({ filas }: { filas: FilaGym[] }) {
  const [q, setQ] = useState("");

  const filtradas = useMemo(() => {
    const f = norm(q.trim());
    if (!f) return filas;
    return filas.filter((g) =>
      norm(`${g.nombre} ${g.slug} ${g.estado}`).includes(f),
    );
  }, [q, filas]);

  return (
    <div>
      <label className="relative mb-3 block">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft"
          aria-hidden
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
          inputMode="search"
          placeholder="Buscar por nombre, slug o estado…"
          className="h-11 w-full rounded-[10px] border border-rule bg-paper-2 pl-9 pr-3 text-[15px] outline-none focus:border-ink"
        />
      </label>

      {filtradas.length === 0 ? (
        <p className="text-sm text-ink-soft">
          {filas.length === 0
            ? "No hay gimnasios."
            : "Ningún gimnasio coincide con la búsqueda."}
        </p>
      ) : (
        <ul className="card-cut divide-y divide-rule overflow-hidden border border-rule bg-paper-2">
          {filtradas.map((g) => {
            const chip = vencChip(g.venceEl);
            return (
              <li
                key={g.id}
                className="flex items-center gap-2 px-3 py-3 sm:px-5 sm:py-4"
              >
                <Link
                  href={`/admin/gimnasios/${g.id}`}
                  className="-my-3 flex min-w-0 flex-1 items-center gap-3 py-3 hover:opacity-80"
                >
                  <span
                    className={`size-2.5 shrink-0 rounded-full ${SEMAFORO_COLOR[g.nivel]}`}
                    title={SEMAFORO_TITULO[g.nivel]}
                    aria-label={SEMAFORO_TITULO[g.nivel]}
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-base">
                        {g.nombre || "(sin nombre)"}
                      </span>
                      {g.tieneNota ? (
                        <StickyNote
                          className="size-3.5 shrink-0 text-ink-soft"
                          aria-label="Tiene nota interna"
                        />
                      ) : null}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
                      <span className="truncate">
                        {g.slug || "—"} · {g.estado || "—"} · {g.socios} socios ·{" "}
                        {g.vencidos} vencidos
                      </span>
                      {chip ? (
                        <span
                          className={`inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[11px] font-medium ${chip.cls}`}
                        >
                          {chip.txt}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </Link>

                <div className="flex shrink-0 items-center gap-1">
                  {g.duenoId ? (
                    <form action={entrarComoAction}>
                      <input
                        type="hidden"
                        name="profile_id"
                        value={g.duenoId}
                      />
                      <button
                        type="submit"
                        onClick={() => hapticoImpactoMedio()}
                        title={`Entrar como ${g.duenoNombre ?? "el dueño"}`}
                        aria-label="Entrar como dueño"
                        className="inline-flex size-9 items-center justify-center rounded-[9px] border border-rule bg-paper text-ink-soft transition-colors hover:border-ink hover:text-ink active:scale-95"
                      >
                        <LogIn className="size-4" />
                      </button>
                    </form>
                  ) : null}

                  {g.duenoId ? (
                    <BotonResetClave
                      profileId={g.duenoId}
                      nombre={g.duenoNombre}
                      rol="dueno"
                      compacto
                    />
                  ) : null}

                  <Link
                    href={`/admin/errores?gimnasio_id=${g.id}`}
                    onClick={() => hapticoSeleccion()}
                    title="Ver errores de este gimnasio"
                    aria-label="Ver errores"
                    className="inline-flex size-9 items-center justify-center rounded-[9px] border border-rule bg-paper text-ink-soft transition-colors hover:border-ink hover:text-ink active:scale-95"
                  >
                    <TriangleAlert className="size-4" />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
