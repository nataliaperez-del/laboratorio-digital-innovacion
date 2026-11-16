import type { SavedStudy } from '@/store/useStore';
import estudiosInicialesRaw from '@/content/banco/estudios-territoriales-iniciales.json';

/** Banco inicial de los 24 centros UNAD (3 por cada una de las 8 zonas). */
export const ESTUDIOS_TERRITORIALES_INICIALES: SavedStudy[] = estudiosInicialesRaw as unknown as SavedStudy[];

/**
 * Fusiona los estudios almacenados en el navegador con el banco inicial de 24 centros.
 * Los estudios guardados o modificados por el usuario se conservan; los que falten del banco se incorporan.
 */
export function mergeInitialStudies(stored: SavedStudy[] = []): SavedStudy[] {
  if (!stored || !stored.length) return [...ESTUDIOS_TERRITORIALES_INICIALES];

  const storedIds = new Set(stored.map((s) => s.id));
  const storedTerritories = new Set(stored.map((s) => s.territoryName.trim().toLowerCase()));

  const missing = ESTUDIOS_TERRITORIALES_INICIALES.filter(
    (init) => !storedIds.has(init.id) && !storedTerritories.has(init.territoryName.trim().toLowerCase()),
  );

  return [...stored, ...missing];
}

/**
 * Busca si un municipio ya cuenta con un estudio territorial en el banco.
 */
export function findStudyInBank(studies: readonly SavedStudy[], municipality: string, department?: string): SavedStudy | undefined {
  if (!municipality?.trim()) return undefined;
  const cleanMuni = municipality.trim().toLowerCase();
  const cleanDepto = department?.trim().toLowerCase();

  return studies.find((s) => {
    const sMuni = s.territoryName.trim().toLowerCase();
    const pMuni = s.prompt0Data?.municipality?.trim().toLowerCase();
    const matchMuni = sMuni === cleanMuni || pMuni === cleanMuni;
    if (!matchMuni) return false;
    if (cleanDepto && s.department) {
      return s.department.trim().toLowerCase() === cleanDepto;
    }
    return true;
  });
}
