"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { marcarIngreso, type CheckinState } from "./actions";
import { Button } from "@/components/ui";
import { SalirModoCheckin } from "./salir-form";
import { encolar } from "@/lib/offline/cola";

import { Camera, CameraOff, Pencil } from "lucide-react";
import { QRScannerTab } from "@/components/checkin/qr-scanner-tab";
import { hapticoImpactoSuave } from "@/lib/ui/hapticos";

type Tono = "ok" | "prueba_vencida" | "cuota_vencida" | "no_encontrado" | "encolado";

const TONO: Record<Tono, { rail: string; kicker: string; texto: string }> = {
  ok: {
    rail: "border-l-ok",
    kicker: "text-ok",
    texto: "Ingreso registrado",
  },
  encolado: {
    rail: "border-l-warn",
    kicker: "text-warn",
    texto: "Ingreso guardado — se sincroniza al volver la conexión",
  },
  cuota_vencida: {
    rail: "border-l-danger",
    kicker: "text-danger",
    texto: "Cuota vencida — pasá por recepción a regularizar",
  },
  prueba_vencida: {
    rail: "border-l-danger",
    kicker: "text-danger",
    texto: "Prueba vencida — avisá al encargado",
  },
  no_encontrado: {
    rail: "border-l-rule",
    kicker: "text-ink-soft",
    texto: "DNI no encontrado, avisá al encargado",
  },
};

const TIMEOUT_MS = 8_000;

// Tecla que prende/apaga la cámara del QR. Function key por defecto: un
// lector de DNI por USB (keyboard-wedge) tipea dígitos + Enter, nunca manda
// F2, así que no hay riesgo de que un DNI escaneado la dispare sin querer.
const TECLA_CAMARA_DEFAULT = "F2";
const TECLA_CAMARA_KEY = "checkin_tecla_camara";

export function CheckinForm() {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<CheckinState & { encolado?: boolean }>({});
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [camaraActiva, setCamaraActiva] = useState(false);
  const [teclaCamara, setTeclaCamara] = useState(TECLA_CAMARA_DEFAULT);
  const [capturandoTecla, setCapturandoTecla] = useState(false);

  // Cargar la tecla configurada (por gimnasio/recepción, queda en este navegador).
  useEffect(() => {
    try {
      const guardada = localStorage.getItem(TECLA_CAMARA_KEY);
      // Si quedó una tecla inválida guardada de antes de esta guarda (Enter,
      // Tab, un dígito), se ignora y se vuelve al default.
      const esValida = guardada && guardada !== "Enter" && guardada !== "Tab" && !/^[0-9]$/.test(guardada);
      if (esValida) setTeclaCamara(guardada);
      else if (guardada) localStorage.removeItem(TECLA_CAMARA_KEY);
    } catch {
      /* localStorage no disponible: se queda con el default */
    }
  }, []);

  // Listener global: togglea la cámara con la tecla configurada, o la
  // reconfigura si estamos en modo "capturar próxima tecla". El input de DNI
  // sigue enfocado todo el tiempo (no hace falta clickear nada), así que este
  // listener corre en paralelo sin robarle el foco al lector de DNI.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (capturandoTecla) {
        if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;
        if (e.key === "Escape") {
          e.preventDefault();
          setCapturandoTecla(false);
          return;
        }
        // Nunca permitir bindear Enter, Tab o un dígito: son justo lo que
        // manda un lector de DNI por USB al terminar de escanear (dígitos +
        // Enter), y Tab rompe la navegación del formulario. Si se bindeara
        // por error, el próximo DNI escaneado activaría/apagaría la cámara
        // en vez de (o además de) registrar el ingreso.
        if (e.key === "Enter" || e.key === "Tab" || /^[0-9]$/.test(e.key)) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        const nueva = e.key;
        setTeclaCamara(nueva);
        setCapturandoTecla(false);
        try {
          localStorage.setItem(TECLA_CAMARA_KEY, nueva);
        } catch {
          /* ok */
        }
        return;
      }
      if (e.key === teclaCamara) {
        e.preventDefault();
        hapticoImpactoSuave();
        setCamaraActiva((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [teclaCamara, capturandoTecla]);

  const limpiar = () => {
    formRef.current?.reset();
    inputRef.current?.focus();
  };

  const procesarDniIngreso = (dniLimpio: string) => {
    if (!dniLimpio) {
      setState({ error: "Escribí o escaneá un DNI." });
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set("dni", dniLimpio);
      try {
        const res = await Promise.race([
          marcarIngreso({}, fd),
          new Promise<never>((_, rej) =>
            setTimeout(() => rej(new Error("timeout")), TIMEOUT_MS),
          ),
        ]);
        if (res.error) {
          encolar("checkin", { dni: dniLimpio });
          setState({ encolado: true });
        } else {
          setState(res);
        }
      } catch {
        encolar("checkin", { dni: dniLimpio });
        setState({ encolado: true });
      } finally {
        limpiar();
        setTimeout(() => window.location.reload(), 6000);
      }
    });
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const dni = (inputRef.current?.value ?? "").replace(/\D/g, "").trim();
    procesarDniIngreso(dni);
  };

  const tonoKey: Tono | null = state.encolado
    ? "encolado"
    : state.estado ?? null;
  const tono = tonoKey ? TONO[tonoKey] : null;

  return (
    <div className="w-full max-w-md rounded-[20px] border border-rule/60 bg-paper-2/90 p-6 shadow-lg backdrop-blur-xl sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl leading-tight">Ingreso al Gym</h1>
          <p className="mt-1 text-[14px] text-ink-soft">
            Escribí tu DNI o escaneá tu pase QR
          </p>
        </div>
      </div>

      {/* DNI: siempre visible y enfocado, listo para un lector USB o para tipear a mano */}
      <form ref={formRef} onSubmit={onSubmit} className="mt-5">
        <label className="block">
          <span className="sr-only">DNI</span>
          <input
            ref={inputRef}
            name="dni"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            placeholder="DNI"
            className="w-full h-16 px-4 rounded-[8px] border border-rule bg-paper text-center font-display text-3xl tracking-[0.12em] outline-none transition-[border-color,box-shadow] duration-200 [transition-timing-function:var(--ease-out)] focus:border-ink focus:shadow-[0_0_0_3px_rgb(22_24_29_/_0.08)]"
          />
        </label>

        <Button
          type="submit"
          loading={pending}
          className="mt-4 h-14 w-full text-base"
        >
          {pending ? "Marcando…" : "Marcar ingreso"}
        </Button>
      </form>

      {/* Cámara QR: apagada por defecto, se prende con la tecla configurable
          (evita tenerla encendida todo el turno) o tocando el botón. */}
      <div className="mt-6">
        {camaraActiva ? (
          <div className="space-y-3">
            <QRScannerTab onScan={procesarDniIngreso} isProcessing={pending} />
            <button
              type="button"
              onClick={() => {
                hapticoImpactoSuave();
                setCamaraActiva(false);
              }}
              className="mx-auto flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink"
            >
              <CameraOff className="size-3.5" />
              Apagar cámara ({teclaCamara})
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              hapticoImpactoSuave();
              setCamaraActiva(true);
            }}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-[16px] border border-dashed border-rule bg-paper/60 py-6 text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
          >
            <Camera className="size-6" />
            <span className="text-xs font-medium">
              Cámara apagada — tocá acá o presioná <b className="text-ink">{teclaCamara}</b> para escanear un QR
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            hapticoImpactoSuave();
            setCapturandoTecla(true);
          }}
          className="mx-auto mt-2 flex items-center gap-1.5 text-[11px] text-ink-soft/70 hover:text-ink-soft"
        >
          <Pencil className="size-3" />
          {capturandoTecla ? "Presioná la tecla que querés usar…" : "Cambiar tecla de la cámara"}
        </button>
      </div>

      {state.error ? (
        <p role="alert" className="mt-4 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      {tono ? (
        <div
          role="status"
          className={`mt-6 animate-fade-in rounded-[10px] border border-rule border-l-[4px] bg-paper-2 px-5 py-4 ${tono.rail}`}
        >
          <p
            className={`text-[11px] font-medium uppercase tracking-[0.14em] ${tono.kicker}`}
          >
            {tono.texto}
          </p>
          {state.nombre ? (
            <p className="mt-1 font-display text-2xl leading-tight">
              {state.nombre}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-10 border-t border-rule pt-4">
        <SalirModoCheckin />
      </div>
    </div>
  );
}
