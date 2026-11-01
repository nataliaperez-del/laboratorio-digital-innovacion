/** Quita saltos de línea y espacios; si hay varias líneas (copia duplicada en .env), usa la primera no vacía. */
export function sanitizeCredential(value: string | undefined | null): string {
  if (value == null) return '';
  const first = value
    .split(/[\r\n]+/)
    .map((s) => s.trim())
    .find(Boolean);
  return first ?? '';
}
