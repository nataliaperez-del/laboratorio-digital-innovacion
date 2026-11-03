/**
 * Tipos del manifiesto sellado del núcleo REPOSITORIO_CIP_DF.
 *
 * El manifiesto es un artefacto GENERADO por `scripts/sellar-repositorio.mjs`; no se
 * edita a mano. Estos tipos son el contrato entre ese script y el módulo de carga
 * (`cargarRepositorio.ts`).
 */
import type { REPO_GRUPOS } from '@/constants/repositorio';

/** Carpetas del núcleo metodológico interno. */
export type GrupoRepositorio = (typeof REPO_GRUPOS)[number];

/** `prompt` = instrucción para el modelo (prefijo `prompt_`); `documento` = fuente de datos. */
export type TipoRecurso = 'prompt' | 'documento';

/** Metadatos de un recurso, todos derivados de su ruta relativa (convención sobre configuración). */
export interface RecursoMeta {
  /** grupo en minúscula + "." + familia. Ej: `generales.vocacion_cip`. */
  id: string;
  /** Ruta relativa dentro del repositorio. Ej: `GENERALES/prompt_vocacion_cip_v2.txt`. */
  ruta: string;
  grupo: GrupoRepositorio;
  /** Nombre sin `prompt_`, sin `_vN` y sin extensión; conserva `_parteN`. */
  familia: string;
  tipo: TipoRecurso;
  /** Prefijo numérico `NN_` si existe; si no, orden alfabético dentro del grupo. */
  orden: number;
  /** Sufijo `_vN`; si no hay, 1. */
  version: number;
  /** `false` si otra versión más alta de la misma familia la desplazó. */
  vigente: boolean;
  /** `true` solo para el grupo CONTENEDOR_2 (§3.2.2). */
  aceptaFuentesPropias: boolean;
  bytes: number;
  caracteres: number;
  tokensEstimados: number;
  /** `sha256-<hex>` del contenido normalizado a UTF-8 sin BOM. */
  hash: string;
}

/** Totales del núcleo: recursos, caracteres y tokens estimados. */
export interface ManifestTotales {
  recursos: number;
  caracteres: number;
  tokensEstimados: number;
}

/** Manifiesto sellado del núcleo metodológico (versión, firma y recursos vigentes). */
export interface Manifest {
  /** ISO 8601 de cuándo se selló. */
  generadoEn: string;
  /** SemVer del manifiesto (minor si cambian archivos, patch si solo cambia contenido). */
  version: string;
  /** `sha256-<hex>` sobre la firma de los recursos vigentes (ruta=hash); trazabilidad de procedencia. */
  hash: string;
  /** Nombre canónico de la carpeta (para verificación cruzada). */
  repoDir: string;
  totales: ManifestTotales;
  grupos: Record<GrupoRepositorio, RecursoMeta[]>;
  /** Archivos omitidos o incidencias no fatales detectadas al sellar. */
  avisos: string[];
}
