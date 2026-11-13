/**
 * Vercel: se ejecuta antes de cada solicitud (páginas, archivos y `/api`). Aplica el interruptor
 * del portal (`server/portalSwitch.ts`): mientras `PORTAL_ESTADO` no sea `activo`, el sitio no
 * entrega nada salvo al equipo que entró con la clave.
 *
 * Solo existe en Vercel: el portal principal en Hostinger no pasa por aquí.
 */
import { decidePortal, HIDDEN_PAGE } from './server/portalSwitch.js';

export const config = { matcher: '/:path*' };

export default function middleware(request: Request): Response {
  const decision = decidePortal(request.url, request.headers.get('cookie'), process.env);

  if (decision.kind === 'pasar') {
    // Señal de Vercel para continuar con la solicitud original.
    return new Response(null, { headers: { 'x-middleware-next': '1' } });
  }
  if (decision.kind === 'autorizar') {
    return new Response(null, { status: 302, headers: { Location: decision.location, 'Set-Cookie': decision.cookie, 'Cache-Control': 'no-store' } });
  }
  return new Response(HIDDEN_PAGE, {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Retry-After': '3600' },
  });
}
