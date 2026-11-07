/**
 * Servidor del Laboratorio: proxy de la IA institucional y lectura del Radar del Observatorio.
 *
 * Lo usan el servidor de desarrollo (`vite-plugin-unad-gemini-proxy.ts`) y las funciones de Vercel
 * (`api/`). Sigue el mismo contrato que `hostinger_deploy/includes/gemini_proxy.php` y
 * `observatorio.php`: las credenciales viven solo en el servidor y, sin ellas, se responde 503.
 * El Laboratorio nunca presenta datos inventados como resultado de IA.
 */

export const DEFAULT_UNAD_BASE = 'https://chatbot-ia-360.unad.edu.co/api-proxy/v1';
/** Modelos que acepta hoy la pasarela IA 360; si cambian, la pasarela responde con la lista vigente. */
export const ALLOWED_MODELS = new Set([
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
  'gemini-3.1-pro-preview',
]);
export const RADAR_URL = 'https://observatorio.innovahub360.net/index.php?route=%2Fradar';
const RADAR_TTL_MS = 6 * 60 * 60 * 1000;

/** Variables del servidor que lee el proxy (en `.env.local` o en el entorno de Vercel). */
export interface ProxyEnv {
  UNAD_GEMINI_X_API_KEY?: string;
  UNAD_GEMINI_BEARER?: string;
  UNAD_GEMINI_BASE_URL?: string;
  UNAD_GEMINI_MODEL?: string;
  GEMINI_API_KEY?: string;
}

/** Respuesta lista para enviar, sin depender del servidor que la envía. */
export interface ProxyReply {
  status: number;
  contentType: string;
  body: string;
}

type Fetch = typeof fetch;

/** Quita saltos de línea y espacios; si hay varias líneas (copia duplicada), usa la primera no vacía. */
export function sanitizeCredential(value: string | undefined | null): string {
  if (value == null) return '';
  return (
    value
      .split(/[\r\n]+/)
      .map((s) => s.trim())
      .find(Boolean) ?? ''
  );
}

const json = (status: number, body: unknown): ProxyReply => ({
  status,
  contentType: 'application/json; charset=utf-8',
  body: JSON.stringify(body),
});

/**
 * ¿La petición viene de otra página? El navegador manda `Origin` en cada POST; si no coincide con
 * el sitio, otra web estaría usando la cuota de IA de la UNAD. Sin `Origin` (curl, servidor) se deja
 * pasar: esto frena el abuso desde navegadores, no reemplaza una autenticación.
 */
export function isForeignOrigin(origin: string | null | undefined, host: string | null | undefined): boolean {
  if (!origin || !host) return false;
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

interface ProxyBody {
  model?: string;
  contents?: unknown;
  generationConfig?: unknown;
  tools?: unknown;
  credentials?: { xApiKey?: string; bearer?: string };
}

async function forward(fetchImpl: Fetch, url: string, headers: Record<string, string>, body: ProxyBody): Promise<ProxyReply> {
  // Solo viajan los campos que entiende Gemini: ni el modelo ni las credenciales del cliente.
  const upstreamBody: Record<string, unknown> = { contents: body.contents };
  if (body.generationConfig && typeof body.generationConfig === 'object') upstreamBody.generationConfig = body.generationConfig;
  if (Array.isArray(body.tools)) upstreamBody.tools = body.tools;
  const upstream = await fetchImpl(url, { method: 'POST', headers, body: JSON.stringify(upstreamBody) });
  return {
    status: upstream.status,
    contentType: upstream.headers.get('content-type') || 'application/json',
    body: await upstream.text(),
  };
}

/** Atiende `POST /api/unad-gemini`: valida, elige credenciales y reenvía a la pasarela IA 360 (o a Google). */
export async function proxyUnadGemini(method: string, rawBody: string, env: ProxyEnv, fetchImpl: Fetch = fetch): Promise<ProxyReply> {
  if (method !== 'POST') return json(405, { error: 'Método no permitido. Use POST.' });

  let body: ProxyBody;
  try {
    body = JSON.parse(rawBody) as ProxyBody;
  } catch {
    return json(400, { error: 'JSON inválido' });
  }
  if (!body || typeof body !== 'object') return json(400, { error: 'JSON inválido' });

  const model = (body.model || env.UNAD_GEMINI_MODEL?.trim() || 'gemini-3.5-flash').trim();
  if (!ALLOWED_MODELS.has(model)) {
    return json(400, { error: `Modelo no permitido: ${model}. Use uno de: ${[...ALLOWED_MODELS].join(', ')}.` });
  }
  if (!Array.isArray(body.contents)) return json(400, { error: 'Falta "contents" (array) en el cuerpo' });

  const xApiKey = sanitizeCredential(body.credentials?.xApiKey) || sanitizeCredential(env.UNAD_GEMINI_X_API_KEY);
  const bearer = sanitizeCredential(body.credentials?.bearer) || sanitizeCredential(env.UNAD_GEMINI_BEARER);
  const geminiKey = sanitizeCredential(env.GEMINI_API_KEY);
  const base = (env.UNAD_GEMINI_BASE_URL?.trim() || DEFAULT_UNAD_BASE).replace(/\/$/, '');

  try {
    if (xApiKey && bearer) {
      return await forward(
        fetchImpl,
        `${base}/models/${encodeURIComponent(model)}:generateContent`,
        { 'Content-Type': 'application/json', 'x-api-key': xApiKey, Authorization: `Bearer ${bearer}` },
        body,
      );
    }
    if (geminiKey) {
      return await forward(
        fetchImpl,
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
        body,
      );
    }
  } catch (e) {
    return json(502, { error: `No se pudo contactar el servicio de IA: ${e instanceof Error ? e.message : e}` });
  }

  return json(503, {
    code: 'IA_NO_CONFIGURADA',
    error:
      'La IA no está configurada en el servidor. Define UNAD_GEMINI_X_API_KEY y UNAD_GEMINI_BEARER (o GEMINI_API_KEY), o elige otro proveedor en el botón «IA» de la cabecera.',
  });
}

/**
 * Lector del Radar del Observatorio (`GET /api/observatorio/radar`): solo lectura, de su página
 * pública, con caché de 6 horas. Si la lectura falla, se sirve la última copia buena.
 */
export function createRadarReader(fetchImpl: Fetch = fetch, now: () => number = Date.now): () => Promise<ProxyReply> {
  let cache: { at: number; body: string } | null = null;
  return async () => {
    if (cache && now() - cache.at < RADAR_TTL_MS) return { status: 200, contentType: 'application/json; charset=utf-8', body: cache.body };
    try {
      const page = await fetchImpl(RADAR_URL, { headers: { 'User-Agent': 'InnovaHub360-Laboratorio/1.0 (solo lectura)' } });
      if (!page.ok) throw new Error(`HTTP ${page.status}`);
      const match = (await page.text()).match(/const EMBED_TENDENCIAS = (\[[\s\S]*?\]);\s*\n/);
      if (!match) throw new Error('El radar del Observatorio cambió de formato.');
      const body = JSON.stringify({ consultadoEn: new Date(now()).toISOString(), fuente: RADAR_URL, senales: JSON.parse(match[1]) });
      cache = { at: now(), body };
      return { status: 200, contentType: 'application/json; charset=utf-8', body };
    } catch (e) {
      if (cache) return { status: 200, contentType: 'application/json; charset=utf-8', body: cache.body };
      return json(502, { error: `No se pudo leer el Radar del Observatorio: ${e instanceof Error ? e.message : e}` });
    }
  };
}
