/**
 * Vercel: `GET /api/observatorio/radar`, señales del Radar del Observatorio (solo lectura).
 * La CDN de Vercel guarda la respuesta 6 horas, como la caché de `observatorio.php` en Hostinger.
 */
import { createRadarReader } from '../../server/iaProxy.js';

const readRadar = createRadarReader();

export async function GET(): Promise<Response> {
  const reply = await readRadar();
  const headers: Record<string, string> = { 'Content-Type': reply.contentType, 'X-Content-Type-Options': 'nosniff' };
  if (reply.status === 200) headers['Cache-Control'] = 'public, s-maxage=21600, stale-while-revalidate=86400';
  return new Response(reply.body, { status: reply.status, headers });
}
