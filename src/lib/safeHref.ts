/**
 * Un enlace de un resultado solo se publica si es de la web (http, https) o de correo (mailto).
 * Cualquier otro tipo (javascript:, data:, file:…) se descarta: el texto queda, sin enlace.
 */
export function safeHref(href: string | undefined | null): string | null {
  const value = (href ?? '').trim();
  return /^(https?:\/\/|mailto:)/i.test(value) ? value : null;
}
