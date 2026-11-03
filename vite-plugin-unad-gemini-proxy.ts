import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin, PreviewServer, ViteDevServer } from 'vite';

const DEFAULT_BASE = 'https://chatbot-ia-360.unad.edu.co/api-proxy/v1';
/** Modelos que acepta hoy la pasarela IA 360; si cambian, la pasarela responde con la lista vigente. */
const ALLOWED_MODELS = new Set([
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
  'gemini-3.1-pro-preview',
]);
const MAX_BODY_BYTES = 12 * 1024 * 1024;
const RADAR_URL = 'https://observatorio.innovahub360.net/index.php?route=%2Fradar';
const RADAR_TTL_MS = 6 * 60 * 60 * 1000;

function sanitizeCredential(value: string | undefined | null): string {
  if (value == null) return '';
  const first = value
    .split(/[\r\n]+/)
    .map((s) => s.trim())
    .find(Boolean);
  return first ?? '';
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('Body demasiado grande'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

type UnadProxyBody = {
  model?: string;
  contents?: unknown;
  generationConfig?: unknown;
  tools?: unknown;
  credentials?: { xApiKey?: string; bearer?: string };
};

/** Cuerpo que entiende la API de Gemini: nunca reenvía el modelo ni las credenciales del cliente. */
function buildUpstreamBody(body: UnadProxyBody): Record<string, unknown> {
  const out: Record<string, unknown> = { contents: body.contents };
  if (body.generationConfig && typeof body.generationConfig === 'object') {
    out.generationConfig = body.generationConfig;
  }
  if (Array.isArray(body.tools)) out.tools = body.tools;
  return out;
}

async function pipeUpstream(res: ServerResponse, url: string, headers: Record<string, string>, body: unknown) {
  const upstream = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const text = await upstream.text();
  res.statusCode = upstream.status;
  res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
  res.end(text);
}

/** Espejo en desarrollo de `hostinger_deploy/includes/gemini_proxy.php` y `observatorio.php`. */
export function unadGeminiProxyPlugin(env: Record<string, string>): Plugin {
  const serverEnvX = sanitizeCredential(env.UNAD_GEMINI_X_API_KEY);
  const serverEnvBearer = sanitizeCredential(env.UNAD_GEMINI_BEARER);
  const serverBase = (env.UNAD_GEMINI_BASE_URL?.trim() || DEFAULT_BASE).replace(/\/$/, '');
  const serverModelDefault = env.UNAD_GEMINI_MODEL?.trim() || 'gemini-3.5-flash';
  const geminiDirectKey = sanitizeCredential(env.GEMINI_API_KEY);
  let radarCache: { at: number; body: string } | null = null;

  async function handleUnadProxy(req: IncomingMessage, res: ServerResponse) {
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }

    let raw: string;
    try {
      raw = await readBody(req, MAX_BODY_BYTES);
    } catch {
      sendJson(res, 413, { error: 'Cuerpo de petición inválido o demasiado grande' });
      return;
    }

    let body: UnadProxyBody;
    try {
      body = JSON.parse(raw) as UnadProxyBody;
    } catch {
      sendJson(res, 400, { error: 'JSON inválido' });
      return;
    }

    const modelRaw = (body.model || serverModelDefault).trim();
    if (!ALLOWED_MODELS.has(modelRaw)) {
      sendJson(res, 400, {
        error: `Modelo no permitido: ${modelRaw}. Use uno de: ${[...ALLOWED_MODELS].join(', ')}.`,
      });
      return;
    }

    if (!body.contents || !Array.isArray(body.contents)) {
      sendJson(res, 400, { error: 'Falta "contents" (array) en el cuerpo' });
      return;
    }

    const xApiKey = sanitizeCredential(body.credentials?.xApiKey) || serverEnvX;
    const bearer = sanitizeCredential(body.credentials?.bearer) || serverEnvBearer;
    const upstreamBody = buildUpstreamBody(body);

    try {
      if (xApiKey && bearer) {
        await pipeUpstream(
          res,
          `${serverBase}/models/${encodeURIComponent(modelRaw)}:generateContent`,
          { 'Content-Type': 'application/json', 'x-api-key': xApiKey, Authorization: `Bearer ${bearer}` },
          upstreamBody,
        );
        return;
      }
      if (geminiDirectKey) {
        await pipeUpstream(
          res,
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelRaw)}:generateContent`,
          { 'Content-Type': 'application/json', 'x-goog-api-key': geminiDirectKey },
          upstreamBody,
        );
        return;
      }
    } catch (e) {
      sendJson(res, 502, { error: `No se pudo contactar el servicio de IA: ${e instanceof Error ? e.message : e}` });
      return;
    }

    // Sin credenciales se informa el error: el Laboratorio nunca presenta datos inventados como resultado de IA.
    sendJson(res, 503, {
      code: 'IA_NO_CONFIGURADA',
      error:
        'La IA no está configurada. Define UNAD_GEMINI_X_API_KEY y UNAD_GEMINI_BEARER (o GEMINI_API_KEY) en .env.local, o elige otro proveedor en el botón «IA» de la cabecera.',
    });
  }

  /** Radar del Observatorio: solo lectura, leído de su página pública con caché de 6 horas. */
  async function handleRadar(res: ServerResponse) {
    if (radarCache && Date.now() - radarCache.at < RADAR_TTL_MS) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(radarCache.body);
      return;
    }
    try {
      const page = await fetch(RADAR_URL, { headers: { 'User-Agent': 'InnovaHub360-Laboratorio/1.0 (solo lectura)' } });
      if (!page.ok) throw new Error(`HTTP ${page.status}`);
      const match = (await page.text()).match(/const EMBED_TENDENCIAS = (\[[\s\S]*?\]);\s*\n/);
      if (!match) throw new Error('El radar del Observatorio cambió de formato.');
      const payload = JSON.stringify({ consultadoEn: new Date().toISOString(), fuente: RADAR_URL, senales: JSON.parse(match[1]) });
      radarCache = { at: Date.now(), body: payload };
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(payload);
    } catch (e) {
      if (radarCache) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(radarCache.body);
        return;
      }
      sendJson(res, 502, { error: `No se pudo leer el Radar del Observatorio: ${e instanceof Error ? e.message : e}` });
    }
  }

  function attach(server: ViteDevServer | PreviewServer) {
    server.middlewares.use((req, res, next) => {
      const url = req.url?.split('?')[0];
      if (url === '/api/unad-gemini' || url === '/api/unad-gemini/') {
        void handleUnadProxy(req, res);
        return;
      }
      if (url === '/api/observatorio/radar') {
        void handleRadar(res);
        return;
      }
      next();
    });
  }

  return {
    name: 'unad-gemini-proxy',
    configureServer(server) {
      attach(server);
    },
    configurePreviewServer(server) {
      attach(server);
    },
  };
}
