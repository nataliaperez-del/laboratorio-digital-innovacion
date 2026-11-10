/**
 * Roles del Laboratorio. Hay dos:
 *  - usuario: cualquier cuenta del dominio institucional; usa las herramientas.
 *  - administrador: además entra al Contenedor de resultados de innovación en línea.
 *
 * Los administradores son los correos de VITE_ADMIN_EMAILS (separados por coma).
 * Importante: esta página corre en el navegador, así que el rol ordena la interfaz pero no es una
 * barrera de seguridad: los resultados viven en el navegador de cada persona. Reunir y proteger
 * los resultados de todos exige un servidor con base de datos que valide la cuenta.
 */

export type Role = 'admin' | 'user';

/** Correos de una lista separada por comas, en minúsculas y sin vacíos. */
export function parseEmailList(raw: string | undefined | null): string[] {
  return (raw ?? '')
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** ¿Este correo es de administrador según la lista configurada? */
export function isAdminEmail(email: string | undefined | null, rawAdminList: string | undefined | null): boolean {
  const e = email?.trim().toLowerCase();
  return Boolean(e) && parseEmailList(rawAdminList).includes(e as string);
}

export function roleOf(email: string | undefined | null, rawAdminList: string | undefined | null): Role {
  return isAdminEmail(email, rawAdminList) ? 'admin' : 'user';
}
