/**
 * Núcleo metodológico REPOSITORIO_CIP_DF.
 *
 * El nombre canónico de la carpeta se declara UNA sola vez aquí (mayúsculas, guiones
 * bajos, sin espacios ni guion medio). Ningún otro archivo debe escribir el literal:
 * el script de sellado (`scripts/sellar-repositorio.mjs`) lo lee de este archivo.
 */

/** Nombre canónico de la carpeta del núcleo, servida desde `public/`. */
export const REPO_DIR = 'REPOSITORIO_CIP_DF';

/** Ruta pública (URL absoluta desde la raíz del sitio) del núcleo. */
export const REPO_BASE_URL = `/${REPO_DIR}`;

/** Ruta pública del manifiesto sellado. */
export const REPO_MANIFEST_URL = `${REPO_BASE_URL}/manifest.json`;

/** Grupos de primer nivel del repositorio, en orden de carga determinista. */
export const REPO_GRUPOS = ['CONTENEDOR_1', 'CONTENEDOR_2', 'GENERALES'] as const;

/**
 * Techo de tokens estimados del núcleo completo. El sellado falla si se supera, para
 * que el problema aparezca en construcción y no a mitad de una generación en producción.
 * Se puede subir con la variable de entorno REPO_TOKENS_MAX al sellar.
 */
export const REPO_TOKENS_MAX_DEFAULT = 500_000;
