/**
 * Escuelas de la UNAD con su nombre oficial completo.
 *
 * El proyecto de innovación debe nombrarlas sin siglas: en el apartado 8.4 se proyecta
 * el aporte de cada una al Centro de Innovación, y las siglas dificultan la lectura del documento
 * por parte de actores externos al metasistema.
 */
export const UNAD_ESCUELAS: readonly string[] = [
  'Escuela de Ciencias Administrativas, Contables, Económicas y de Negocios',
  'Escuela de Ciencias Agrícolas, Pecuarias y del Medio Ambiente',
  'Escuela de Ciencias Básicas, Tecnología e Ingeniería',
  'Escuela de Ciencias de la Educación',
  'Escuela de Ciencias Jurídicas y Políticas',
  'Escuela de Ciencias Sociales, Artes y Humanidades',
] as const;

/**
 * Sigla de escuela → denominación completa. El código de cada proyecto del registro
 * SIGIIP incluye la sigla de la escuela que lo formuló (p. ej. `PI39ZAOECEDU2026`),
 * y es la única vía para atribuir escuela a un proyecto: el registro no trae ese campo.
 */
export const UNAD_ESCUELA_BY_SIGLA: Readonly<Record<string, string>> = {
  ECACEN: UNAD_ESCUELAS[0],
  ECAPMA: UNAD_ESCUELAS[1],
  ECBTI: UNAD_ESCUELAS[2],
  ECEDU: UNAD_ESCUELAS[3],
  ECJP: UNAD_ESCUELAS[4],
  ECSAH: UNAD_ESCUELAS[5],
  /** Aparece en el Estatuto Organizacional sin denominación desarrollada en las fuentes cargadas. */
  ECISA: 'Escuela codificada como ECISA (denominación completa pendiente de verificación institucional)',
};

/** Lista en viñetas para insertar en el prompt del proyecto de innovación. */
export function formatEscuelasForPrompt(): string {
  return UNAD_ESCUELAS.map((e) => `- ${e}`).join('\n');
}
