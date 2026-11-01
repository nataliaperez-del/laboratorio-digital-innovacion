/**
 * Nombres de referencia en el repositorio institucional de Drive (REPOSITORIO Centro de Innovación-DF).
 * Los prompts citan estos archivos para que la IA priorice su lectura dentro del texto extraído.
 *
 * Cada referencia tiene un nombre principal (el vigente en el repositorio) y una lista
 * de candidatos que incluye nombres históricos, para que la app funcione aunque la
 * carpeta tenga la versión anterior de los archivos.
 */

/** Resultado del Contenedor 1 (CONTENEDOR_1/). */
export const DRIVE_REFERENCE_CONTENEDOR_1 = 'CONTENEDOR__1.txt';
export const DRIVE_REFERENCE_CONTENEDOR_1_ALT = 'CONTENEDOR_1.txt';
export const DRIVE_REFERENCE_CONTENEDOR_1_CANDIDATES = [
  DRIVE_REFERENCE_CONTENEDOR_1,
  DRIVE_REFERENCE_CONTENEDOR_1_ALT,
  'CONTENEDOR_UNICO_CONSOLIDADO.txt',
  'CONTENEDOR_ÚNICO_CONSOLIDADO.txt',
];

/** Instrucción de redacción del proyecto de innovación (GENERALES/). */
export const DRIVE_REFERENCE_INSTRUCCION_FUNDANTE = 'prompt_documento_fundante.txt';
export const DRIVE_REFERENCE_INSTRUCCION_FUNDANTE_CANDIDATES = [
  DRIVE_REFERENCE_INSTRUCCION_FUNDANTE,
  'instruccion_documento_fundante_CIP_actualizada.txt',
];

/** Prompt maestro del árbol de innovación (GENERALES/): global → Colombia → territorio. */
export const DRIVE_REFERENCE_PROMPT_ARBOL_INNOVACION = 'prompt_arbol_innovacion_v2.txt';
export const DRIVE_REFERENCE_PROMPT_ARBOL_INNOVACION_CANDIDATES = [
  DRIVE_REFERENCE_PROMPT_ARBOL_INNOVACION,
  'prompt_arbol_innovacion.txt',
];

/** Prompt para vocación territorial y tres opciones de tema Centro de Innovación (GENERALES/, Fase 3 paso 1). */
export const DRIVE_REFERENCE_PROMPT_VOCACION_CIP = 'prompt_vocacion_cip_v2.txt';
export const DRIVE_REFERENCE_PROMPT_VOCACION_CIP_CANDIDATES = [
  DRIVE_REFERENCE_PROMPT_VOCACION_CIP,
  'prompt_vocacion_cip.txt',
];

/** Instrucción de ejecución del Contenedor 2 territorial (CONTENEDOR_2/, Fase 2). */
export const DRIVE_REFERENCE_PROMPTS_FUENTES_C2_TERRITORIAL =
  'prompt_contenedor2_contexto_territorial.txt';
export const DRIVE_REFERENCE_PROMPTS_FUENTES_C2_TERRITORIAL_CANDIDATES = [
  DRIVE_REFERENCE_PROMPTS_FUENTES_C2_TERRITORIAL,
  'PROMPTS_FUENTES_CONSULTA_CONTENEDOR2_TERRITORIAL 1.txt',
];
