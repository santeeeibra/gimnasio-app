// Motor IndexedDB nativo para SysGym — Soporte 100% Offline
const DB_NAME = "sysgym_offline_db";
const DB_VERSION = 1;

export const STORES = {
  SOCIOS: "socios_cache",
  CHECKINS: "checkins_queue",
} as const;

export interface SocioLocal {
  id: string;
  dni: string;
  nombre: string;
  apellido?: string;
  estado_cuota: "al_dia" | "vencido" | "por_vencer" | "inactivo" | string;
  vencimiento?: string | null;
  foto_url?: string | null;
  updated_at: string;
}

export interface CheckinPendiente {
  id: string;
  socio_id: string;
  dni: string;
  nombre: string;
  timestamp: string;
  metodo: string;
  estado_al_ingreso: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return reject(new Error("IndexedDB no disponible"));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORES.SOCIOS)) {
        const sociosStore = db.createObjectStore(STORES.SOCIOS, { keyPath: "dni" });
        sociosStore.createIndex("id", "id", { unique: true });
      }

      if (!db.objectStoreNames.contains(STORES.CHECKINS)) {
        db.createObjectStore(STORES.CHECKINS, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Guarda o actualiza un grupo de socios en la cache local
export async function guardarSociosLocal(socios: SocioLocal[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.SOCIOS, "readwrite");
    const store = tx.objectStore(STORES.SOCIOS);
    for (const socio of socios) {
      if (socio.dni) store.put(socio);
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("[IndexedDB] Error guardando socios:", err);
  }
}

// Busca un socio por DNI en IndexedDB
export async function buscarSocioPorDNILocal(dni: string): Promise<SocioLocal | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.SOCIOS, "readonly");
    const store = tx.objectStore(STORES.SOCIOS);
    return new Promise((resolve, reject) => {
      const req = store.get(dni);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("[IndexedDB] Error buscando socio local:", err);
    return null;
  }
}

// Obtener la cantidad de socios en la cache local
export async function contarSociosLocales(): Promise<number> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.SOCIOS, "readonly");
    const store = tx.objectStore(STORES.SOCIOS);
    return new Promise((resolve) => {
      const req = store.count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

// Guardar un checkin en la cola de sincronización offline
export async function encolarCheckinOffline(checkin: Omit<CheckinPendiente, "id">): Promise<string> {
  const id = `chk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const item: CheckinPendiente = { ...checkin, id };
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.CHECKINS, "readwrite");
    const store = tx.objectStore(STORES.CHECKINS);
    store.put(item);
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(null);
      tx.onerror = () => reject(tx.error);
    });
    return id;
  } catch (err) {
    console.warn("[IndexedDB] Error encolando checkin:", err);
    return id;
  }
}

// Obtener todos los checkins pendientes de sincronizar
export async function obtenerCheckinsPendientes(): Promise<CheckinPendiente[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.CHECKINS, "readonly");
    const store = tx.objectStore(STORES.CHECKINS);
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

// Eliminar un checkin de la cola tras sincronizar exitosamente
export async function eliminarCheckinEncolado(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.CHECKINS, "readwrite");
    const store = tx.objectStore(STORES.CHECKINS);
    store.delete(id);
  } catch (err) {
    console.warn("[IndexedDB] Error eliminando checkin encolado:", err);
  }
}
