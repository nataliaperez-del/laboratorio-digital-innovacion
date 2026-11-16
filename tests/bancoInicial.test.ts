import { describe, expect, it } from 'vitest';
import { ESTUDIOS_TERRITORIALES_INICIALES } from '@/lib/bancoInicial';
import { CONTENEDOR2_SECTIONS, reviewContenedor2Section } from '@/prompts/contenedor2Sections';

const ZONAS = ['Zona Amazonía Orinoquía (ZAO)', 'Zona Caribe (ZCAR)', 'Zona Centro Bogotá Cundinamarca (ZCBC)', 'Zona Centro Boyacá (ZCB)', 'Zona Centro Oriente (ZCOR)', 'Zona Centro Sur (ZCSUR)', 'Zona Occidente (ZOCC)', 'Zona Sur (ZSUR)'];

describe('banco inicial de estudios territoriales', () => {
  it('trae 24 estudios, tres por zona, con las zonas escritas como las del formulario', () => {
    expect(ESTUDIOS_TERRITORIALES_INICIALES).toHaveLength(24);
    for (const z of ZONAS) expect(ESTUDIOS_TERRITORIALES_INICIALES.filter((s) => s.zonaUNAD === z)).toHaveLength(3);
    expect(new Set(ESTUDIOS_TERRITORIALES_INICIALES.map((s) => s.id)).size).toBe(24);
  });

  it('cada estudio tiene los 12 bloques, todos aprobados por la revisión de la app y sin defectos de texto', () => {
    for (const s of ESTUDIOS_TERRITORIALES_INICIALES) {
      expect(s.sections.map((b) => b.number)).toEqual(CONTENEDOR2_SECTIONS.map((p) => p.number));
      for (const b of s.sections) {
        const point = CONTENEDOR2_SECTIONS.find((p) => p.number === b.number)!;
        expect(reviewContenedor2Section(point, b.markdown).status, `${s.territoryName} bloque ${b.number}`).toBe('ok');
      }
      expect(s.containerData, s.territoryName).not.toMatch(/\.\.(?!\.)|undefined|NaN|[ \t]{2,}\S/);
      const pib = [...(s.containerData.match(/Distribución sectorial del PIB:\*\* ([^\n]*)/)?.[1] ?? '').matchAll(/\((\d+)%\)/g)].reduce((n, m) => n + Number(m[1]), 0);
      expect(pib, `${s.territoryName}: el PIB suma 100`).toBe(100);
    }
  });

  it('sus cifras se presentan como aproximadas y se piden validar, con alertas propias de cada municipio', () => {
    for (const s of ESTUDIOS_TERRITORIALES_INICIALES) {
      expect(s.containerData).toMatch(/Dato de referencia \(aproximado\)/);
      expect(s.containerData).toMatch(/confírmalas en la fuente/);
      expect(s.containerData).toContain(s.territoryName);
      expect(s.containerData.match(/\*\*Alerta \d/g)).toHaveLength(3);
    }
    const alertas = ESTUDIOS_TERRITORIALES_INICIALES.map((s) => s.containerData.match(/\*\*Alerta 3[^\n]*/)![0]);
    expect(new Set(alertas).size).toBe(24);
  });
});

describe('los estudios del banco no cuentan como trabajo de la persona', () => {
  it('no dan insignias ni cuentan como guardados', async () => {
    const { evaluateGamification } = await import('@/lib/gamification');
    const vacio = evaluateGamification({ savedStudies: ESTUDIOS_TERRITORIALES_INICIALES });
    expect(vacio.unlockedBadgeIds).not.toContain('pionero_territorial');
    expect(vacio.unlockedBadgeIds).not.toContain('custodio_conocimiento');
    const propio = evaluateGamification({ savedStudies: [...ESTUDIOS_TERRITORIALES_INICIALES, { id: 'study-123' }] });
    expect(propio.unlockedBadgeIds).toContain('pionero_territorial');
  });

  it('se separan por su identificador', async () => {
    const { ownStudies, isBankStudy } = await import('@/lib/estudioDelBanco');
    expect(ESTUDIOS_TERRITORIALES_INICIALES.every(isBankStudy)).toBe(true);
    expect(ownStudies([...ESTUDIOS_TERRITORIALES_INICIALES, { id: 'study-123' }])).toEqual([{ id: 'study-123' }]);
  });
});
