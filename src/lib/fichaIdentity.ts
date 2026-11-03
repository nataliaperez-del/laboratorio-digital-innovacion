import type { Prompt0Data } from '@/store/useStore';

/**
 * Cómo se lee la casilla «Nombre del proyecto o idea» de la Ficha Base.
 *
 * A veces es un rótulo («Bioinnovación Sabana Centro») y a veces el tema que el equipo
 * prevé trabajar («Cadena agroalimentaria de la papa»). De eso dependen dos usos distintos
 * del mismo texto:
 *
 * - `displayName` rotula títulos, portadas y nombres de archivo.
 * - `focusText` es una **hipótesis de enfoque a verificar**, nunca evidencia: orienta la
 *   búsqueda y el Estudio Territorial la confirma, la matiza o la contradice.
 */
export interface FichaIdentity {
  displayName: string;
  focusText: string;
  focusKeywords: string[];
}

type FichaIdentityFields = Pick<Prompt0Data, 'labName' | 'labNameKind' | 'municipality'>;

/** Palabras con peso para buscar el tema en las fuentes, sin tildes y en mayúsculas. */
export function keywordsFromText(text: string): string[] {
  const stop = new Set(['PARA', 'CON', 'LOS', 'LAS', 'DEL', 'UNA', 'POR', 'QUE', 'EN', 'DE', 'LA', 'EL', 'Y']);
  const words = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w.length >= 4 && !stop.has(w));
  return [...new Set(words)];
}

/** Cómo nombrar el ejercicio según la Ficha Base: el nombre del proyecto o, si se escribió un tema, el tema como foco. */
export function fichaIdentity(p: FichaIdentityFields): FichaIdentity {
  const written = p.labName?.trim() || '';
  if ((p.labNameKind ?? 'nombre') !== 'tema' || !written) {
    return { displayName: written, focusText: '', focusKeywords: [] };
  }
  const place = p.municipality?.trim();
  return {
    displayName: place ? `Estudio ${place}` : written,
    focusText: written,
    focusKeywords: keywordsFromText(written),
  };
}
