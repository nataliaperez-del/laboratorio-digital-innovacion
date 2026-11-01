import type { Worker as TesseractWorker } from 'tesseract.js';
import {
  DRIVE_REFERENCE_CONTENEDOR_1_CANDIDATES,
  DRIVE_REFERENCE_PROMPT_ARBOL_INNOVACION_CANDIDATES,
  DRIVE_REFERENCE_PROMPT_VOCACION_CIP_CANDIDATES,
  DRIVE_REFERENCE_PROMPTS_FUENTES_C2_TERRITORIAL_CANDIDATES,
  DRIVE_REFERENCE_INSTRUCCION_FUNDANTE_CANDIDATES,
} from '@/constants/cipDocumentReferences';
import { getCachedDriveFile, pruneDriveCache, setCachedDriveFile } from '@/lib/driveCache';
import { useStore } from '@/store/useStore';
import { DEMO_DRIVE_RESULT } from '@/constants/demoData';

/**
 * Carpeta institucional UNAD (Fase 2 · Contenedor 1).
 * https://drive.google.com/drive/folders/1fWqgAlPTjjDi_ZLb6CfU0sFLG7bOKZ5g
 * Se puede cambiar sin tocar código con VITE_DRIVE_FOLDER_ID en .env.local.
 */
export const INSTITUTIONAL_DRIVE_FOLDER_ID =
  import.meta.env.VITE_DRIVE_FOLDER_ID?.trim() || '1fWqgAlPTjjDi_ZLb6CfU0sFLG7bOKZ5g';

/** Límite de caracteres del bloque Drive en el prompt (evita exceder contexto del modelo). Por defecto 900000; opcional: VITE_MAX_INSTITUTIONAL_CHARS en .env.local */
export function getMaxInstitutionalTextChars(): number {
  const raw = import.meta.env.VITE_MAX_INSTITUTIONAL_CHARS?.trim();
  if (!raw) return 900_000;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 80_000) return 900_000;
  return Math.min(Math.floor(n), 2_000_000);
}

/** Profundidad máxima de subcarpetas y tope de archivos (evita bucles y tiempos excesivos). */
const MAX_FOLDER_DEPTH = 8;
const MAX_FILES_TO_PROCESS = 150;

const MAX_FILE_BYTES = 45 * 1024 * 1024;
const MAX_IMAGE_BYTES = 22 * 1024 * 1024;

const FOLDER_MIME = 'application/vnd.google-apps.folder';
/** Acceso directo de Drive: apunta a otro archivo o carpeta (frecuente en repositorios compartidos). */
const SHORTCUT_MIME = 'application/vnd.google-apps.shortcut';

/** Formatos nativos de Google que se leen exportándolos a texto. */
const GOOGLE_EXPORTS: Record<string, { exportMime: string; label: string }> = {
  'application/vnd.google-apps.document': { exportMime: 'text/plain', label: 'Google Doc' },
  'application/vnd.google-apps.spreadsheet': { exportMime: 'text/csv', label: 'Google Sheet' },
  'application/vnd.google-apps.presentation': { exportMime: 'text/plain', label: 'Google Slides' },
};

export interface DriveFileMeta {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  /** Fecha de última modificación en Drive; se usa para validar la caché local. */
  modifiedTime?: string;
  /** Carpetas desde la raíz institucional hasta el archivo (sin incluir su nombre). */
  folderPath?: string[];
  /** Destino cuando el elemento es un acceso directo (`SHORTCUT_MIME`). */
  shortcutDetails?: { targetId?: string; targetMimeType?: string };
}

/** Resumen de lo que se recorrió y lo que quedó fuera; se muestra en la Fase 2 para poder verificarlo. */
export interface DriveLoadDiagnostics {
  /** Carpetas recorridas, como ruta relativa a la raíz institucional. */
  folderPaths: string[];
  /** Archivos leídos, con su ruta de carpetas. */
  filePaths: string[];
  /** Archivos que Drive devolvió pero no se pudieron leer (tipo no soportado, acceso directo roto…). */
  skippedFiles: string[];
  /** Subcarpetas encontradas dentro de C_TERRITORIO_ESPECIFICO (para detectar diferencias de nombre). */
  territoryFolderNames: string[];
}

/** Fuentes manuales que un líder de zona cargó en la subcarpeta de un territorio (C_TERRITORIO_ESPECIFICO). */
export interface DriveTerritorySources {
  /** Nombre de la subcarpeta del territorio tal como aparece en Drive. */
  name: string;
  text: string;
  fileNames: string[];
  /**
   * Nombres de todas las carpetas de esa rama bajo C_TERRITORIO_ESPECIFICO (incluye
   * niveles más profundos, p. ej. `HUILA/NEIVA`), para reconocer el municipio aunque
   * la zona haya organizado las fuentes por departamento.
   */
  folderNames?: string[];
}

/** Normaliza nombres de carpeta/municipio para compararlos: mayúsculas, sin tildes, guiones/underscores como espacios. */
export function normalizeTerritoryName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\-.,()]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * Si el archivo vive en C_TERRITORIO_ESPECIFICO/<territorio>/..., devuelve el nombre de
 * esa primera subcarpeta (clave de agrupación) y todos los tramos siguientes, que
 * también pueden nombrar al municipio si la zona anidó las carpetas.
 */
function territoryNameForFile(file: DriveFileMeta): { name: string; segments: string[] } | null {
  const path = file.folderPath || [];
  const idx = path.findIndex((seg) => normalizeTerritoryName(seg).includes('TERRITORIO ESPECIFIC'));
  if (idx === -1 || idx + 1 >= path.length) return null;
  return { name: path[idx + 1], segments: path.slice(idx + 1) };
}

/**
 * Busca la subcarpeta de territorio que corresponde al municipio de la Ficha Base.
 * Primero igualdad exacta (normalizada); si no, inclusión en cualquier dirección
 * (p. ej. carpeta «PITALITO - HUILA» para municipio «Pitalito»).
 */
/**
 * Cómo se emparejó la subcarpeta del territorio con el municipio de la ficha:
 * `exact` por nombre de la subcarpeta, `nested` por un tramo más profundo (una zona que
 * organizó las fuentes por departamento) y `partial` por coincidencia parcial de nombre.
 */
export type TerritoryMatchTier = 'exact' | 'nested' | 'partial';

export interface TerritoryMatch {
  sources: DriveTerritorySources;
  tier: TerritoryMatchTier;
  /** Otras subcarpetas que también correspondían al municipio: ambigüedad a resolver por una persona. */
  alsoMatched: string[];
}

/**
 * Empareja el municipio de la ficha con una subcarpeta de `C_TERRITORIO_ESPECIFICO`, y
 * devuelve además **cómo** se emparejó y si había otras candidatas. El Contenedor 2 debe
 * declarar esa trazabilidad, y quedarse con la primera coincidencia en silencio ocultaría
 * justo lo que hay que reportar.
 */
export function findTerritoryMatch(
  territories: DriveTerritorySources[] | undefined | null,
  municipality: string,
): TerritoryMatch | null {
  if (!territories?.length || !municipality.trim()) return null;
  const want = normalizeTerritoryName(municipality);
  if (!want) return null;
  const segmentsOf = (t: DriveTerritorySources) =>
    (t.folderNames?.length ? t.folderNames : [t.name]).map(normalizeTerritoryName);

  const byTier: [TerritoryMatchTier, DriveTerritorySources[]][] = [
    ['exact', territories.filter((t) => normalizeTerritoryName(t.name) === want)],
    ['nested', territories.filter((t) => segmentsOf(t).some((n) => n === want))],
    ['partial', territories.filter((t) => segmentsOf(t).some((n) => n.includes(want) || want.includes(n)))],
  ];

  for (const [tier, hits] of byTier) {
    if (!hits.length) continue;
    return { sources: hits[0], tier, alsoMatched: hits.slice(1).map((t) => t.name) };
  }
  return null;
}

export function findTerritorySources(
  territories: DriveTerritorySources[] | undefined | null,
  municipality: string,
): DriveTerritorySources | null {
  return findTerritoryMatch(territories, municipality)?.sources ?? null;
}

function isPlainTextMime(m: string): boolean {
  return m === 'text/plain' || m.startsWith('text/plain;');
}

function isSupportedMime(meta: DriveFileMeta): boolean {
  const m = meta.mimeType;
  if (m.startsWith('image/')) {
    return ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff'].includes(m);
  }
  // Algunos .txt/.md subidos desde Windows llegan sin MIME de texto.
  if (m === 'application/octet-stream' && /\.(txt|md|markdown|csv)$/i.test(meta.name)) {
    return true;
  }
  return (
    isPlainTextMime(m) ||
    m.startsWith('text/') ||
    m === 'application/pdf' ||
    m === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    m in GOOGLE_EXPORTS ||
    m === 'application/msword'
  );
}

export function loadGoogleIdentityScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      // El evento `load` pudo haberse disparado antes de llegar aquí: en ese caso el listener
      // jamás se ejecutaría y la promesa quedaría colgada. Se sondea la API hasta ~10 s.
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar Google Identity')), { once: true });
      const waitForApi = (triesLeft: number) => {
        if (window.google?.accounts?.oauth2) return resolve();
        if (triesLeft <= 0) return reject(new Error('No se pudo cargar Google Identity'));
        setTimeout(() => waitForApi(triesLeft - 1), 100);
      };
      waitForApi(100);
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('No se pudo cargar Google Identity'));
    document.head.appendChild(s);
  });
}

/** Token OAuth en memoria para no pedir permiso (popup) en cada descarga dentro de la misma sesión. */
let cachedDriveToken: { token: string; expiresAt: number } | null = null;

/**
 * Generación del token: se incrementa en cada cierre de sesión para que una petición
 * OAuth que estuviera en vuelo no vuelva a guardar su token después del logout.
 */
let tokenEpoch = 0;

/**
 * Guarda el token obtenido durante el ingreso institucional (incluye el permiso de
 * Drive), de modo que "Conectar Contenedor 1" y las descargas posteriores no vuelvan
 * a abrir la ventana de Google mientras el token siga vigente.
 */
export function seedDriveToken(token: string, expiresInSec: number): void {
  const ttlMs = Math.max((Number(expiresInSec) || 3600) - 60, 60) * 1000;
  cachedDriveToken = { token, expiresAt: Date.now() + ttlMs };
}

/** Último token de acceso vigente (para revocarlo al cerrar sesión), o null. */
export function getDriveAccessToken(): string | null {
  return cachedDriveToken && Date.now() < cachedDriveToken.expiresAt ? cachedDriveToken.token : null;
}

/** Olvida el token en memoria (cierre de sesión) e invalida las peticiones en vuelo. */
export function clearDriveToken(): void {
  cachedDriveToken = null;
  tokenEpoch++;
}

/**
 * Petición de token en curso: si ya hay una ventana de Google abierta, las demás
 * llamadas esperan esa misma promesa en lugar de abrir otra ventana/pestaña.
 */
let pendingTokenRequest: Promise<string> | null = null;

export function requestDriveReadonlyToken(): Promise<string> {
  if (cachedDriveToken && Date.now() < cachedDriveToken.expiresAt) {
    return Promise.resolve(cachedDriveToken.token);
  }
  if (pendingTokenRequest) {
    return pendingTokenRequest;
  }
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    return Promise.reject(
      new Error(
        [
          'Falta la variable de entorno VITE_GOOGLE_CLIENT_ID.',
          '',
          '1) En la raíz del proyecto, crea o edita el archivo .env.local',
          '2) Añade una línea (sin comillas si no las necesitas): VITE_GOOGLE_CLIENT_ID=tu-id.apps.googleusercontent.com',
          '3) Obtén el ID en Google Cloud Console → APIs y servicios → Credenciales → Crear ID de cliente OAuth → Aplicación web.',
          '4) Habilita la API "Google Drive API" y en el cliente OAuth añade como origen JavaScript autorizado: http://localhost:3000',
          '5) Detén el servidor (Ctrl+C) y vuelve a ejecutar: npm run dev',
          '',
          '(Vite solo expone variables que empiezan por VITE_; sin reiniciar, no verá cambios en .env.local.)',
        ].join('\n'),
      ),
    );
  }
  // Con sesión institucional activa, la renovación se pide a la misma cuenta y sin
  // pantallas de selección: Google auto-aprueba porque el permiso ya fue otorgado al ingresar.
  const sessionEmail = useStore.getState().session?.email;
  const epochAtRequest = tokenEpoch;
  pendingTokenRequest = new Promise<string>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      ...(sessionEmail ? { prompt: '', login_hint: sessionEmail } : {}),
      callback: (resp: {
        access_token?: string;
        expires_in?: number;
        error?: string;
        error_description?: string;
      }) => {
        if (resp.error) {
          reject(new Error(resp.error_description || resp.error));
          return;
        }
        if (resp.access_token) {
          // Margen de 60 s antes de la expiración real (típicamente 3600 s).
          // Si hubo un cierre de sesión mientras la ventana estaba abierta, el token no se guarda.
          if (epochAtRequest === tokenEpoch) {
            const ttlMs = Math.max((Number(resp.expires_in) || 3600) - 60, 60) * 1000;
            cachedDriveToken = { token: resp.access_token, expiresAt: Date.now() + ttlMs };
          }
          resolve(resp.access_token);
        } else reject(new Error('No se recibió token de acceso'));
      },
      // Sin esto, si el popup se bloquea o se cierra, la promesa queda colgada y la UI gira para siempre.
      error_callback: (err: { type?: string; message?: string }) => {
        if (err?.type === 'popup_failed_to_open') {
          reject(
            new Error(
              'El navegador bloqueó la ventana emergente de Google. Permite ventanas emergentes para localhost:3000 (icono en la barra de direcciones) y vuelve a intentar.',
            ),
          );
        } else if (err?.type === 'popup_closed') {
          reject(
            new Error(
              'La ventana de Google se cerró antes de completar el acceso. Pulsa de nuevo "Conectar Contenedor 1" y elige tu cuenta.',
            ),
          );
        } else {
          reject(new Error(`No se pudo completar el acceso a Google: ${err?.message || err?.type || 'error desconocido'}`));
        }
      },
    });
    client.requestAccessToken();
  }).finally(() => {
    pendingTokenRequest = null;
  });
  return pendingTokenRequest;
}

async function listFilesInFolder(folderId: string, token: string): Promise<DriveFileMeta[]> {
  const out: DriveFileMeta[] = [];
  let pageToken: string | undefined;
  const q = `'${folderId}' in parents and trashed = false`;
  do {
    const params = new URLSearchParams({
      q,
      fields:
        'nextPageToken, files(id, name, mimeType, size, modifiedTime, shortcutDetails(targetId, targetMimeType))',
      pageSize: '100',
      // Sin estos dos parámetros, la API omite todo lo que viva en una unidad compartida.
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
      ...(pageToken ? { pageToken } : {}),
    });
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Drive API (listar): ${res.status} ${err}`);
    }
    const data = (await res.json()) as { nextPageToken?: string; files?: DriveFileMeta[] };
    out.push(...(data.files || []));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return out;
}

/** Metadatos de un archivo concreto (incluye unidades compartidas). */
async function fetchFileMeta(fileId: string, token: string): Promise<DriveFileMeta | null> {
  const params = new URLSearchParams({
    fields: 'id, name, mimeType, size, modifiedTime',
    supportsAllDrives: 'true',
  });
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as DriveFileMeta;
}

/**
 * Un acceso directo se comporta como el archivo o la carpeta a la que apunta: se
 * resuelve el destino para poder recorrerlo o leerlo. Conserva el nombre visible
 * del acceso directo cuando el destino no informa uno.
 */
async function resolveShortcut(item: DriveFileMeta, token: string): Promise<DriveFileMeta | null> {
  const targetId = item.shortcutDetails?.targetId;
  if (!targetId) return null;
  const meta = await fetchFileMeta(targetId, token);
  if (!meta) {
    return item.shortcutDetails?.targetMimeType
      ? { ...item, id: targetId, mimeType: item.shortcutDetails.targetMimeType }
      : null;
  }
  return { ...meta, name: meta.name || item.name };
}

/** Acumulador del recorrido: archivos leíbles, carpetas visitadas y elementos descartados. */
interface CollectStats {
  folderPaths: string[];
  skippedFiles: string[];
}

/**
 * Recorre la carpeta raíz y todas las subcarpetas (hasta MAX_FOLDER_DEPTH),
 * acumulando solo archivos con MIME soportado (no lista la URL en el navegador: usa la API de Drive).
 * Sigue accesos directos a carpetas y archivos, y anota lo que descarta.
 */
async function collectSupportedFilesRecursive(
  folderId: string,
  token: string,
  depth: number,
  acc: DriveFileMeta[],
  errors: string[],
  pathParts: string[] = [],
  stats: CollectStats = { folderPaths: [], skippedFiles: [] },
  visitedFolderIds: Set<string> = new Set(),
): Promise<CollectStats> {
  if (depth > MAX_FOLDER_DEPTH) {
    errors.push(
      `[aviso] Profundidad de carpetas mayor a ${MAX_FOLDER_DEPTH} en una rama; esa rama no se siguió.`,
    );
    return stats;
  }
  // Los accesos directos pueden formar ciclos entre carpetas.
  if (visitedFolderIds.has(folderId)) return stats;
  visitedFolderIds.add(folderId);
  if (pathParts.length) stats.folderPaths.push(pathParts.join('/'));
  if (acc.length >= MAX_FILES_TO_PROCESS) return stats;

  const items = await listFilesInFolder(folderId, token);
  for (const item of items) {
    if (acc.length >= MAX_FILES_TO_PROCESS) {
      errors.push(
        `[aviso] Se alcanzó el límite de ${MAX_FILES_TO_PROCESS} archivos; puede haber más en la carpeta.`,
      );
      return stats;
    }
    let entry = item;
    if (item.mimeType === SHORTCUT_MIME) {
      const resolved = await resolveShortcut(item, token);
      if (!resolved) {
        stats.skippedFiles.push(`${item.name} — acceso directo cuyo destino no se pudo abrir`);
        continue;
      }
      entry = resolved;
    }
    if (entry.mimeType === FOLDER_MIME) {
      await collectSupportedFilesRecursive(
        entry.id,
        token,
        depth + 1,
        acc,
        errors,
        [...pathParts, entry.name],
        stats,
        visitedFolderIds,
      );
    } else if (isSupportedMime(entry)) {
      acc.push({ ...entry, folderPath: pathParts });
    } else {
      const where = pathParts.length ? `${pathParts.join('/')}/` : '';
      stats.skippedFiles.push(`${where}${entry.name} — tipo no soportado (${entry.mimeType})`);
    }
  }
  return stats;
}

async function recognizeImageOcr(
  ocrWorker: TesseractWorker,
  buffer: ArrayBuffer,
  mimeType: string,
  label: string,
): Promise<string> {
  const blob = new Blob([buffer], { type: mimeType });
  const {
    data: { text },
  } = await ocrWorker.recognize(blob);
  const trimmed = text?.trim() || '';
  if (!trimmed) {
    return `(OCR sin texto detectado en ${label})`;
  }
  return trimmed;
}

async function extractOneFile(
  file: DriveFileMeta,
  token: string,
  ocrState: { worker: TesseractWorker | null },
): Promise<{ text: string; error?: string }> {
  if (file.mimeType === FOLDER_MIME) {
    return { text: '', error: undefined };
  }
  if (!isSupportedMime(file)) {
    return { text: '', error: `[omitido] ${file.name} — tipo no soportado (${file.mimeType})` };
  }

  try {
    const googleExport = GOOGLE_EXPORTS[file.mimeType];
    if (googleExport) {
      const params = new URLSearchParams({
        mimeType: googleExport.exportMime,
        supportsAllDrives: 'true',
      });
      const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}/export?${params}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Export ${googleExport.label}: ${res.status} ${t}`);
      }
      const text = await res.text();
      return { text: `\n--- ${googleExport.label}: ${file.name} ---\n${text}\n` };
    }

    const isImage = file.mimeType.startsWith('image/');
    const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_FILE_BYTES;
    if (file.size && Number(file.size) > maxBytes) {
      return { text: '', error: `[omitido] ${file.name} — archivo demasiado grande` };
    }

    const mediaParams = new URLSearchParams({ alt: 'media', supportsAllDrives: 'true' });
    const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?${mediaParams}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Descarga: ${res.status} ${t}`);
    }
    const buf = await res.arrayBuffer();

    if (isImage) {
      if (!ocrState.worker) {
        const { createWorker } = await import('tesseract.js');
        ocrState.worker = await createWorker(['spa', 'eng']);
      }
      const ocrText = await recognizeImageOcr(ocrState.worker, buf, file.mimeType, file.name);
      return { text: `\n--- Imagen (OCR): ${file.name} ---\n${ocrText}\n` };
    }

    if (file.mimeType === 'application/pdf') {
      const { extractTextFromPdf } = await import('@/lib/extractDocumentText');
      const text = await extractTextFromPdf(buf);
      return { text: `\n--- PDF: ${file.name} ---\n${text}\n` };
    }

    if (file.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const { extractTextFromDocx } = await import('@/lib/extractDocumentText');
      const text = await extractTextFromDocx(buf);
      return { text: `\n--- Word (DOCX): ${file.name} ---\n${text}\n` };
    }

    if (
      isPlainTextMime(file.mimeType) ||
      file.mimeType.startsWith('text/') ||
      (file.mimeType === 'application/octet-stream' && /\.(txt|md|markdown|csv)$/i.test(file.name))
    ) {
      const text = new TextDecoder('utf-8', { fatal: false }).decode(buf);
      return { text: `\n--- Texto plano (${file.name}) ---\n${text}\n` };
    }

    if (file.mimeType === 'application/msword') {
      return {
        text: '',
        error: `[omitido] ${file.name} — formato .doc antiguo no soportado (exporta a DOCX o PDF)`,
      };
    }

    return { text: '', error: `[omitido] ${file.name}` };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { text: '', error: `[error] ${file.name}: ${msg}` };
  }
}

/**
 * Igual que `extractOneFile`, pero primero consulta la caché local: si el
 * `modifiedTime` en Drive coincide con el guardado, reutiliza el texto sin
 * volver a descargar ni re-extraer.
 */
async function extractOneFileCached(
  file: DriveFileMeta,
  token: string,
  ocrState: { worker: TesseractWorker | null },
): Promise<{ text: string; error?: string; fromCache: boolean }> {
  const modifiedTime = file.modifiedTime || '';
  if (modifiedTime) {
    const hit = await getCachedDriveFile(file.id);
    if (hit && hit.modifiedTime === modifiedTime && hit.text) {
      return { text: hit.text, fromCache: true };
    }
  }
  const { text, error } = await extractOneFile(file, token, ocrState);
  if (text && modifiedTime) {
    await setCachedDriveFile({
      id: file.id,
      name: file.name,
      modifiedTime,
      text,
      cachedAt: Date.now(),
    });
  }
  return { text, error, fromCache: false };
}

/** Metadatos ligeros de un documento legible leído de Drive (para el inventario de fuentes propias). */
export interface DriveDocumentMeta {
  id: string;
  name: string;
  mimeType: string;
  /** Fecha ISO de última modificación en Drive, si Drive la informa. */
  modifiedTime?: string;
}

export interface LoadInstitutionalDriveResult {
  text: string;
  fileNames: string[];
  errors: string[];
  truncated: boolean;
  /** Caracteres del texto combinado antes de aplicar el límite (útil si hubo truncado). */
  sourceCharCount: number;
  /** Fuentes agrupadas por subcarpeta de territorio (C_TERRITORIO_ESPECIFICO); excluidas del texto general. */
  territories: DriveTerritorySources[];
  /** Detalle de lo recorrido y lo descartado, para verificar la lectura desde la interfaz. */
  diagnostics: DriveLoadDiagnostics;
  /** Documentos legibles con su fecha de modificación (inventario de fuentes propias). */
  documents: DriveDocumentMeta[];
}

/**
 * Rutas de las subcarpetas que hay bajo C_TERRITORIO_ESPECIFICO, relativas a esa carpeta.
 * Se omiten las rutas intermedias (si existe `HUILA/NEIVA` no se lista `HUILA` aparte).
 */
function territoryFolderNamesFromPaths(folderPaths: string[]): string[] {
  const relatives = new Set<string>();
  for (const path of folderPaths) {
    const parts = path.split('/');
    const idx = parts.findIndex((seg) => normalizeTerritoryName(seg).includes('TERRITORIO ESPECIFIC'));
    if (idx !== -1 && idx + 1 < parts.length) relatives.add(parts.slice(idx + 1).join('/'));
  }
  const all = [...relatives];
  return all.filter((p) => !all.some((other) => other !== p && other.startsWith(`${p}/`)));
}

export async function loadInstitutionalDocumentsFromDrive(
  folderId: string = INSTITUTIONAL_DRIVE_FOLDER_ID,
): Promise<LoadInstitutionalDriveResult> {
  // MODO DEMOSTRACIÓN: devuelve fuentes de ejemplo sin abrir la ventana de Google.
  if (useStore.getState().demoMode) {
    await new Promise((r) => setTimeout(r, 1600));
    return DEMO_DRIVE_RESULT;
  }
  await loadGoogleIdentityScript();
  const token = await requestDriveReadonlyToken();

  const candidates: DriveFileMeta[] = [];
  const errors: string[] = [];
  const stats = await collectSupportedFilesRecursive(folderId, token, 0, candidates, errors);

  const ocrState: { worker: TesseractWorker | null } = { worker: null };
  const chunks: string[] = [];
  const fileNames: string[] = [];
  const documents: DriveDocumentMeta[] = [];
  const filePaths: string[] = [];
  const territoryMap = new Map<
    string,
    { name: string; chunks: string[]; fileNames: string[]; folderNames: Set<string> }
  >();
  let fromCacheCount = 0;

  try {
    for (const file of candidates) {
      const { text, error, fromCache } = await extractOneFileCached(file, token, ocrState);
      if (error) errors.push(error);
      if (!text) {
        const where = file.folderPath?.length ? `${file.folderPath.join('/')}/` : '';
        stats.skippedFiles.push(`${where}${file.name} — sin texto legible`);
      }
      if (text) {
        fileNames.push(file.name);
        documents.push({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          modifiedTime: file.modifiedTime,
        });
        filePaths.push(`${file.folderPath?.length ? `${file.folderPath.join('/')}/` : ''}${file.name}`);
        if (fromCache) fromCacheCount++;
        const territory = territoryNameForFile(file);
        if (territory) {
          const key = normalizeTerritoryName(territory.name);
          const entry =
            territoryMap.get(key) || { name: territory.name, chunks: [], fileNames: [], folderNames: new Set<string>() };
          entry.chunks.push(text);
          entry.fileNames.push(file.name);
          for (const seg of territory.segments) entry.folderNames.add(seg);
          territoryMap.set(key, entry);
        } else {
          chunks.push(text);
        }
      }
    }
  } finally {
    if (ocrState.worker) {
      await ocrState.worker.terminate();
      ocrState.worker = null;
    }
  }

  const territories: DriveTerritorySources[] = [...territoryMap.values()].map((t) => ({
    name: t.name,
    text: t.chunks.join('\n'),
    fileNames: t.fileNames,
    folderNames: [...t.folderNames],
  }));

  // Limpia entradas de archivos que ya no existen en la carpeta.
  await pruneDriveCache(new Set(candidates.map((f) => f.id)));

  // La lectura desde caché local es un detalle interno: no se notifica al usuario.
  if (fromCacheCount > 0) {
    console.info(
      `[Contenedor 1] ${fromCacheCount} de ${fileNames.length} archivos se leyeron desde la caché local.`,
    );
  }

  let combined = chunks.join('\n');
  const territoryCharCount = territories.reduce((sum, t) => sum + t.text.length, 0);
  const sourceCharCount = combined.length + territoryCharCount;
  const maxChars = getMaxInstitutionalTextChars();
  let truncated = false;
  if (combined.length > maxChars) {
    combined = combined.slice(0, maxChars);
    truncated = true;
    errors.push(
      `[aviso] Texto general extraído: ${sourceCharCount.toLocaleString()} caracteres. Para el modelo se usan los primeros ${maxChars.toLocaleString()} (límite configurable con VITE_MAX_INSTITUTIONAL_CHARS).`,
    );
  }

  const diagnostics: DriveLoadDiagnostics = {
    folderPaths: stats.folderPaths,
    filePaths,
    skippedFiles: stats.skippedFiles,
    territoryFolderNames: territoryFolderNamesFromPaths(stats.folderPaths),
  };

  return { text: combined, fileNames, errors, truncated, sourceCharCount, territories, diagnostics, documents };
}

/**
 * Extrae el identificador de carpeta de un enlace de Google Drive.
 * Acepta enlaces `…/folders/<id>`, `open?id=<id>` o el propio id pegado a secas.
 * Devuelve null si no reconoce un identificador válido.
 */
export function extractDriveFolderId(input: string): string | null {
  const raw = (input || '').trim();
  if (!raw) return null;
  const byFolders = raw.match(/\/folders\/([a-zA-Z0-9_-]{10,})/);
  if (byFolders) return byFolders[1];
  const byId = raw.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (byId) return byId[1];
  // Un id pegado a secas (sin URL): solo caracteres válidos y sin espacios.
  if (/^[a-zA-Z0-9_-]{10,}$/.test(raw)) return raw;
  return null;
}

/** Estados de la conexión de fuentes propias que la Fase 2 traduce a un indicador (bombillo). */
export type EstadoConexionFuentes =
  | 'CONECTADA'
  | 'VACIA'
  | 'SIN_PERMISO'
  | 'NO_ENCONTRADA'
  | 'SESION_CADUCADA'
  | 'ACCESO_REVOCADO'
  | 'ERROR_RED';

/** Error de conexión con un `code` estable para pintar el estado correcto en la interfaz. */
export class DriveFolderError extends Error {
  code: EstadoConexionFuentes;
  constructor(code: EstadoConexionFuentes, message: string) {
    super(message);
    this.name = 'DriveFolderError';
    this.code = code;
  }
}

/** Traduce una respuesta HTTP de Drive (no-OK) al estado tipado del indicador. */
function estadoDesdeHttp(status: number): EstadoConexionFuentes {
  if (status === 401) return 'SESION_CADUCADA';
  if (status === 403) return 'SIN_PERMISO';
  if (status === 404) return 'NO_ENCONTRADA';
  return 'ERROR_RED';
}

/**
 * Verifica que un enlace de carpeta de Drive sea accesible con la sesión activa y lee
 * sus documentos legibles (fuentes propias del territorio, Cambio B). Reutiliza la
 * misma lectura recursiva que el Contenedor 1, pero sobre la carpeta que pega el líder.
 *
 * Devuelve el estado (`CONECTADA` con documentos o `VACIA` sin ellos), el paquete de
 * texto para el generador y el inventario. Lanza `DriveFolderError` con un `code`
 * estable para los demás estados (sin permiso, no encontrada, sesión caducada, red).
 */
export async function connectOwnSourcesFolder(folderId: string): Promise<{
  status: 'CONECTADA' | 'VACIA';
  result: LoadInstitutionalDriveResult;
}> {
  const demo = useStore.getState().demoMode;
  if (demo) {
    await new Promise((r) => setTimeout(r, 500));
    return { status: 'CONECTADA', result: DEMO_DRIVE_RESULT };
  }
  await loadGoogleIdentityScript();
  let token: string;
    try {
      token = await requestDriveReadonlyToken();
    } catch (e) {
      throw new DriveFolderError(
        'SESION_CADUCADA',
        e instanceof Error ? e.message : 'No se pudo renovar el acceso a Google Drive.',
      );
    }
    // Comprobación previa: existencia y permiso de la carpeta, para distinguir 403/404.
    let meta: Response;
    try {
      const params = new URLSearchParams({ fields: 'id, name, mimeType', supportsAllDrives: 'true' });
      meta = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?${params}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch {
      throw new DriveFolderError('ERROR_RED', 'No se pudo contactar con Google Drive. Revisa tu conexión.');
    }
    if (!meta.ok) {
      const code = estadoDesdeHttp(meta.status);
      const mensajes: Record<EstadoConexionFuentes, string> = {
        CONECTADA: '',
        VACIA: '',
        SIN_PERMISO: 'La carpeta existe pero tu cuenta no tiene permiso para leerla. Pide acceso o compártela con tu correo institucional.',
        NO_ENCONTRADA: 'No se encontró ninguna carpeta con ese enlace. Verifica que sea correcto y que no esté en la papelera.',
        SESION_CADUCADA: 'La sesión de Google caducó. Vuelve a ingresar y reintenta.',
        ACCESO_REVOCADO: 'Se revocó el acceso a Drive. Vuelve a ingresar y otorga permiso de lectura.',
        ERROR_RED: 'No se pudo contactar con Google Drive. Revisa tu conexión.',
      };
      throw new DriveFolderError(code, mensajes[code]);
    }
    const info = (await meta.json()) as { mimeType?: string };
    if (info.mimeType && info.mimeType !== FOLDER_MIME && info.mimeType !== SHORTCUT_MIME) {
      throw new DriveFolderError(
        'NO_ENCONTRADA',
        'El enlace apunta a un archivo, no a una carpeta. Pega el enlace de la carpeta que contiene tus fuentes.',
      );
    }

  let result: LoadInstitutionalDriveResult;
  try {
    result = await loadInstitutionalDocumentsFromDrive(folderId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const m = msg.match(/\b(401|403|404)\b/);
    throw new DriveFolderError(m ? estadoDesdeHttp(Number(m[1])) : 'ERROR_RED', msg);
  }
  return { status: result.fileNames.length > 0 ? 'CONECTADA' : 'VACIA', result };
}

/**
 * Nombre comparable de un archivo: sin extensión, sin tildes, con guiones y guiones
 * bajos como espacios y en mayúsculas. Así `CONTENEDOR__1.txt`, `Contenedor 1` y el
 * mismo archivo convertido a Google Doc (sin extensión) se reconocen como el mismo.
 */
function fileKey(name: string): string {
  return normalizeTerritoryName(name.trim().replace(/\.(txt|md|markdown|csv|docx?|pdf|rtf|gdoc)$/i, ''));
}

/**
 * Palabras que no identifican a un archivo concreto del repositorio: aparecen en
 * varios nombres o son ruido de versionado («prompt», «v2», «actualizada», «copia»).
 * Se descartan al comparar por términos, para que `prompt_documento_fundante.txt`
 * reconozca también a `fundante_v3` o a `proyecto de innovación (1)`.
 */
const GENERIC_NAME_TOKENS = new Set([
  'PROMPT', 'PROMPTS', 'INSTRUCCION', 'INSTRUCCIONES', 'DOCUMENTO', 'DOCUMENTOS',
  'ARCHIVO', 'FORMATO', 'VERSION', 'ACTUALIZADA', 'ACTUALIZADO', 'ACTUALIZACION',
  'FINAL', 'COPIA', 'COPY', 'V1', 'V2', 'V3', 'V4', 'Centro de Innovación', 'UNAD',
  'DE', 'DEL', 'LA', 'EL', 'LOS', 'LAS', 'Y', 'PARA',
]);

/** Términos que sí distinguen a este archivo de los demás del repositorio. */
function distinctiveTokens(key: string): string[] {
  return key.split(' ').filter((token) => token && !GENERIC_NAME_TOKENS.has(token));
}

/**
 * Niveles de coincidencia, del más preciso al más tolerante. Se comparan por nivel
 * (no por candidato) para que un nombre exacto siempre gane frente a uno aproximado.
 */
const NAME_MATCH_TIERS = ['exact', 'prefix', 'tokens'] as const;
type NameMatchTier = (typeof NAME_MATCH_TIERS)[number];

/**
 * ¿Con qué nivel de precisión el nombre de un archivo corresponde al nombre esperado?
 * `exact` mismo nombre sin extensión; `prefix` el archivo añade un sufijo (« 1», «_v2»);
 * `tokens` contiene todos los términos distintivos aunque cambie el orden o falten palabras
 * genéricas. Devuelve null si no corresponde.
 */
function nameMatchTier(nameKey: string, candidateKey: string): NameMatchTier | null {
  if (!nameKey || !candidateKey) return null;
  if (nameKey === candidateKey) return 'exact';
  if (nameKey.startsWith(candidateKey)) return 'prefix';
  const wanted = distinctiveTokens(candidateKey);
  if (!wanted.length) return null;
  const present = new Set(nameKey.split(' '));
  return wanted.every((token) => present.has(token)) ? 'tokens' : null;
}

/**
 * Localiza, entre una lista de elementos con nombre, el que corresponde a un archivo de
 * referencia del repositorio (probando su nombre vigente y los históricos).
 *
 * Es la **única** regla de emparejamiento del sistema: la usan el aviso de archivos
 * faltantes de la Fase 2, la extracción desde el texto combinado y la descarga directa
 * desde Drive, para que las tres coincidan siempre en qué archivo es cuál. No se aplica
 * a las listas de prioridad/exclusión del bloque institucional, donde un falso positivo
 * descartaría en silencio una fuente real del territorio.
 */
export function findByReferenceName<T>(
  items: readonly T[],
  nameOf: (item: T) => string,
  candidates: string[],
): T | null {
  const candidateKeys = candidates.map(fileKey).filter(Boolean);
  for (const tier of NAME_MATCH_TIERS) {
    for (const candidateKey of candidateKeys) {
      const hit = items.find((item) => nameMatchTier(fileKey(nameOf(item)), candidateKey) === tier);
      if (hit) return hit;
    }
  }
  return null;
}

/**
 * ¿El nombre (o la ruta) corresponde a alguno de los nombres candidatos? Compara sin
 * extensión ni tildes, de modo que da igual si el archivo del repositorio está como
 * `.txt` o convertido a Google Doc.
 */
export function fileNameMatchesAny(nameOrPath: string, candidates: string[]): boolean {
  const name = nameOrPath.split('/').pop() || '';
  return findByReferenceName([name], (n) => n, candidates) !== null;
}

/** Marcadores que escribe `extractOneFile` al inicio del texto de cada archivo. */
const BUNDLE_MARKER_RE =
  /(?:^|\n)---[ \t]*(?:Texto plano \(([^)]*)\)|(?:Google Doc|Google Sheet|Google Slides|PDF|Word \(DOCX\)|Imagen \(OCR\)):[ \t]*([^\n]*?))[ \t]*---[ \t]*\r?\n/g;

/** Secciones del bloque combinado, con el nombre del archivo, su marcador original y su contenido. */
function scanBundleSections(bundleText: string): { name: string; marker: string; text: string }[] {
  const found: { name: string; markerStart: number; contentStart: number }[] = [];
  BUNDLE_MARKER_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = BUNDLE_MARKER_RE.exec(bundleText)) !== null) {
    const name = (m[1] ?? m[2] ?? '').trim();
    if (name) found.push({ name, markerStart: m.index, contentStart: BUNDLE_MARKER_RE.lastIndex });
  }
  return found.map((section, i) => ({
    name: section.name,
    marker: bundleText.slice(section.markerStart, section.contentStart).trim(),
    text: bundleText.slice(section.contentStart, found[i + 1]?.markerStart ?? bundleText.length).trim(),
  }));
}

/**
 * Busca un archivo dentro del bloque combinado devuelto por `loadInstitutionalDocumentsFromDrive`,
 * probando varios nombres candidatos (vigente + históricos) y sin exigir que la extensión coincida.
 */
export function extractFirstInstitutionalFileFromBundle(
  bundleText: string,
  fileNames: string[],
): string | null {
  if (!bundleText.trim()) return null;
  const sections = scanBundleSections(bundleText).filter((s) => s.text);
  if (!sections.length) return null;
  const hit = findByReferenceName(sections, (s) => s.name, fileNames);
  if (hit && fileKey(hit.name) !== fileKey(fileNames[0] ?? '')) {
    console.info(`[Drive] «${fileNames[0]}» se resolvió al archivo «${hit.name}» del texto combinado.`);
  }
  return hit?.text ?? null;
}

export interface PrioritizedInstitutionalBlock {
  text: string;
  /** Aviso para el prompt cuando algún archivo quedó fuera o recortado. */
  notice: string;
  /** Nombres de los archivos incluidos, en el orden en que se enviaron. */
  includedFiles: string[];
  /** Archivos que no cupieron en el presupuesto de caracteres. */
  droppedFiles: string[];
  /** Archivos cuyo contenido menciona las palabras buscadas (`options.keywords`). */
  keywordMatchedFiles: string[];
}

/** Texto comparable con las palabras que devuelve `keywordsFromText` (sin tildes, en mayúsculas). */
function searchKey(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ');
}

/** Cuántas de las palabras buscadas aparecen en el archivo; 0 si no se busca nada. */
function keywordHits(sectionText: string, keywords: readonly string[]): number {
  if (!keywords.length) return 0;
  const haystack = searchKey(sectionText);
  return keywords.filter((k) => haystack.includes(k)).length;
}

/**
 * Arma el bloque de fuentes de Drive que se envía al modelo respetando un presupuesto
 * de caracteres, pero **por archivo completo y por prioridad** en vez de cortar el
 * texto combinado por la mitad: primero los archivos prioritarios (p. ej. el resultado
 * del Contenedor 1), luego el resto, y sin gastar presupuesto en los archivos excluidos
 * (los prompts de instrucción, que ya viajan aparte y no son fuente de datos).
 *
 * `options.keywords` reordena dentro de cada grupo: cuando la Ficha Base declara un tema
 * previsto, los archivos que lo mencionan entran antes que los demás, para que el
 * presupuesto no se agote justo en el material que podría sustentarlo o contradecirlo.
 */
export function buildPrioritizedInstitutionalBlock(
  bundleText: string,
  maxChars: number,
  options: { priority?: string[]; exclude?: string[]; keywords?: readonly string[] } = {},
): PrioritizedInstitutionalBlock {
  const empty = { text: '', notice: '', includedFiles: [], droppedFiles: [], keywordMatchedFiles: [] };
  if (!bundleText.trim() || maxChars <= 0) return empty;

  const sections = scanBundleSections(bundleText);
  if (!sections.length) {
    // Sin marcadores reconocibles se conserva el comportamiento anterior (corte simple).
    return bundleText.length <= maxChars
      ? { ...empty, text: bundleText }
      : {
          ...empty,
          text: bundleText.slice(0, maxChars),
          notice: `\n\n--- AVISO DEL SISTEMA ---\nLas fuentes de Google Drive superaban el límite de contexto del modelo (${bundleText.length.toLocaleString()} caracteres): se enviaron los primeros ${maxChars.toLocaleString()}.\n`,
        };
  }

  const priorityKeys = (options.priority ?? []).map(fileKey).filter(Boolean);
  const excludeKeys = (options.exclude ?? []).map(fileKey).filter(Boolean);
  const keywords = options.keywords ?? [];
  const matches = (name: string, keys: string[]) => {
    const key = fileKey(name);
    return keys.some((k) => key === k || key.startsWith(k));
  };

  const usable = sections
    .filter((s) => s.text && !matches(s.name, excludeKeys))
    .map((s) => ({ ...s, hits: keywordHits(s.text, keywords) }));
  const keywordMatchedFiles = usable.filter((s) => s.hits > 0).map((s) => s.name);
  // Orden estable: el criterio principal sigue siendo la prioridad por nombre de archivo.
  const byKeywords = (a: { hits: number }, b: { hits: number }) => b.hits - a.hits;
  const ordered = [
    ...usable.filter((s) => matches(s.name, priorityKeys)).sort(byKeywords),
    ...usable.filter((s) => !matches(s.name, priorityKeys)).sort(byKeywords),
  ];

  const parts: string[] = [];
  const includedFiles: string[] = [];
  const droppedFiles: string[] = [];
  let used = 0;
  let truncatedFile: string | null = null;
  for (const section of ordered) {
    const chunk = `${section.marker}\n${section.text}\n`;
    const remaining = maxChars - used;
    if (chunk.length <= remaining) {
      parts.push(chunk);
      includedFiles.push(section.name);
      used += chunk.length;
      continue;
    }
    // Un archivo prioritario recortado sigue siendo más útil que omitirlo entero.
    if (!truncatedFile && remaining > 2_000) {
      parts.push(`${chunk.slice(0, remaining - 200)}\n[… «${section.name}» continúa; recortado por límite del modelo …]\n`);
      includedFiles.push(section.name);
      used = maxChars;
      truncatedFile = section.name;
      continue;
    }
    droppedFiles.push(section.name);
  }

  const noticeLines: string[] = [];
  if (truncatedFile) {
    noticeLines.push(`El archivo «${truncatedFile}» se envió recortado por el límite de contexto del modelo.`);
  }
  if (droppedFiles.length) {
    noticeLines.push(
      `No cupieron ${droppedFiles.length} archivo(s) de Drive: ${droppedFiles.join(', ')}. Trabaja solo con las fuentes incluidas y marca los vacíos como pendientes de verificación humana.`,
    );
  }
  const notice = noticeLines.length
    ? `\n\n--- AVISO DEL SISTEMA ---\n${noticeLines.join('\n')}\nPuedes ampliar el presupuesto con \`VITE_MAX_COMBINED_SOURCE_CHARS\` en .env.local (sigue existiendo un tope de tokens en la API).\n`
    : '';

  return { text: parts.join('\n'), notice, includedFiles, droppedFiles, keywordMatchedFiles };
}

function stripDriveExtractHeader(chunk: string): string {
  return chunk.replace(/^\s*[\r\n]*---[\s\S]*?---\s*[\r\n]*/, '').trim();
}

/**
 * Descarga y extrae texto de un archivo por nombre exacto (sin distinguir mayúsculas) dentro de la carpeta
 * institucional (recursivo). Acepta varios nombres candidatos y usa el primero que exista.
 * Útil cuando el bundle completo no está cargado o el archivo quedó fuera del truncado.
 */
export async function fetchInstitutionalDriveFileByName(
  fileName: string | string[],
  folderId: string = INSTITUTIONAL_DRIVE_FOLDER_ID,
): Promise<string | null> {
  await loadGoogleIdentityScript();
  const token = await requestDriveReadonlyToken();
  const candidates: DriveFileMeta[] = [];
  const collectErrors: string[] = [];
  await collectSupportedFilesRecursive(folderId, token, 0, candidates, collectErrors);
  if (collectErrors.length) console.warn(collectErrors.join('\n'));
  const wantedNames = Array.isArray(fileName) ? fileName : [fileName];
  // Nombre literal primero; si no, la regla común de emparejamiento (sin extensión ni
  // tildes, tolerante a sufijos de versión), que es la misma del aviso de la Fase 2.
  const meta =
    candidates.find((f) =>
      wantedNames.some((want) => f.name.trim().toLowerCase() === want.trim().toLowerCase()),
    ) ?? findByReferenceName(candidates, (f) => f.name, wantedNames);
  if (!meta) {
    console.warn(
      `[Drive] No se encontró «${wantedNames[0]}» entre los ${candidates.length} archivos legibles del repositorio: ${candidates
        .map((f) => f.name)
        .join(', ')}`,
    );
    return null;
  }
  if (meta.name.trim().toLowerCase() !== wantedNames[0]?.trim().toLowerCase()) {
    console.info(`[Drive] «${wantedNames[0]}» se resolvió al archivo «${meta.name}».`);
  }

  const ocrState: { worker: TesseractWorker | null } = { worker: null };
  try {
    const { text, error } = await extractOneFileCached(meta, token, ocrState);
    if (error) console.warn(error);
    if (!text?.trim()) return null;
    return stripDriveExtractHeader(text);
  } finally {
    if (ocrState.worker) {
      await ocrState.worker.terminate();
      ocrState.worker = null;
    }
  }
}

/** Texto del prompt maestro del árbol de innovación en Drive (misma carpeta institucional). */
export async function fetchInnovationTreePromptFromDrive(
  folderId: string = INSTITUTIONAL_DRIVE_FOLDER_ID,
): Promise<string | null> {
  return fetchInstitutionalDriveFileByName(DRIVE_REFERENCE_PROMPT_ARBOL_INNOVACION_CANDIDATES, folderId);
}

/** Instrucción oficial de redacción del proyecto de innovación (Fase 3, cada apartado). */
export async function fetchInstruccionFundanteFromDrive(
  folderId: string = INSTITUTIONAL_DRIVE_FOLDER_ID,
): Promise<string | null> {
  return fetchInstitutionalDriveFileByName(DRIVE_REFERENCE_INSTRUCCION_FUNDANTE_CANDIDATES, folderId);
}

/**
 * Contenedor 1 completo (CONTENEDOR_1/). Se descarga aparte porque su Parte IV —el
 * registro de proyectos SIGIIP— queda fuera del texto institucional combinado cuando
 * este se recorta por límite de contexto, y ese registro es la fuente de los nombres
 * textuales de los proyectos en el apartado de experiencias previas.
 */
export async function fetchContenedor1FromDrive(
  folderId: string = INSTITUTIONAL_DRIVE_FOLDER_ID,
): Promise<string | null> {
  return fetchInstitutionalDriveFileByName(DRIVE_REFERENCE_CONTENEDOR_1_CANDIDATES, folderId);
}

/** Prompt de vocación + tres temas Centro de Innovación (GENERALES/, Fase 3); acepta nombre vigente e histórico. */
export async function fetchVocacionCipPromptFromDrive(
  folderId: string = INSTITUTIONAL_DRIVE_FOLDER_ID,
): Promise<string | null> {
  return fetchInstitutionalDriveFileByName(DRIVE_REFERENCE_PROMPT_VOCACION_CIP_CANDIDATES, folderId);
}

/** Instrucción de ejecución del Contenedor 2 (CONTENEDOR_2/, Fase 2); acepta nombre vigente e histórico. */
export async function fetchContenedor2TerritorialPromptsDocFromDrive(
  folderId: string = INSTITUTIONAL_DRIVE_FOLDER_ID,
): Promise<string | null> {
  return fetchInstitutionalDriveFileByName(DRIVE_REFERENCE_PROMPTS_FUENTES_C2_TERRITORIAL_CANDIDATES, folderId);
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            prompt?: string;
            login_hint?: string;
            callback: (resp: {
              access_token?: string;
              expires_in?: number;
              error?: string;
              error_description?: string;
            }) => void;
            error_callback?: (err: { type?: string; message?: string }) => void;
          }) => { requestAccessToken: () => void };
          revoke: (token: string, callback?: () => void) => void;
        };
      };
    };
  }
}
