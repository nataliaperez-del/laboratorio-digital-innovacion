import { describe, expect, it } from 'vitest';
import { CONTENEDOR2_SECTIONS, reviewContenedor2Section } from '@/prompts/contenedor2Sections';
import estudiosIniciales from '@/content/banco/estudios-territoriales-iniciales.json';

describe('Banco Inicial de Estudios Territoriales (24 Centros)', () => {
  it('contiene exactamente 24 estudios de 8 zonas diferentes con 3 centros cada una', () => {
    expect(estudiosIniciales).toHaveLength(24);

    const zonas = new Map<string, string[]>();
    for (const est of estudiosIniciales) {
      if (!zonas.has(est.zonaUNAD)) {
        zonas.set(est.zonaUNAD, []);
      }
      zonas.get(est.zonaUNAD)!.push(est.territoryName);
    }

    expect(zonas.size).toBe(8);
    const expectedZonas = ['Zona Caribe (ZCAR)', 'Zona Centro Boyacá (ZCB)', 'Zona Centro Bogotá Cundinamarca (ZCBC)', 'Zona Centro Oriente (ZCOR)', 'Zona Centro Sur (ZCSUR)', 'Zona Sur (ZSUR)', 'Zona Occidente (ZOCC)', 'Zona Amazonía Orinoquía (ZAO)'];
    for (const z of expectedZonas) {
      expect(zonas.has(z)).toBe(true);
      expect(zonas.get(z)).toHaveLength(3);
    }
  });

  it('todos los 24 estudios tienen 12 puntos y pasan la autoevaluación sin defectos', () => {
    for (const est of estudiosIniciales) {
      expect(est.sections).toHaveLength(12);
      expect(est.containerData).toContain('Este estudio es una base de referencia que se valida');

      est.sections.forEach((sec, idx) => {
        const point = CONTENEDOR2_SECTIONS[idx];
        const review = reviewContenedor2Section(point, sec.markdown);
        expect(review.status, `${est.territoryName} punto ${sec.number}: ${review.issue}`).toBe('ok');
      });
    }
  });
});
