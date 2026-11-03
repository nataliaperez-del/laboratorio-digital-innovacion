import { describe, expect, it, vi } from 'vitest';
import { depositsFor } from '@/store/bancoAutomatico';
import type { AppState } from '@/store/useStore';

/** Estado mínimo con lo que mira el depósito automático. */
function state(overrides: Partial<AppState> = {}): AppState {
  return {
    prompt0Data: { labName: '', labNameKind: 'nombre', zonaUNAD: 'ZSUR', municipality: 'Pitalito', department: 'Huila', country: 'Colombia', isCapital: false, capitalSede: '', specificLocation: '' },
    containerData: '',
    contenedor2Sections: [],
    ideationSource: null,
    themeProposalMarkdown: '',
    vocationSections: [],
    selectedLabThemeIndex: null,
    treeRequest: null,
    innovationTreeMarkdown: '',
    treeGraph: null,
    savedStudies: [],
    savedIdeations: [],
    savedTrees: [],
    bankIds: { estudio: null, ideacion: null, arbol: null },
    addSavedStudy: vi.fn(),
    addSavedIdeation: vi.fn(),
    addSavedTree: vi.fn(),
    ...overrides,
  } as unknown as AppState;
}

const section = { number: 1, title: 'Identificación', status: 'ok' } as unknown as AppState['contenedor2Sections'][number];

describe('depósito automático en el Banco', () => {
  it('guarda un estudio terminado sin que nadie lo pida', () => {
    const prev = state();
    const next = state({ containerData: '# Estudio', contenedor2Sections: [section] });
    const { writes, bankIds } = depositsFor(next, prev);
    writes.forEach((w) => w());
    expect(next.addSavedStudy).toHaveBeenCalledWith(expect.objectContaining({ territoryName: 'Pitalito', containerData: '# Estudio' }));
    expect(bankIds?.estudio).toMatch(/^study-/);
  });

  it('al rehacer un bloque actualiza la misma entrada, no crea otra', () => {
    const saved = { id: 'study-1', createdAt: '2026-11-01T00:00:00.000Z', territoryName: 'Pitalito' } as AppState['savedStudies'][number];
    const prev = state({ containerData: '# v1', contenedor2Sections: [section], savedStudies: [saved], bankIds: { estudio: 'study-1', ideacion: null, arbol: null } });
    const next = state({ containerData: '# v2', contenedor2Sections: [{ ...section }], savedStudies: [saved], bankIds: { estudio: 'study-1', ideacion: null, arbol: null } });
    const { writes, bankIds } = depositsFor(next, prev);
    writes.forEach((w) => w());
    expect(next.addSavedStudy).toHaveBeenCalledWith(expect.objectContaining({ id: 'study-1', createdAt: saved.createdAt, containerData: '# v2' }));
    expect(bankIds).toBeNull();
  });

  it('otro territorio es otro ejercicio: nace una entrada nueva', () => {
    const saved = { id: 'study-1', createdAt: '2026-11-01T00:00:00.000Z', territoryName: 'Pitalito' } as AppState['savedStudies'][number];
    const prev = state({ savedStudies: [saved], bankIds: { estudio: 'study-1', ideacion: null, arbol: null } });
    const next = state({
      prompt0Data: { ...prev.prompt0Data, municipality: 'Garzón' },
      containerData: '# Garzón',
      contenedor2Sections: [section],
      savedStudies: [saved],
      bankIds: { estudio: 'study-1', ideacion: null, arbol: null },
    });
    const { bankIds } = depositsFor(next, prev);
    expect(bankIds?.estudio).not.toBe('study-1');
  });

  it('reconoce una entrada idéntica que ya estaba en el Banco en vez de duplicarla', () => {
    const saved = { id: 'study-manual', createdAt: '2026-10-30T00:00:00.000Z', territoryName: 'Pitalito', containerData: '# Estudio' } as AppState['savedStudies'][number];
    const next = state({ containerData: '# Estudio', contenedor2Sections: [section], savedStudies: [saved] });
    const { bankIds } = depositsFor(next, state({ savedStudies: [saved] }));
    expect(bankIds?.estudio).toBe('study-manual');
  });

  it('no deposita nada mientras no hay resultado', () => {
    const { writes, bankIds } = depositsFor(state({ themeProposalMarkdown: '' }), state());
    expect(writes).toHaveLength(0);
    expect(bankIds).toBeNull();
  });

  it('guarda el árbol con su tema', () => {
    const graph = { tema: 'Café especial', nodos: [] } as unknown as AppState['treeGraph'];
    const next = state({ treeGraph: graph, innovationTreeMarkdown: '# Árbol' });
    const { writes } = depositsFor(next, state());
    writes.forEach((w) => w());
    expect(next.addSavedTree).toHaveBeenCalledWith(expect.objectContaining({ theme: 'Café especial', markdown: '# Árbol' }));
  });
});
