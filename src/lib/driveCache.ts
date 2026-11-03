/**
 * Caché local (IndexedDB) del texto extraído de los archivos de Google Drive.
 *
 * Guarda por archivo: id, nombre, fecha de modificación en Drive (`modifiedTime`)
 * y el texto ya extraído. Si el archivo no cambió en Drive, la app reutiliza el
 * texto guardado y evita volver a descargar y re-extraer (PDF, DOCX, OCR).
 *
 * Módulo independiente: si se quiere desactivar o cambiar la estrategia de
 * caché, basta con modificar este archivo. Todas las funciones degradan sin
 * romper la carga (si IndexedDB no está disponible, simplemente no hay caché).
 */

const DB_NAME = 'lab-drive-cache';
const DB_VERSION = 1;
const STORE = 'files';

/** Texto de Drive guardado en caché con su fecha. */
export interface DriveCacheEntry {
  /** ID del archivo en Google Drive (clave primaria). */
  id: string;
  name: string;
  /** `modifiedTime` reportado por la API de Drive al momento de cachear. */
  modifiedTime: string;
  /** Texto extraído, con su encabezado `--- ... ---` incluido. */
  text: string;
  cachedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no disponible'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('No se pudo abrir la caché local'));
  });
}

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Error de caché local'));
  });
}

/** Devuelve la entrada cacheada o `null` (nunca lanza: la caché es opcional). */
export async function getCachedDriveFile(id: string): Promise<DriveCacheEntry | null> {
  try {
    const db = await openDb();
    try {
      const store = db.transaction(STORE, 'readonly').objectStore(STORE);
      const entry = await requestToPromise(store.get(id));
      return (entry as DriveCacheEntry | undefined) ?? null;
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

/** Guarda o reemplaza la entrada. Silencioso ante errores (cuota, modo privado…). */
export async function setCachedDriveFile(entry: DriveCacheEntry): Promise<void> {
  try {
    const db = await openDb();
    try {
      const store = db.transaction(STORE, 'readwrite').objectStore(STORE);
      await requestToPromise(store.put(entry));
    } finally {
      db.close();
    }
  } catch {
    /* caché opcional */
  }
}

/** Elimina entradas de archivos que ya no existen en la carpeta (evita crecimiento sin límite). */
export async function pruneDriveCache(keepIds: ReadonlySet<string>): Promise<void> {
  try {
    const db = await openDb();
    try {
      const store = db.transaction(STORE, 'readwrite').objectStore(STORE);
      const keys = await requestToPromise(store.getAllKeys());
      for (const key of keys) {
        if (typeof key === 'string' && !keepIds.has(key)) {
          await requestToPromise(store.delete(key));
        }
      }
    } finally {
      db.close();
    }
  } catch {
    /* caché opcional */
  }
}
