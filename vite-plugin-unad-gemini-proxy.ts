import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin, PreviewServer, ViteDevServer } from 'vite';

const DEFAULT_BASE = 'https://chatbot-ia-360.unad.edu.co/api-proxy/v1';
const ALLOWED_MODELS = new Set(['gemini-2.5-flash', 'gemini-2.5-flash-lite']);
const MAX_BODY_BYTES = 12 * 1024 * 1024;

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
  /** Herramientas Gemini (p. ej. google_search para grounding). */
  tools?: unknown;
  credentials?: { xApiKey?: string; bearer?: string };
};

export function unadGeminiProxyPlugin(env: Record<string, string>): Plugin {
  const serverEnvX = sanitizeCredential(
    env.VITE_UNAD_GEMINI_X_API_KEY || env.UNAD_GEMINI_X_API_KEY,
  );
  const serverEnvBearer = sanitizeCredential(
    env.VITE_UNAD_GEMINI_BEARER || env.UNAD_GEMINI_BEARER,
  );
  const serverBase = (env.VITE_UNAD_GEMINI_BASE_URL?.trim() || DEFAULT_BASE).replace(/\/$/, '');
  const serverModelDefault =
    env.VITE_UNAD_GEMINI_MODEL?.trim() || env.UNAD_GEMINI_MODEL?.trim() || 'gemini-2.5-flash';

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
        error: `Modelo no permitido: ${modelRaw}. Use gemini-2.5-flash o gemini-2.5-flash-lite.`,
      });
      return;
    }

    if (!body.contents || !Array.isArray(body.contents)) {
      sendJson(res, 400, { error: 'Falta "contents" (array) en el cuerpo' });
      return;
    }

    const xApiKey = sanitizeCredential(body.credentials?.xApiKey) || serverEnvX;
    const bearer = sanitizeCredential(body.credentials?.bearer) || serverEnvBearer;

    if (!xApiKey || !bearer) {
      sendJson(res, 401, {
        error:
          'Faltan credenciales UNAD en el servidor (.env.local: VITE_UNAD_GEMINI_X_API_KEY y VITE_UNAD_GEMINI_BEARER) o envíalas en credentials del cuerpo (solo desarrollo).',
      });
      return;
    }

    const upstreamUrl = `${serverBase}/models/${encodeURIComponent(modelRaw)}:generateContent`;
    const forwardBody: Record<string, unknown> = {
      contents: body.contents,
    };
    if (body.generationConfig && typeof body.generationConfig === 'object') {
      forwardBody.generationConfig = body.generationConfig;
    }
    if (Array.isArray(body.tools)) {
      forwardBody.tools = body.tools;
    }

    try {
      const upstream = await fetch(upstreamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': xApiKey,
          Authorization: `Bearer ${bearer}`,
        },
        body: JSON.stringify(forwardBody),
      });

      const text = await upstream.text();
      if (!upstream.ok) {
        console.warn(
          '[unad-gemini-proxy] Upstream',
          upstream.status,
          upstreamUrl,
          'bytes≈',
          JSON.stringify(forwardBody).length,
          'resp:',
          text.slice(0, 800),
        );
      }
      res.statusCode = upstream.status;
      res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
      res.end(text);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      sendJson(res, 502, { error: `Fallo al contactar UNAD: ${msg}` });
    }
  }

  function attach(server: ViteDevServer | PreviewServer) {
    server.middlewares.use(async (req, res, next) => {
      const p = req.url?.split('?')[0] ?? '';
      if (p === '/api/unad-gemini') {
        await handleUnadProxy(req, res);
        return;
      }
      if (p === '/api/anthropic' || p === '/api-anthropic/v1/messages') {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        let raw: string;
        try {
          raw = await readBody(req, MAX_BODY_BYTES);
        } catch {
          sendJson(res, 413, { error: 'Body demasiado grande' });
          return;
        }
        const apiKey = (req.headers['x-api-key'] as string) || '';
        if (!apiKey) {
          sendJson(res, 401, { error: 'Anthropic API Key is required in header x-api-key' });
          return;
        }
        try {
          const upstream = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': (req.headers['anthropic-version'] as string) || '2023-06-01',
            },
            body: raw,
          });
          const text = await upstream.text();
          res.statusCode = upstream.status;
          res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
          res.end(text);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          sendJson(res, 502, { error: `Fallo al contactar Anthropic: ${msg}` });
        }
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
