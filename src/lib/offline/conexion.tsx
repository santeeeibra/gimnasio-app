"use client";

/**
 * Detector de conexión REAL con Supabase.
 *
 * `navigator.onLine` sólo dice si hay wifi/datos, no si Supabase responde (ya
 * pasó que la red estaba OK y Supabase caído). Por eso hacemos un ping liviano
 * periódico a `/auth/v1/health` (200 sin sesión) y decidimos por ahí.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type EstadoConexion = "conectado" | "desconectado" | "probando";

type Ctx = {
  estado: EstadoConexion;
  /** Epoch ms del último ping OK, o null si nunca respondió en esta sesión. */
  ultimoOk: number | null;
  /** Fuerza un ping ahora (botón "Sincronizar ahora"). */
  probarAhora: () => void;
};

const ConexionContext = createContext<Ctx | null>(null);

const INTERVALO_MS = 20_000;
const TIMEOUT_MS = 7_000;
const FALLOS_PARA_CAER = 2;

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function pingSupabase(): Promise<boolean> {
  if (!URL) return false;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${URL}/auth/v1/health`, {
      method: "GET",
      headers: ANON ? { apikey: ANON } : undefined,
      cache: "no-store",
      signal: ctrl.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

export function ConexionProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<EstadoConexion>("conectado");
  const [ultimoOk, setUltimoOk] = useState<number | null>(null);
  const fallos = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const corriendo = useRef(false);

  const chequear = useCallback(async () => {
    if (corriendo.current) return;
    corriendo.current = true;
    setEstado((e) => (e === "desconectado" ? "desconectado" : "probando"));

    // Si el SO ya sabe que no hay red, no gastamos un fetch.
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      fallos.current = FALLOS_PARA_CAER;
      setEstado("desconectado");
      corriendo.current = false;
      return;
    }

    const ok = await pingSupabase();
    if (ok) {
      fallos.current = 0;
      setUltimoOk(Date.now());
      setEstado("conectado");
    } else {
      fallos.current += 1;
      if (fallos.current >= FALLOS_PARA_CAER) setEstado("desconectado");
    }
    corriendo.current = false;
  }, []);

  const programar = useCallback(
    (ms: number) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        await chequear();
        programar(INTERVALO_MS);
      }, ms);
    },
    [chequear],
  );

  const probarAhora = useCallback(() => {
    void chequear().then(() => programar(INTERVALO_MS));
  }, [chequear, programar]);

  useEffect(() => {
    void chequear();
    programar(INTERVALO_MS);

    const onOnline = () => probarAhora();
    const onOffline = () => {
      fallos.current = FALLOS_PARA_CAER;
      setEstado("desconectado");
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") probarAhora();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [chequear, programar, probarAhora]);

  return (
    <ConexionContext.Provider value={{ estado, ultimoOk, probarAhora }}>
      {children}
    </ConexionContext.Provider>
  );
}

export function useConexionSupabase(): Ctx {
  const ctx = useContext(ConexionContext);
  if (!ctx) {
    // Fuera del provider: asumimos conectado para no bloquear nada.
    return { estado: "conectado", ultimoOk: null, probarAhora: () => {} };
  }
  return ctx;
}
