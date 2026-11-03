/**
 * Contrato de procedencia hacia el generador del Estudio Territorial.
 *
 * Es la fuente de verdad para tres consumidores: la interfaz, los metadatos que se
 * guardan junto al contenedor y el prompt del modelo (declaración de trazabilidad, §6).
 * El inventario que viaja aquí es el que se VERIFICÓ al conectar, no uno re-consultado
 * después: si la carpeta cambia mañana, el documento sigue diciendo con qué se hizo.
 */
import type { Manifest } from '@/repositorio/tipos';
import type { FuentesConexion, FuentesMode } from '@/store/useStore';

/** Versión y firma del núcleo metodológico con el que se generó el contenedor. */
export interface ProcedenciaRepositorio {
  version: string;
  manifestHash: string;
}

/** Un documento de fuentes propias tal como quedó registrado al verificar la carpeta. */
export interface ProcedenciaDocumento {
  id: string;
  nombre: string;
  mimeType: string;
  modificado: string;
}

export type ProcedenciaFuentes =
  | { modo: 'sin_fuentes'; declarado: true }
  | {
      modo: 'con_fuentes';
      folderId: string;
      folderUrl: string;
      /** ISO 8601 del momento de verificación de la carpeta. */
      verificadoEn: string;
      documentos: ProcedenciaDocumento[];
    };

export interface Procedencia {
  repositorio: ProcedenciaRepositorio;
  fuentesPropias: ProcedenciaFuentes;
}

/**
 * Construye la procedencia a partir del manifiesto ya cargado y del estado del selector
 * de fuentes. No emite ninguna llamada de red. Si `fuentesMode` es `sin_fuentes`, la rama
 * de Drive ni siquiera se toca (garantía del §5: cero peticiones a Drive en ese modo).
 */
export function construirProcedencia(args: { manifest: Manifest | null; fuentesMode: FuentesMode; fuentesConexion: FuentesConexion | null }): Procedencia {
  const { manifest, fuentesMode, fuentesConexion } = args;
  const repositorio: ProcedenciaRepositorio = {
    version: manifest?.version ?? '',
    manifestHash: manifest?.hash ?? '',
  };

  if (fuentesMode === 'con_fuentes' && fuentesConexion) {
    return {
      repositorio,
      fuentesPropias: {
        modo: 'con_fuentes',
        folderId: fuentesConexion.folderId,
        folderUrl: fuentesConexion.folderUrl,
        verificadoEn: fuentesConexion.verificadoEn,
        documentos: fuentesConexion.documentos.map((d) => ({
          id: d.id,
          nombre: d.nombre,
          mimeType: d.mimeType,
          modificado: d.modificado ?? '',
        })),
      },
    };
  }

  return { repositorio, fuentesPropias: { modo: 'sin_fuentes', declarado: true } };
}

/**
 * Nota de trazabilidad documental literal (§6.1). Se reproduce sin cambios en el documento
 * cuando no hubo fuentes propias. `version` es la del núcleo (Contenedor 1) con el que se generó.
 */
export function notaTrazabilidadSinFuentes(version: string): string {
  const v = version || 's. v.';
  return (
    'Nota de trazabilidad documental. Para la construcción de este estudio territorial no se incorporaron ' +
    'fuentes primarias propias del territorio. El repositorio de fuentes propias no fue habilitado por el ' +
    'equipo responsable en el momento de la generación. En consecuencia, el contenido territorial de este ' +
    'documento proviene exclusivamente de fuentes secundarias públicas y del núcleo metodológico institucional ' +
    `(versión ${v}). Todo dato territorial aquí registrado debe entenderse como candidato ` +
    'pendiente de verificación y no puede ser citado en documentos oficiales sin contraste previo con fuente primaria.'
  );
}

/** Sección determinista que la aplicación añade al final del contenedor para garantizar la trazabilidad (§6). */
export function buildTrazabilidadAppendix(procedencia: Procedencia): string {
  if (procedencia.fuentesPropias.modo === 'sin_fuentes') {
    return `## Nota de trazabilidad documental\n\n${notaTrazabilidadSinFuentes(procedencia.repositorio.version)}`;
  }
  const docs = procedencia.fuentesPropias.documentos;
  const filas = docs.length
    ? docs.map((d) => `| ${d.nombre} | ${d.mimeType || '—'} | ${d.modificado ? d.modificado.slice(0, 10) : '—'} |`).join('\n')
    : '| (sin documentos legibles) | — | — |';
  return [
    '## Fuentes propias del territorio consultadas',
    '',
    `Inventario verificado el ${procedencia.fuentesPropias.verificadoEn.slice(0, 10)} en la carpeta de Drive del territorio. ` +
      'Solo los documentos de esta tabla respaldan atribuciones a fuente primaria.',
    '',
    '| Documento | Tipo | Última modificación |',
    '|---|---|---|',
    filas,
  ].join('\n');
}
