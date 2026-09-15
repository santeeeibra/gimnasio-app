"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { comprimirImagen } from "@/lib/img/comprimir";
import { Button, Spinner, linkClasses, pillClasses } from "@/components/ui";
import type { SocioImportarItem, ResultadoImportarItem } from "./actions";

type PlanGym = {
  id: string;
  nombre: string;
};

type SocioPreview = {
  index: number;
  nombre: string;
  dni: string;
  telefono: string | null;
  email: string | null;
  planOriginal: string | null;
  planId: string | null;
  sexo: "hombre" | "mujer" | "sin_especificar" | null;
  tieneFoto: boolean;
  zipEntry: JSZip.JSZipObject | null;
  valido: boolean;
  errorMotivo: string | null;
};

const BATCH_SIZE = 5;

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function limpiarDni(valor: unknown): string {
  if (valor == null) return "";
  const str = String(valor).trim();
  // Quitar puntos, comas, espacios y guiones
  return str.replace(/[.\s\-_]/g, "");
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function ImportadorSocios({
  gimnasioId,
  gimnasioNombre,
  gimnasioSlug,
  planes,
  dnisExistentes,
  importarAction,
  onFinImportacion,
  volverHref,
  volverLabel = "Ver gimnasio en soporte →",
}: {
  gimnasioId: string;
  gimnasioNombre: string;
  gimnasioSlug: string;
  planes: PlanGym[];
  dnisExistentes: string[];
  /** Server action que efectivamente crea los socios (admin o dueño). */
  importarAction: (
    gimnasioId: string,
    batch: SocioImportarItem[],
  ) => Promise<ResultadoImportarItem[]>;
  /** Opcional: se llama al terminar toda la tanda (ej. auditoría de admin). */
  onFinImportacion?: (resumen: {
    total: number;
    exitosos: number;
    fallidos: number;
    errores: { dni: string; motivo: string }[];
  }) => Promise<void>;
  volverHref: string;
  volverLabel?: string;
}) {
  const [archivoExcel, setArchivoExcel] = useState<File | null>(null);
  const [archivoZip, setArchivoZip] = useState<File | null>(null);

  const [parseando, setParseando] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const [filasCrudas, setFilasCrudas] = useState<Record<string, unknown>[]>([]);
  const [mapaFotos, setMapaFotos] = useState<Map<string, JSZip.JSZipObject>>(new Map());

  // Estado del proceso de importación
  const [importando, setImportando] = useState(false);
  const [progreso, setProgreso] = useState({ procesados: 0, total: 0 });
  const [resultadoFinal, setResultadoFinal] = useState<{
    total: number;
    exitosos: number;
    fallidos: number;
    errores: { dni: string; nombre: string; motivo: string }[];
  } | null>(null);

  // Set de DNIs ya existentes en la BD
  const setDnisDb = useMemo(() => new Set(dnisExistentes.map((d) => d.trim())), [dnisExistentes]);

  // Mapa de planes para matching flexible
  const mapaPlanes = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of planes) {
      map.set(norm(p.nombre), p.id);
    }
    return map;
  }, [planes]);

  // Parsear Excel / CSV
  async function manejarExcel(file: File) {
    setParseError(null);
    setArchivoExcel(file);
    setParseando(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error("El archivo Excel no tiene hojas.");
      }
      const sheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

      if (json.length === 0) {
        throw new Error("No se encontraron filas con datos en la planilla.");
      }
      setFilasCrudas(json);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "No se pudo leer la planilla.");
      setFilasCrudas([]);
    } finally {
      setParseando(false);
    }
  }

  // Parsear ZIP de fotos
  async function manejarZip(file: File) {
    setParseError(null);
    setArchivoZip(file);
    setParseando(true);
    try {
      const zip = await JSZip.loadAsync(file);
      const fotos = new Map<string, JSZip.JSZipObject>();

      const extensionesValidas = [".jpg", ".jpeg", ".png", ".webp"];

      zip.forEach((relativePath, zipEntry) => {
        if (zipEntry.dir) return;
        // Evitar basura de macOS o archivos ocultos
        if (relativePath.includes("__MACOSX") || relativePath.startsWith(".")) return;

        const lower = relativePath.toLowerCase();
        const tieneExtValida = extensionesValidas.some((ext) => lower.endsWith(ext));
        if (!tieneExtValida) return;

        // Extraer nombre base sin directorio ni extensión
        const nombreArchivo = relativePath.split("/").pop() || relativePath;
        const nombreSinExt = nombreArchivo.substring(0, nombreArchivo.lastIndexOf("."));
        const dniKey = limpiarDni(nombreSinExt);

        if (dniKey) {
          fotos.set(dniKey, zipEntry);
        }
      });

      setMapaFotos(fotos);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "No se pudo leer el archivo ZIP de fotos.");
      setMapaFotos(new Map());
    } finally {
      setParseando(false);
    }
  }

  // Emparejar y validar filas
  const sociosPreview: SocioPreview[] = useMemo(() => {
    if (filasCrudas.length === 0) return [];

    const dnisEnArchivo = new Set<string>();

    return filasCrudas.map((row, idx) => {
      // 1. Detectar columnas inteligentemente
      let rawNombre = "";
      let rawDni = "";
      let rawTel = "";
      let rawEmail = "";
      let rawPlan = "";
      let rawSexo = "";

      for (const [key, val] of Object.entries(row)) {
        const k = norm(key);
        const v = String(val ?? "").trim();
        if (!v) continue;

        if (!rawNombre && (k.includes("nombre") || k.includes("apellido") || k.includes("socio") || k.includes("alumno") || k.includes("cliente") || k === "name")) {
          rawNombre = v;
        } else if (!rawDni && (k.includes("dni") || k.includes("documento") || k.includes("cedula") || k.includes("doc") || k.includes("identificacion") || k === "id")) {
          rawDni = v;
        } else if (!rawTel && (k.includes("tel") || k.includes("cel") || k.includes("movil") || k.includes("phone") || k.includes("whatsapp"))) {
          rawTel = v;
        } else if (!rawEmail && (k.includes("email") || k.includes("correo") || k.includes("mail"))) {
          rawEmail = v;
        } else if (!rawPlan && (k.includes("plan") || k.includes("membresia") || k.includes("pase") || k.includes("cuota"))) {
          rawPlan = v;
        } else if (!rawSexo && (k.includes("sexo") || k.includes("genero"))) {
          rawSexo = v;
        }
      }

      const dni = limpiarDni(rawDni);
      const nombre = rawNombre.trim();
      const telefono = rawTel ? rawTel.trim() : null;
      const email = rawEmail ? rawEmail.toLowerCase().trim() : null;
      const planOriginal = rawPlan ? rawPlan.trim() : null;

      // Normalizar sexo si existe
      let sexo: "hombre" | "mujer" | "sin_especificar" | null = null;
      if (rawSexo) {
        const s = norm(rawSexo);
        if (s.startsWith("m") || s.includes("mujer") || s.includes("fem")) sexo = "mujer";
        else if (s.startsWith("h") || s.includes("hombre") || s.includes("masc")) sexo = "hombre";
        else sexo = "sin_especificar";
      }

      // Emparejar foto
      const zipEntry = mapaFotos.get(dni) || null;
      const tieneFoto = zipEntry !== null;

      // Validaciones
      let valido = true;
      let errorMotivo: string | null = null;

      if (!nombre) {
        valido = false;
        errorMotivo = "Sin nombre especificado";
      } else if (!dni) {
        valido = false;
        errorMotivo = "Sin DNI especificado";
      } else if (!/^\d{6,}$/.test(dni)) {
        valido = false;
        errorMotivo = "DNI inválido (debe tener al menos 6 números)";
      } else if (dnisEnArchivo.has(dni)) {
        valido = false;
        errorMotivo = "DNI duplicado en la misma planilla";
      } else if (setDnisDb.has(dni)) {
        valido = false;
        errorMotivo = "DNI ya registrado en este gimnasio";
      }

      if (dni) {
        dnisEnArchivo.add(dni);
      }

      // Validar plan si viene informado
      let planId: string | null = null;
      if (planOriginal) {
        const pId = mapaPlanes.get(norm(planOriginal));
        if (pId) {
          planId = pId;
        } else {
          valido = false;
          errorMotivo = errorMotivo
            ? `${errorMotivo} · Plan "${planOriginal}" no existe en este gimnasio`
            : `El plan "${planOriginal}" no existe en este gimnasio`;
        }
      }

      return {
        index: idx + 1,
        nombre,
        dni,
        telefono,
        email,
        planOriginal,
        planId,
        sexo,
        tieneFoto,
        zipEntry,
        valido,
        errorMotivo,
      };
    });
  }, [filasCrudas, mapaFotos, setDnisDb, mapaPlanes]);

  const validos = useMemo(() => sociosPreview.filter((s) => s.valido), [sociosPreview]);
  const invalidos = useMemo(() => sociosPreview.filter((s) => !s.valido), [sociosPreview]);
  const conFotoCount = useMemo(() => sociosPreview.filter((s) => s.tieneFoto).length, [sociosPreview]);

  // Ejecutar la importación en tandas
  async function ejecutarImportacion() {
    if (validos.length === 0) return;
    setImportando(true);
    setResultadoFinal(null);
    setProgreso({ procesados: 0, total: validos.length });

    const erroresAcumulados: { dni: string; nombre: string; motivo: string }[] = [];
    let exitososCount = 0;

    try {
      // Procesar en tandas
      for (let i = 0; i < validos.length; i += BATCH_SIZE) {
        const batch = validos.slice(i, i + BATCH_SIZE);
        const batchPayload: SocioImportarItem[] = [];

        for (const s of batch) {
          let fotoBase64: string | null = null;

          if (s.zipEntry) {
            try {
              const rawBlob = await s.zipEntry.async("blob");
              const rawFile = new File([rawBlob], `${s.dni}.jpg`, {
                type: rawBlob.type || "image/jpeg",
              });

              // Comprimir client-side a 256px y <60KB
              const { blob: compBlob } = await comprimirImagen(rawFile, {
                maxLado: 256,
                maxBytes: 60 * 1024,
                calidadInicial: 0.85,
              });

              fotoBase64 = await blobToBase64(compBlob);
            } catch (imgErr) {
              console.warn("Fallo compresión de foto de", s.dni, imgErr);
            }
          }

          batchPayload.push({
            nombre: s.nombre,
            dni: s.dni,
            telefono: s.telefono,
            email: s.email,
            planId: s.planId,
            sexo: s.sexo,
            fotoBase64,
          });
        }

        // Enviar tanda al server
        const resultadosTanda = await importarAction(gimnasioId, batchPayload);

        for (const res of resultadosTanda) {
          if (res.ok) {
            exitososCount++;
          } else {
            erroresAcumulados.push({
              dni: res.dni,
              nombre: res.nombre,
              motivo: res.error || "Error al crear",
            });
          }
        }

        setProgreso({
          procesados: Math.min(i + BATCH_SIZE, validos.length),
          total: validos.length,
        });
      }

      // Registrar auditoría final (solo admin la usa)
      if (onFinImportacion) {
        await onFinImportacion({
          total: validos.length,
          exitosos: exitososCount,
          fallidos: erroresAcumulados.length,
          errores: erroresAcumulados.map((e) => ({ dni: e.dni, motivo: e.motivo })),
        });
      }

      setResultadoFinal({
        total: validos.length,
        exitosos: exitososCount,
        fallidos: erroresAcumulados.length,
        errores: erroresAcumulados,
      });
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Error durante la importación.");
    } finally {
      setImportando(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── PASO 1: Subida de archivos ── */}
      <div className="card-cut border border-rule bg-paper-2 p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-soft">
          1. Subir archivos de datos y fotos
        </h2>
        <p className="text-xs text-ink-soft leading-relaxed">
          Cargá la planilla Excel/CSV con los socios y opcionalmente un archivo ZIP con las fotos de perfil.
          Las fotos se emparejan automáticamente por <code>DNI.jpg</code> / <code>DNI.png</code>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Input Excel */}
          <div className="rounded-[10px] border border-rule bg-paper p-4">
            <label className="block text-xs font-semibold text-ink mb-1">
              Planilla de socios (.xlsx, .xls, .csv)
            </label>
            <p className="text-[11px] text-ink-soft mb-3">
              Detecta columnas: Nombre, DNI, Teléfono, Plan, etc.
            </p>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              disabled={importando || parseando}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) manejarExcel(f);
              }}
              className="block w-full text-xs text-ink-soft file:mr-3 file:py-1.5 file:px-3 file:rounded-[6px] file:border file:border-rule file:text-xs file:font-semibold file:bg-paper-2 file:text-ink hover:file:bg-paper-3 cursor-pointer"
            />
            {archivoExcel && (
              <p className="mt-2 text-[11px] text-ok flex items-center gap-1">
                <span>✓</span> {archivoExcel.name} ({filasCrudas.length} filas detectadas)
              </p>
            )}
          </div>

          {/* Input ZIP */}
          <div className="rounded-[10px] border border-rule bg-paper p-4">
            <label className="block text-xs font-semibold text-ink mb-1">
              Fotos en archivo .ZIP (opcional)
            </label>
            <p className="text-[11px] text-ink-soft mb-3">
              Ej. <code>40123456.jpg</code> se asigna al socio con ese DNI.
            </p>
            <input
              type="file"
              accept=".zip"
              disabled={importando || parseando}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) manejarZip(f);
              }}
              className="block w-full text-xs text-ink-soft file:mr-3 file:py-1.5 file:px-3 file:rounded-[6px] file:border file:border-rule file:text-xs file:font-semibold file:bg-paper-2 file:text-ink hover:file:bg-paper-3 cursor-pointer"
            />
            {archivoZip && (
              <p className="mt-2 text-[11px] text-ok flex items-center gap-1">
                <span>✓</span> {archivoZip.name} ({mapaFotos.size} fotos encontradas)
              </p>
            )}
          </div>
        </div>

        {parseando && (
          <div className="flex items-center gap-2 text-xs text-ink-soft pt-2">
            <Spinner /> Procesando archivos en el navegador…
          </div>
        )}

        {parseError && (
          <div className="rounded-[8px] bg-danger/10 border border-danger/20 p-3 text-xs text-danger">
            {parseError}
          </div>
        )}
      </div>

      {/* ── PASO 2: Previsualización y validación ── */}
      {sociosPreview.length > 0 && !resultadoFinal && (
        <div className="card-cut border border-rule bg-paper-2 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rule pb-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-soft">
                2. Previsualización y validación
              </h2>
              <p className="text-xs text-ink-soft mt-0.5">
                Revisá los socios antes de importar. Las filas rojas tienen errores y se ignorarán.
              </p>
            </div>

            {/* Estadísticas */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="rounded-[6px] border border-rule bg-paper px-2.5 py-1 text-ink">
                Total: <b>{sociosPreview.length}</b>
              </span>
              <span className="rounded-[6px] border border-ok/30 bg-ok/10 px-2.5 py-1 text-ok font-medium">
                Válidos: <b>{validos.length}</b>
              </span>
              {invalidos.length > 0 && (
                <span className="rounded-[6px] border border-danger/30 bg-danger/10 px-2.5 py-1 text-danger font-medium">
                  Con error: <b>{invalidos.length}</b>
                </span>
              )}
              <span className="rounded-[6px] border border-rule bg-paper px-2.5 py-1 text-ink-soft">
                Con foto: <b>{conFotoCount}</b>
              </span>
            </div>
          </div>

          {/* Tabla de Preview */}
          <div className="max-h-[380px] overflow-y-auto rounded-[8px] border border-rule bg-paper text-xs">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-paper-2 border-b border-rule text-[11px] font-semibold text-ink-soft uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3">Nombre</th>
                  <th className="py-2.5 px-3">DNI</th>
                  <th className="py-2.5 px-3">Teléfono</th>
                  <th className="py-2.5 px-3">Plan</th>
                  <th className="py-2.5 px-3 text-center">Foto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule font-sans">
                {sociosPreview.map((s) => (
                  <tr
                    key={s.index}
                    className={s.valido ? "hover:bg-paper-2/60" : "bg-danger/5 hover:bg-danger/10"}
                  >
                    <td className="py-2 px-3 whitespace-nowrap">
                      {s.valido ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ok">
                          <span>✓</span> Válido
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-danger"
                          title={s.errorMotivo || "Dato inválido"}
                        >
                          <span>✕</span> {s.errorMotivo}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-medium text-ink truncate max-w-[180px]">
                      {s.nombre || "—"}
                    </td>
                    <td className="py-2 px-3 text-ink-soft font-mono">
                      {s.dni || "—"}
                    </td>
                    <td className="py-2 px-3 text-ink-soft">
                      {s.telefono || "—"}
                    </td>
                    <td className="py-2 px-3 text-ink-soft">
                      {s.planOriginal ? (
                        s.planId ? (
                          <span className="text-ink">{s.planOriginal}</span>
                        ) : (
                          <span className="text-danger">{s.planOriginal} (no existe)</span>
                        )
                      ) : (
                        <span className="text-ink-soft/60">Sin plan</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      {s.tieneFoto ? (
                        <span className="inline-block rounded-full bg-ok/10 text-ok px-2 py-0.5 text-[10px] font-bold">
                          📸 Foto OK
                        </span>
                      ) : (
                        <span className="text-ink-soft/40 text-[10px]">Sin foto</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Barra de progreso si está importando */}
          {importando && (
            <div className="space-y-2 pt-2 animate-fade-in">
              <div className="flex items-center justify-between text-xs text-ink-soft">
                <span className="flex items-center gap-2">
                  <Spinner />
                  Importando socios en tandas de {BATCH_SIZE}…
                </span>
                <span className="font-mono font-bold text-ink">
                  {progreso.procesados} de {progreso.total} (
                  {Math.round((progreso.procesados / (progreso.total || 1)) * 100)}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-paper border border-rule">
                <div
                  className="h-full bg-accent transition-[width] duration-300 ease-out"
                  style={{
                    width: `${Math.round((progreso.procesados / (progreso.total || 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Botón de Acción */}
          {!importando && (
            <div className="flex items-center justify-between gap-4 pt-2">
              <p className="text-xs text-ink-soft">
                Se importarán <b>{validos.length}</b> socios válidos.
                {invalidos.length > 0 && ` Se omitirán ${invalidos.length} con error.`}
              </p>
              <Button
                type="button"
                onClick={ejecutarImportacion}
                disabled={validos.length === 0}
              >
                Importar {validos.length} socios válidos
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── PASO 3: Resumen Final ── */}
      {resultadoFinal && (
        <div className="card-cut border border-rule bg-paper-2 p-6 space-y-4 animate-scale-in">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-ok/10 text-ok grid place-items-center text-xl font-bold">
              ✓
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">Importación completada</h2>
              <p className="text-xs text-ink-soft">
                La operación quedó registrada en la auditoría de superadmin.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
            <div className="rounded-[10px] border border-rule bg-paper p-3 text-center">
              <span className="block text-[11px] text-ink-soft uppercase font-semibold">Total intentados</span>
              <span className="text-xl font-bold text-ink">{resultadoFinal.total}</span>
            </div>
            <div className="rounded-[10px] border border-ok/30 bg-ok/5 p-3 text-center">
              <span className="block text-[11px] text-ok uppercase font-semibold">Creados con éxito</span>
              <span className="text-xl font-bold text-ok">{resultadoFinal.exitosos}</span>
            </div>
            <div className="rounded-[10px] border border-rule bg-paper p-3 text-center col-span-2 sm:col-span-1">
              <span className="block text-[11px] text-ink-soft uppercase font-semibold">Fallidos</span>
              <span className={`text-xl font-bold ${resultadoFinal.fallidos > 0 ? "text-danger" : "text-ink-soft"}`}>
                {resultadoFinal.fallidos}
              </span>
            </div>
          </div>

          {resultadoFinal.errores.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-semibold text-danger uppercase tracking-wider">
                Detalle de fallidos ({resultadoFinal.errores.length})
              </h3>
              <ul className="max-h-48 overflow-y-auto rounded-[8px] border border-rule bg-paper divide-y divide-rule text-xs p-2">
                {resultadoFinal.errores.map((e, i) => (
                  <li key={i} className="py-1.5 px-2 flex items-center justify-between gap-4">
                    <span className="font-medium text-ink">
                      {e.nombre} (DNI {e.dni})
                    </span>
                    <span className="text-danger text-[11px]">{e.motivo}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-rule">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setResultadoFinal(null);
                setFilasCrudas([]);
                setMapaFotos(new Map());
                setArchivoExcel(null);
                setArchivoZip(null);
              }}
            >
              Nueva importación
            </Button>
            <Link href={volverHref} className={pillClasses.neutra}>
              {volverLabel}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
