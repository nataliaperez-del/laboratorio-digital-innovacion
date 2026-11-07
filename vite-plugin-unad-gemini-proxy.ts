import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin, PreviewServer, ViteDevServer } from 'vite';
import { createRadarReader, isForeignOrigin, proxyUnadGemini, type ProxyReply } from './server/iaProxy.js';

const MAX_BODY_BYTES = 12 * 1024 * 1024;

function send(res: ServerResponse, reply: ProxyReply) {
  res.statusCode = reply.status;
  res.setHeader('Content-Type', reply.contentType);
  res.end(reply.body);
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

/**
 * En desarrollo y `vite preview`, sirve `/api/unad-gemini` y `/api/observatorio/radar` con la misma
 * lógica que las funciones de Vercel (`server/iaProxy.ts`) y los PHP de Hostinger.
 */
export function unadGeminiProxyPlugin(env: Record<string, string>): Plugin {
  const readRadar = createRadarReader();

  async function handleUnadProxy(req: IncomingMessage, res: ServerResponse) {
    if (isForeignOrigin(req.headers.origin, req.headers.host)) {
      send(res, { status: 403, contentType: 'application/json; charset=utf-8', body: JSON.stringify({ error: 'Origen no permitido.' }) });
      return;
    }
    let raw = '';
    if (req.method === 'POST') {
      try {
        raw = await readBody(req, MAX_BODY_BYTES);
      } catch {
        send(res, {
          status: 413,
          contentType: 'application/json; charset=utf-8',
          body: JSON.stringify({ error: 'Cuerpo de petición inválido o demasiado grande' }),
        });
        return;
      }
    }
    send(res, await proxyUnadGemini(req.method ?? 'GET', raw, env));
  }

  function attach(server: ViteDevServer | PreviewServer) {
    server.middlewares.use((req, res, next) => {
      const url = req.url?.split('?')[0];
      if (url === '/api/unad-gemini' || url === '/api/unad-gemini/') {
        void handleUnadProxy(req, res);
        return;
      }
      if (url === '/api/observatorio/radar') {
        void readRadar().then((reply) => send(res, reply));
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
