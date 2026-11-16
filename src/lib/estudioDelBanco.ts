/**
 * Los 24 estudios del banco inicial vienen de fábrica: no son trabajo de la persona.
 * No deben dar insignias, ni contar en las métricas, ni enviarse al concentrador.
 */
export const BANK_STUDY_PREFIX = 'study-banco-';

export const isBankStudy = (study: unknown): boolean => {
  const id = (study as { id?: unknown } | null)?.id;
  return typeof id === 'string' && id.startsWith(BANK_STUDY_PREFIX);
};

/** Solo los estudios que hizo la persona. */
export const ownStudies = <T>(studies: readonly T[] | undefined | null): T[] => (studies ?? []).filter((s) => !isBankStudy(s));
