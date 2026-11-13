/**
 * Interruptor del portal en Vercel. Este despliegue es el plan B del portal principal (Hostinger):
 * permanece oculto hasta que se autorice usarlo.
 *
 * - `PORTAL_ESTADO=activo` lo abre a todo el mundo. Cualquier otro valor, o ninguno, lo deja oculto:
 *   si la variable se borra por error, el portal no queda expuesto.
 * - `PORTAL_CLAVE` permite al equipo entrar mientras está oculto, abriendo una vez
 *   `https://<sitio>/?acceso=<clave>`; el navegador queda autorizado con una cookie.
 *
 * Es lógica pura (sin Vercel) para poder probarla; `middleware.ts` la aplica a cada solicitud.
 */

export const ACCESS_PARAM = 'acceso';
export const ACCESS_COOKIE = 'portal_acceso';
/** La autorización del equipo dura una semana por navegador. */
export const ACCESS_MAX_AGE_S = 7 * 24 * 60 * 60;

export type PortalDecision =
  /** Sigue al sitio. */
  | { kind: 'pasar' }
  /** La clave llegó en la dirección: se guarda en una cookie y se limpia la dirección. */
  | { kind: 'autorizar'; location: string; cookie: string }
  /** Oculto: no se entrega nada del sitio. */
  | { kind: 'oculto' };

export interface PortalEnv {
  PORTAL_ESTADO?: string;
  PORTAL_CLAVE?: string;
}

/** Compara sin revelar por tiempos en qué carácter difieren. */
function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function cookieValue(header: string | null, name: string): string {
  for (const part of (header ?? '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return '';
}

export function decidePortal(url: string, cookieHeader: string | null, env: PortalEnv): PortalDecision {
  if (env.PORTAL_ESTADO?.trim().toLowerCase() === 'activo') return { kind: 'pasar' };

  const key = env.PORTAL_CLAVE?.trim() ?? '';
  // Sin clave configurada, o demasiado corta para ser un secreto, nadie entra mientras esté oculto.
  if (key.length < 16) return { kind: 'oculto' };

  if (sameSecret(cookieValue(cookieHeader, ACCESS_COOKIE), key)) return { kind: 'pasar' };

  const target = new URL(url);
  const offered = target.searchParams.get(ACCESS_PARAM) ?? '';
  if (offered && sameSecret(offered, key)) {
    // La clave no se queda en la barra de direcciones ni en el historial.
    target.searchParams.delete(ACCESS_PARAM);
    return {
      kind: 'autorizar',
      location: target.pathname + target.search,
      cookie: `${ACCESS_COOKIE}=${encodeURIComponent(key)}; Path=/; Max-Age=${ACCESS_MAX_AGE_S}; HttpOnly; Secure; SameSite=Lax`,
    };
  }
  return { kind: 'oculto' };
}

/** Lo único que ve quien llega mientras el portal está oculto: nada que identifique el proyecto. */
export const HIDDEN_PAGE = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Sitio no disponible</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0d1f26; color: #c9d6da; font: 16px/1.5 system-ui, sans-serif; }
  main { text-align: center; padding: 24px; }
  h1 { font-size: 20px; margin: 0 0 8px; color: #fff; }
  p { margin: 0; }
</style>
</head>
<body>
<main>
  <h1>Sitio no disponible</h1>
  <p>Este sitio no está abierto al público en este momento.</p>
</main>
</body>
</html>`;
