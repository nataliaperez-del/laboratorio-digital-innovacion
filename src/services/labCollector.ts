/**
 * Concentrador de datos del Laboratorio (lado del navegador). Envía al servidor de Hostinger
 * (`/api/lab`, `hostinger_deploy/includes/lab.php`) lo que cada persona hace: ingresos, uso de las
 * herramientas, encuestas, descargas y los resultados guardados con sus insumos.
 *
 * Reglas de comportamiento:
 * - Nunca frena a la persona ni muestra errores: si el servidor no está (por ejemplo, en el
 *   despliegue de respaldo, que no tiene base de datos) el Laboratorio funciona igual y los datos
 *   esperan en el navegador.
 * - Los eventos se acumulan y salen en lotes; los resultados salen cuando dejan de cambiar.
 * - Nada se envía sin el pase que el servidor entrega tras verificar la cuenta con Google.
 */
import { callAI, parseJsonResponse } from '@/services/ai';
import { useStore, type AppState } from '@/store/useStore';
import type { ReportModule } from '@/lib/labReports';
import {
  resultPayload,
  resultSignature,
  type GlobalDashboard,
  type GlobalResultRow,
  type LabEvent,
  type LabEventType,
  type SavedResult,
} from '@/lib/labData';
import { buildInsumosPrompt, fallbackInsumos, normalizeInsumos, type Insumo, type InsumosSelection, type InsumoType } from '@/lib/labInsumos';

const API = '/api/lab';
const PASS_KEY = 'lab-pase';
const QUEUE_KEY = 'lab-cola-eventos';
const SENT_KEY = 'lab-resultados-enviados';
const MAX_QUEUE = 400;
const BATCH = 80;
const FLUSH_MS = 30_000;
/** Un resultado se envía cuando lleva este tiempo sin cambiar: mientras se genera cambia a cada bloque. */
const RESULT_SETTLE_MS = 20_000;
const REQUEST_TIMEOUT_MS = 20_000;

interface LabPass {
  token: string;
  /** Segundos epoch. */
  expira: number;
  admin: boolean;
}

/** El servidor no tiene concentrador (404 o respuesta que no es suya): no se insiste en esta visita. */
let unavailable = false;
let flushTimer: number | undefined;
let flushing = false;
let zoePending = 0;
const resultTimers = new Map<string, number>();

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Sin espacio: los datos de esta visita se pierden, el Laboratorio sigue. */
  }
}

function currentPass(): LabPass | null {
  const pass = read<LabPass | null>(PASS_KEY, null);
  return pass && pass.token && pass.expira * 1000 > Date.now() + 60_000 ? pass : null;
}

/** ¿Hay conexión verificada con el concentrador? */
export const hasLabPass = () => !unavailable && currentPass() !== null;
/** ¿El servidor reconoce a esta cuenta como administradora? */
export const isLabAdmin = () => !unavailable && currentPass()?.admin === true;

class LabUnavailableError extends Error {}

async function request<T>(path: string, init: { method?: 'GET' | 'POST'; body?: unknown; keepalive?: boolean; auth?: boolean } = {}): Promise<T> {
  const pass = currentPass();
  if (init.auth !== false && !pass) throw new LabUnavailableError('Sin pase.');
  const response = await fetch(`${API}/${path}`, {
    method: init.method ?? 'GET',
    headers: { ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(pass && init.auth !== false ? { 'X-Lab-Token': pass.token } : {}) },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    keepalive: init.keepalive,
    signal: init.keepalive ? undefined : AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const isJson = (response.headers.get('content-type') ?? '').includes('application/json');
  if (response.status === 404 || !isJson) {
    // No hay concentrador en este servidor (o respondió la página en vez de la API).
    unavailable = true;
    throw new LabUnavailableError('El servidor no tiene concentrador de datos.');
  }
  const data = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (response.status === 401) {
    localStorage.removeItem(PASS_KEY);
    throw new LabUnavailableError(data?.error || 'El pase venció.');
  }
  if (!response.ok || !data) throw new Error(data?.error || `El servidor respondió ${response.status}.`);
  return data;
}

// ── Sesión ──

/**
 * Cambia el ingreso de Google por el pase del Laboratorio. Se llama una vez, al ingresar.
 * Si falla, el ingreso sigue: solo queda sin concentrar lo de esta visita.
 */
export async function openLabSession(accessToken: string, name: string): Promise<void> {
  try {
    const pass = await request<LabPass>('sesion', { method: 'POST', auth: false, body: { access_token: accessToken, nombre: name, consentimiento: true } });
    write(PASS_KEY, { token: pass.token, expira: pass.expira, admin: pass.admin === true });
    track('ingreso');
    void flush();
  } catch (e) {
    if (!(e instanceof LabUnavailableError)) console.info('[Concentrador] No se pudo abrir la sesión de datos:', e);
  }
}

/** Al salir: se envía lo pendiente y se olvida el pase. Lo que no alcance a salir se descarta para no atribuirlo a otra cuenta. */
export function closeLabSession(): void {
  void flush(true).finally(() => {
    localStorage.removeItem(PASS_KEY);
    localStorage.removeItem(QUEUE_KEY);
  });
}

// ── Eventos ──

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Anota un evento de uso. Sale en el siguiente lote. */
export function track(tipo: LabEventType, modulo?: ReportModule, datos?: Record<string, unknown>): void {
  if (unavailable) return;
  const queue = read<LabEvent[]>(QUEUE_KEY, []);
  queue.push({ id: newId(), tipo, modulo, at: new Date().toISOString(), datos });
  write(QUEUE_KEY, queue.slice(-MAX_QUEUE));
  scheduleFlush();
}

function scheduleFlush(): void {
  if (flushTimer !== undefined || typeof window === 'undefined') return;
  flushTimer = window.setTimeout(() => {
    flushTimer = undefined;
    void flush();
  }, FLUSH_MS);
}

/** Envía los eventos acumulados. Con `leaving`, usa un envío que sobrevive al cierre de la pestaña. */
export async function flush(leaving = false): Promise<void> {
  if (flushing || unavailable || !currentPass()) return;
  if (zoePending > 0) {
    const cantidad = zoePending;
    zoePending = 0;
    const queue = read<LabEvent[]>(QUEUE_KEY, []);
    queue.push({ id: newId(), tipo: 'zoe', at: new Date().toISOString(), datos: { cantidad } });
    write(QUEUE_KEY, queue.slice(-MAX_QUEUE));
  }
  flushing = true;
  try {
    for (;;) {
      const queue = read<LabEvent[]>(QUEUE_KEY, []);
      if (!queue.length) break;
      const batch = queue.slice(0, BATCH);
      await request('eventos', { method: 'POST', body: { eventos: batch }, keepalive: leaving });
      // Se quitan solo los enviados: entre tanto pudieron entrar otros.
      const sent = new Set(batch.map((e) => e.id));
      write(
        QUEUE_KEY,
        read<LabEvent[]>(QUEUE_KEY, []).filter((e) => !sent.has(e.id)),
      );
      if (leaving) break;
    }
  } catch (e) {
    // Sin red o servidor ocupado: quedan en la cola y salen en el siguiente intento.
    if (!(e instanceof LabUnavailableError)) scheduleFlush();
  } finally {
    flushing = false;
  }
}

/** Mide una generación completa de una herramienta y anota si terminó bien y cuánto tardó. */
export async function trackGeneration<T>(modulo: ReportModule, run: () => Promise<T>): Promise<T> {
  const started = Date.now();
  try {
    const result = await run();
    track('generacion', modulo, { ok: true, segundos: Math.round((Date.now() - started) / 1000) });
    return result;
  } catch (e) {
    const cancelled = e instanceof Error && e.name === 'GenerationCancelledError';
    if (!cancelled) track('generacion', modulo, { ok: false, segundos: Math.round((Date.now() - started) / 1000), motivo: e instanceof Error ? e.name : 'Error' });
    throw e;
  }
}

// ── Resultados e insumos ──

/** Filtro con IA: elige lo más relevante del resultado. Si la IA falla, se usan las reglas. */
async function selectInsumos(result: SavedResult, title: string, place: string): Promise<InsumosSelection> {
  try {
    const raw = await callAI(buildInsumosPrompt(result, title, place), { maxOutputTokens: 2048, detached: true, thinkingBudget: 256 });
    const selection = normalizeInsumos(parseJsonResponse(raw));
    if (selection) return selection;
  } catch (e) {
    console.info('[Concentrador] El filtro con IA no respondió; se usan los insumos por reglas.', e);
  }
  return fallbackInsumos(result);
}

async function sendResult(result: SavedResult): Promise<void> {
  if (unavailable || !currentPass()) return;
  const signature = resultSignature(result);
  const sent = read<Record<string, string>>(SENT_KEY, {});
  if (sent[result.item.id] === signature) return;
  const payload = resultPayload(result, useStore.getState().prompt0Data);
  const place = [payload.municipio, payload.departamento].filter(Boolean).join(', ');
  try {
    const selection = await selectInsumos(result, payload.titulo, place);
    await request('resultado', { method: 'POST', body: { ...payload, sintesis: selection.sintesis, insumos: selection.insumos, origenInsumos: selection.origen } });
    write(SENT_KEY, { ...read<Record<string, string>>(SENT_KEY, {}), [result.item.id]: signature });
  } catch (e) {
    if (!(e instanceof LabUnavailableError)) console.info('[Concentrador] No se pudo enviar un resultado; se reintenta en la próxima visita.', e);
  }
}

/** Programa el envío de un resultado para cuando deje de cambiar. */
function queueResult(result: SavedResult): void {
  if (unavailable || typeof window === 'undefined') return;
  const id = result.item.id;
  window.clearTimeout(resultTimers.get(id));
  resultTimers.set(
    id,
    window.setTimeout(() => {
      resultTimers.delete(id);
      // Se lee de nuevo: lo que se envía es la versión actual, no la de cuando se programó.
      const fresh = savedResults(useStore.getState()).find((r) => r.item.id === id);
      if (fresh) void sendResult(fresh);
    }, RESULT_SETTLE_MS),
  );
}

function savedResults(state: AppState): SavedResult[] {
  return [
    ...state.savedStudies.map((item) => ({ modulo: 'estudio' as const, item })),
    ...state.savedIdeations.map((item) => ({ modulo: 'ideacion' as const, item })),
    ...state.savedTrees.map((item) => ({ modulo: 'arbol' as const, item })),
    ...state.prototypes.map((item) => ({ modulo: 'prototipado' as const, item })),
  ];
}

/** Lo que cambió entre dos estados y hay que concentrar. Puro, para poder probarlo. */
export function changesToCollect(state: AppState, prev: AppState) {
  const sameResults =
    state.savedStudies === prev.savedStudies && state.savedIdeations === prev.savedIdeations && state.savedTrees === prev.savedTrees && state.prototypes === prev.prototypes;
  const before = sameResults ? null : new Map(savedResults(prev).map((r) => [r.item.id, resultSignature(r)]));
  return {
    results: before ? savedResults(state).filter((r) => before.get(r.item.id) !== resultSignature(r)) : [],
    surveys: (state.surveyResponses ?? []).filter((r) => !(prev.surveyResponses ?? []).includes(r)),
    downloads: (state.downloads ?? []).filter((d) => !(prev.downloads ?? []).includes(d)),
    zoe: Math.max(0, (state.zoeInteractions || 0) - (prev.zoeInteractions || 0)),
    badges: (state.acknowledgedBadges ?? []).filter((b) => !(prev.acknowledgedBadges ?? []).includes(b)),
  };
}

/**
 * Activa el concentrador: observa el estado y envía lo nuevo. Empieza cuando termina de cargarse
 * lo guardado en el navegador, y pone al día los resultados que aún no se hayan enviado.
 */
export function startLabCollector(): () => void {
  let unsubscribe = () => undefined as void;
  const onChange = (state: AppState, prev: AppState) => {
    const changes = changesToCollect(state, prev);
    changes.results.forEach(queueResult);
    for (const r of changes.surveys) track('encuesta', r.module, { utilidad: r.utilidad, facilidad: r.facilidad, recomendacion: r.recomendacion, format: r.format });
    for (const d of changes.downloads) track('descarga', d.module, { format: d.format });
    for (const b of changes.badges) track('insignia', undefined, { insignia: b });
    if (changes.zoe) {
      zoePending += changes.zoe;
      scheduleFlush();
    }
  };
  const onHide = () => {
    if (document.visibilityState === 'hidden') void flush(true);
  };
  const start = () => {
    const sent = read<Record<string, string>>(SENT_KEY, {});
    savedResults(useStore.getState())
      .filter((r) => sent[r.item.id] !== resultSignature(r))
      .forEach(queueResult);
    unsubscribe = useStore.subscribe(onChange);
    document.addEventListener('visibilitychange', onHide);
    scheduleFlush();
  };
  const stopAll = () => {
    unsubscribe();
    document.removeEventListener('visibilitychange', onHide);
    window.clearTimeout(flushTimer);
    flushTimer = undefined;
    resultTimers.forEach((timer) => window.clearTimeout(timer));
    resultTimers.clear();
  };
  if (useStore.persist.hasHydrated()) {
    start();
    return stopAll;
  }
  const stopWaiting = useStore.persist.onFinishHydration(() => {
    stopWaiting();
    start();
  });
  return () => {
    stopWaiting();
    stopAll();
  };
}

// ── Consulta (tablero global, Contenedor global y banco de insumos) ──

export const fetchGlobalDashboard = () => request<GlobalDashboard>('tablero');

export function fetchGlobalResults(params: { modulo?: ReportModule | null; q?: string; pagina?: number }) {
  const query = new URLSearchParams({ pagina: String(params.pagina ?? 1), ...(params.modulo ? { modulo: params.modulo } : {}), ...(params.q?.trim() ? { q: params.q.trim() } : {}) });
  return request<{ total: number; pagina: number; porPagina: number; resultados: GlobalResultRow[] }>(`resultados?${query}`);
}

export const fetchGlobalResult = (id: number) =>
  request<{ modulo: ReportModule; titulo: string; autor: string; sintesis: string; documento: Record<string, unknown> | null }>(`resultado?id=${id}`);

/** Un insumo del banco, sin autor. */
export interface BankInsumo extends Insumo {
  id: number;
  modulo: ReportModule;
  departamento: string;
  municipio: string;
  origen: 'ia' | 'reglas';
  creadoEn: string;
}

export function fetchInsumos(params: { tipo?: InsumoType | null; q?: string; pagina?: number }) {
  const query = new URLSearchParams({ pagina: String(params.pagina ?? 1), ...(params.tipo ? { tipo: params.tipo } : {}), ...(params.q?.trim() ? { q: params.q.trim() } : {}) });
  return request<{ total: number; pagina: number; porPagina: number; insumos: BankInsumo[] }>(`insumos?${query}`);
}
