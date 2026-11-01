import type { Prompt0Data } from '@/store/useStore';
import { keywordsFromText } from '@/lib/sigiipRegistry';

/**
 * Cómo se lee la casilla «Nombre tentativo del CIP» de la Ficha Base.
 *
 * El nombre de un CIP se decide antes de tener diagnóstico, así que a veces es un rótulo
 * («CIP Sinapsis Lab») y a veces es el tema que la zona prevé trabajar («Cadena
 * agroalimentaria de la papa»). El equipo de zona declara cuál de las dos cosas escribió,
 * y de eso dependen dos usos incompatibles del mismo texto:
 *
 * - `displayName` rotula títulos, portadas y nombres de archivo. Un tema no sirve como
 *   rótulo («Documento Fundante — Cadena agroalimentaria de la papa» no es un nombre de
 *   centro), así que en ese caso se usa un nombre por defecto derivado del municipio y el
 *   nombre definitivo queda pendiente de confirmación.
 * - `focusText` es una **hipótesis de enfoque a verificar**, nunca evidencia. Sirve para
 *   priorizar el material del repositorio que habla de ese tema y para que el Contenedor 2
 *   declare si el territorio lo sustenta, lo contradice o no dice nada. Nunca para dar el
 *   tema por bueno: la vocación y los temas siguen saliendo del análisis territorial.
 */
export interface CipIdentity {
  displayName: string;
  /** Vacío cuando la casilla se declaró como nombre: entonces no hay hipótesis que contrastar. */
  focusText: string;
  /** Palabras significativas del tema previsto, sin las del propio territorio. */
  focusKeywords: string[];
}

type FichaIdentityFields = Pick<
  Prompt0Data,
  'cipName' | 'cipNameKind' | 'municipality' | 'department' | 'zonaUNAD'
>;

/** Nombre por defecto cuando la casilla trae un tema y no un rótulo. */
function defaultCipName(municipality: string): string {
  const place = municipality.trim();
  return place ? `CIP ${place}` : '';
}

export function cipIdentity(p: FichaIdentityFields): CipIdentity {
  const written = p.cipName?.trim() || '';
  // Las fichas guardadas antes de que existiera el marcador se leen como nombre.
  if ((p.cipNameKind ?? 'nombre') !== 'tema' || !written) {
    return { displayName: written, focusText: '', focusKeywords: [] };
  }

  // Las palabras del territorio no son parte del tema: ya guían la búsqueda por su cuenta,
  // y dejarlas aquí haría que cualquier archivo del municipio pareciera hablar del tema.
  const territoryWords = new Set(
    keywordsFromText(`${p.municipality || ''} ${p.department || ''} ${p.zonaUNAD || ''}`),
  );
  return {
    displayName: defaultCipName(p.municipality || ''),
    focusText: written,
    focusKeywords: keywordsFromText(written).filter((w) => !territoryWords.has(w)),
  };
}

/** Rótulo del CIP para títulos, portadas y nombres de archivo. */
export function cipDisplayName(p: FichaIdentityFields): string {
  return cipIdentity(p).displayName;
}

/**
 * Rótulo para los títulos que ya dicen «del CIP …». Casi todas las zonas escriben el
 * nombre empezando por «CIP», y el nombre por defecto también lo lleva, así que el
 * título salía duplicado («del CIP CIP Pasto»): aquí se garantiza un solo prefijo.
 */
export function cipTitleLabel(displayName: string): string {
  const name = displayName.trim();
  if (!name) return 'CIP';
  return /^cip\b/i.test(name) ? name : `CIP ${name}`;
}
