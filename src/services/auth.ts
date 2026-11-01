import {
  clearDriveToken,
  getDriveAccessToken,
  loadGoogleIdentityScript,
  seedDriveToken,
} from '@/services/institutionalDrive';
import type { InstitutionalSession } from '@/store/useStore';

/**
 * Ingreso institucional con Google: una sola autorización al entrar cubre la
 * identidad (nombre/correo) y la lectura de Drive para todo el proceso, de modo
 * que "Conectar Contenedor 1" no vuelve a abrir la ventana de Google mientras
 * la sesión esté activa.
 */

/**
 * Dominios de correo aceptados (separados por coma en VITE_ALLOWED_EMAIL_DOMAINS).
 * Por defecto, el dominio institucional de la UNAD.
 */
export function getAllowedEmailDomains(): string[] {
  const raw = import.meta.env.VITE_ALLOWED_EMAIL_DOMAINS?.trim();
  const domains = (raw || 'unad.edu.co')
    .split(',')
    .map((d: string) => d.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
  return domains.length ? domains : ['unad.edu.co'];
}

/** Minutos de inactividad antes de cerrar la sesión (VITE_SESSION_IDLE_MINUTES; por defecto 30). */
export function getSessionIdleLimitMs(): number {
  const raw = Number(import.meta.env.VITE_SESSION_IDLE_MINUTES?.trim());
  const minutes = Number.isFinite(raw) && raw >= 5 ? Math.min(raw, 12 * 60) : 30;
  return minutes * 60_000;
}

/** Bypass del ingreso para desarrollo local (VITE_AUTH_DISABLED=true). Nunca usar en producción. */
export function isAuthDisabled(): boolean {
  return import.meta.env.VITE_AUTH_DISABLED?.trim().toLowerCase() === 'true';
}

function emailDomainAllowed(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase() || '';
  return getAllowedEmailDomains().includes(domain);
}

interface GoogleUserInfo {
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

/** Alcances del ingreso: identidad + lectura de Drive (así no se vuelve a pedir en la Fase 2). */
const LOGIN_SCOPE = 'openid email profile https://www.googleapis.com/auth/drive.readonly';

function requestLoginToken(): Promise<{ token: string; expiresIn: number }> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    return Promise.reject(
      new Error(
        'Falta configurar VITE_GOOGLE_CLIENT_ID (ID de cliente OAuth de Google). Contacta al administrador de la aplicación.',
      ),
    );
  }
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: LOGIN_SCOPE,
      callback: (resp) => {
        if (resp.error) {
          reject(new Error(resp.error_description || resp.error));
          return;
        }
        if (resp.access_token) {
          resolve({ token: resp.access_token, expiresIn: Number(resp.expires_in) || 3600 });
        } else {
          reject(new Error('Google no devolvió un token de acceso.'));
        }
      },
      error_callback: (err) => {
        if (err?.type === 'popup_failed_to_open') {
          reject(
            new Error(
              'El navegador bloqueó la ventana de Google. Permite las ventanas emergentes para este sitio y vuelve a intentar.',
            ),
          );
        } else if (err?.type === 'popup_closed') {
          reject(new Error('La ventana de Google se cerró antes de completar el ingreso. Vuelve a intentar.'));
        } else {
          reject(new Error(`No se pudo completar el ingreso: ${err?.message || err?.type || 'error desconocido'}`));
        }
      },
    });
    client.requestAccessToken();
  });
}

async function fetchUserInfo(token: string): Promise<GoogleUserInfo> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`No se pudo obtener la identidad de la cuenta (${res.status}).`);
  return (await res.json()) as GoogleUserInfo;
}

function revokeToken(token: string): void {
  try {
    window.google?.accounts.oauth2.revoke(token);
  } catch {
    // La revocación es de cortesía: si falla, el token expira solo (≤1 h).
  }
}

/**
 * Abre la ventana de Google, valida que la cuenta sea del dominio institucional y
 * deja el token listo para Drive. Si el dominio no está permitido, revoca el token
 * y rechaza con un mensaje claro.
 */
export async function signInWithInstitutionalGoogle(): Promise<InstitutionalSession> {
  await loadGoogleIdentityScript();
  const { token, expiresIn } = await requestLoginToken();
  const info = await fetchUserInfo(token);
  const email = info.email?.trim().toLowerCase() || '';

  if (!email || info.email_verified === false) {
    revokeToken(token);
    throw new Error('No se pudo verificar el correo de la cuenta seleccionada.');
  }
  if (!emailDomainAllowed(email)) {
    revokeToken(token);
    const domains = getAllowedEmailDomains()
      .map((d) => `@${d}`)
      .join(', ');
    throw new Error(
      `La cuenta ${email} no es institucional. Solo pueden ingresar cuentas con dominio ${domains}.`,
    );
  }

  seedDriveToken(token, expiresIn);
  return {
    email,
    name: info.name?.trim() || email,
    picture: info.picture,
    loggedInAt: Date.now(),
  };
}

/** Cierra la sesión: revoca el token vigente (si existe) y lo olvida en memoria. */
export function signOutInstitutional(): void {
  const token = getDriveAccessToken();
  if (token) revokeToken(token);
  clearDriveToken();
}
