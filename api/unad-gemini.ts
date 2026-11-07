/**
 * Vercel: `POST /api/unad-gemini`, proxy de la IA institucional (pasarela UNAD IA 360).
 * Las credenciales son variables de entorno del proyecto en Vercel; nunca llegan al navegador.
 */
import { isForeignOrigin, proxyUnadGemini, type ProxyReply } from '../server/iaProxy.js';

function respond(reply: ProxyReply): Response {
  return new Response(reply.body, {
    status: reply.status,
    headers: { 'Content-Type': reply.contentType, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: Request): Promise<Response> {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (isForeignOrigin(request.headers.get('origin'), host)) {
    return respond({ status: 403, contentType: 'application/json; charset=utf-8', body: JSON.stringify({ error: 'Origen no permitido.' }) });
  }
  return respond(await proxyUnadGemini('POST', await request.text(), process.env));
}

export async function GET(): Promise<Response> {
  return respond(await proxyUnadGemini('GET', '', process.env));
}
